"""
Profile Management - Upgrading and Merging
Best practices for anonymous → identified → registered flow
"""

from typing import Dict, Optional, List
import json


class ProfileManager:
    """Manages profile lifecycle and deduplication"""
    
    def __init__(self, db):
        self.db = db
    
    async def upgrade_to_identified(
        self,
        profile_id: str,
        name: str,
        email: Optional[str] = None
    ) -> Dict:
        """
        Upgrade anonymous profile to identified when user shares info.
        
        Status flow: anonymous → identified
        
        Args:
            profile_id: Profile UUID
            name: User's name (extracted from conversation)
            email: Optional email
            
        Returns:
            Updated profile
        """
        
        async with self.db.pool.acquire() as conn:
            # Check if email exists (potential duplicate)
            if email:
                existing = await conn.fetchrow("""
                    SELECT id FROM profiles 
                    WHERE email = $1 AND id != $2
                """, email, profile_id)
                
                if existing:
                    # Merge with existing profile
                    return await self.merge_profiles(
                        keep_profile_id=existing['id'],
                        merge_profile_id=profile_id
                    )
            
            # Upgrade profile
            row = await conn.fetchrow("""
                UPDATE profiles
                SET status = 'identified',
                    name = $2,
                    email = $3,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            """, profile_id, name, email)
            
            return dict(row)
    
    async def find_duplicate_profiles(
        self,
        profile_id: str,
        name: Optional[str] = None,
        email: Optional[str] = None,
        fingerprints: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Find potential duplicate profiles.
        
        Checks:
        - Same email
        - Same name + same fingerprint
        - Same name + overlapping IPs
        
        Returns:
            List of potential duplicates
        """
        
        duplicates = []
        
        async with self.db.pool.acquire() as conn:
            # 1. Check email (strongest signal)
            if email:
                rows = await conn.fetch("""
                    SELECT * FROM profiles
                    WHERE email = $1 AND id != $2
                """, email, profile_id)
                duplicates.extend([dict(row) for row in rows])
            
            # 2. Check name + fingerprint
            if name and fingerprints:
                for fp in fingerprints:
                    rows = await conn.fetch("""
                        SELECT DISTINCT p.* FROM profiles p
                        JOIN sessions s ON s.profile_id = p.id
                        WHERE p.name = $1
                          AND p.id != $2
                          AND s.data->>'fingerprint' = $3
                    """, name, profile_id, fp)
                    duplicates.extend([dict(row) for row in rows])
            
            # Remove duplicates from list
            seen = set()
            unique = []
            for dup in duplicates:
                if dup['id'] not in seen:
                    seen.add(dup['id'])
                    unique.append(dup)
            
            return unique
    
    async def merge_profiles(
        self,
        keep_profile_id: str,
        merge_profile_id: str
    ) -> Dict:
        """
        Merge two profiles (when duplicate detected).
        
        - Moves sessions, conversations to keep_profile
        - Merges data (keep_profile wins, merge_profile fills gaps)
        - Deletes merge_profile
        
        Args:
            keep_profile_id: Profile to keep
            merge_profile_id: Profile to merge and delete
            
        Returns:
            Updated keep_profile
        """
        
        async with self.db.pool.acquire() as conn:
            # Use PostgreSQL function
            await conn.execute("""
                SELECT merge_profiles($1, $2)
            """, keep_profile_id, merge_profile_id)
            
            # Return updated profile
            row = await conn.fetchrow("""
                SELECT * FROM profiles WHERE id = $1
            """, keep_profile_id)
            
            return dict(row)
    
    async def suggest_profile_merge(
        self,
        profile_id: str
    ) -> Optional[Dict]:
        """
        Suggest if this profile should be merged with another.
        
        Use case: User says "I'm John" but there's already a "John" 
        profile with same fingerprint from previous session.
        
        Returns:
            Suggested profile to merge with, or None
        """
        
        profile = await self.db.get_profile(profile_id)
        if not profile:
            return None
        
        # Get current profile's fingerprints
        async with self.db.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT DISTINCT data->>'fingerprint' as fingerprint
                FROM sessions
                WHERE profile_id = $1
                  AND data->>'fingerprint' IS NOT NULL
            """, profile_id)
            
            fingerprints = [row['fingerprint'] for row in rows]
        
        # Find duplicates
        duplicates = await self.find_duplicate_profiles(
            profile_id,
            name=profile.get('name'),
            email=profile.get('email'),
            fingerprints=fingerprints
        )
        
        if not duplicates:
            return None
        
        # Return most recently active duplicate
        duplicates.sort(key=lambda x: x['last_seen'], reverse=True)
        return duplicates[0]


# Convenience functions for common operations

async def handle_user_identification(
    db,
    profile_id: str,
    extracted_name: str,
    extracted_email: Optional[str] = None
) -> Dict:
    """
    Handle when user identifies themselves in conversation.
    
    Example:
        User: "Hi, I'm Sarah from NYC, sarah@gmail.com"
        → Extract name and email
        → Upgrade profile
        → Check for duplicates
        → Merge if needed
    
    Returns:
        Final profile (possibly merged)
    """
    
    manager = ProfileManager(db)
    
    # Upgrade to identified
    profile = await manager.upgrade_to_identified(
        profile_id,
        extracted_name,
        extracted_email
    )
    
    # Check if merge happened (email match)
    # If upgrade_to_identified found email match, it already merged
    
    return profile


async def check_and_merge_duplicates(
    db,
    profile_id: str
) -> Optional[str]:
    """
    Check for duplicates and merge if found.
    
    Returns:
        New profile_id if merged, None if no merge needed
    """
    
    manager = ProfileManager(db)
    
    # Find suggestion
    suggested = await manager.suggest_profile_merge(profile_id)
    
    if not suggested:
        return None
    
    # Get current profile for comparison
    profile = await db.get_profile(profile_id)
    if not profile:
        return None
    
    # Merge (keep the older profile, merge newer one)
    if suggested['created_at'] < profile['created_at']:
        keep_id = suggested['id']
        merge_id = profile_id
    else:
        keep_id = profile_id
        merge_id = suggested['id']
    
    await manager.merge_profiles(keep_id, merge_id)
    
    return keep_id if keep_id != profile_id else None
