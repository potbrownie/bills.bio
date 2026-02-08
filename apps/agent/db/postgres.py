"""
PostgreSQL database functions for the agent
"""

import asyncpg
import json
from typing import Dict, List, Optional
import os


class PostgresDB:
    """PostgreSQL database client for agent"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv("DATABASE_URL")
        self.pool = None
    
    async def connect(self):
        """Create connection pool"""
        self.pool = await asyncpg.create_pool(self.database_url)
    
    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
    
    # =========================================================================
    # PROFILES
    # =========================================================================
    
    async def get_owner_profile(self) -> Dict:
        """Get Bill's profile (the owner)"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM profiles WHERE type = 'owner' LIMIT 1"
            )
            return dict(row) if row else None
    
    async def get_or_create_visitor_profile(
        self,
        session_id: str,
        ip: Optional[str] = None,
        fingerprint: Optional[str] = None
    ) -> Dict:
        """
        Get existing visitor profile or create anonymous one.
        
        Best practice approach:
        1. Check session_id first (most reliable)
        2. If not found, check fingerprint (very reliable)
        3. If not found, check IP (less reliable, recent only)
        4. If still not found, create NEW anonymous profile
        5. Link session to profile
        
        This prevents duplicates while allowing anonymous users.
        """
        async with self.pool.acquire() as conn:
            profile_id = None
            
            # 1. Try session_id (most reliable)
            row = await conn.fetchrow("""
                SELECT p.* FROM profiles p
                JOIN sessions s ON s.profile_id = p.id
                WHERE s.session_id = $1 AND p.type = 'visitor'
                ORDER BY s.last_seen DESC
                LIMIT 1
            """, session_id)
            
            if row:
                # Update last_seen
                await conn.execute(
                    "UPDATE profiles SET last_seen = NOW() WHERE id = $1",
                    row['id']
                )
                return dict(row)
            
            # 2. Try fingerprint (very reliable)
            if fingerprint:
                row = await conn.fetchrow("""
                    SELECT p.* FROM profiles p
                    JOIN sessions s ON s.profile_id = p.id
                    WHERE s.data->>'fingerprint' = $1 AND p.type = 'visitor'
                    ORDER BY s.last_seen DESC
                    LIMIT 1
                """, fingerprint)
                
                if row:
                    profile_id = row['id']
            
            # 3. Try IP (least reliable - only recent activity)
            if not profile_id and ip:
                row = await conn.fetchrow("""
                    SELECT p.* FROM profiles p
                    JOIN sessions s ON s.profile_id = p.id
                    WHERE s.data->>'ip' = $1 
                      AND p.type = 'visitor'
                      AND p.status = 'anonymous'
                      AND s.last_seen > NOW() - INTERVAL '24 hours'
                    ORDER BY s.last_seen DESC
                    LIMIT 1
                """, ip)
                
                if row:
                    profile_id = row['id']
            
            # 4. Create new anonymous visitor if no match
            if not profile_id:
                row = await conn.fetchrow("""
                    INSERT INTO profiles (type, status, name, data)
                    VALUES ('visitor', 'anonymous', 'Anonymous', '{}')
                    RETURNING *
                """)
                profile_id = row['id']
            else:
                # Get the matched profile
                row = await conn.fetchrow(
                    "SELECT * FROM profiles WHERE id = $1",
                    profile_id
                )
            
            # 5. Link session to profile (creates or updates session record)
            await self.link_session_to_profile(
                session_id=session_id,
                profile_id=profile_id,
                ip=ip or "",
                fingerprint=fingerprint,
                user_agent=None
            )
            
            return dict(row)
    
    async def update_profile_data(
        self,
        profile_id: str,
        updates: Dict
    ) -> None:
        """Update profile data (deep merge with existing)"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE profiles
                SET data = data || $2::jsonb,
                    updated_at = NOW()
                WHERE id = $1
            """, profile_id, json.dumps(updates))
            
            # Update name if identity.name was provided
            if "identity" in updates and "name" in updates["identity"]:
                await conn.execute("""
                    UPDATE profiles
                    SET name = $2
                    WHERE id = $1
                """, profile_id, updates["identity"]["name"])
    
    async def get_profile(self, profile_id: str) -> Optional[Dict]:
        """Get profile by ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM profiles WHERE id = $1",
                profile_id
            )
            return dict(row) if row else None
    
    # =========================================================================
    # FACTS
    # =========================================================================
    
    async def store_fact(
        self,
        profile_id: str,
        content: str,
        data: Dict
    ) -> str:
        """Store a new fact"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO facts (profile_id, content, data)
                VALUES ($1, $2, $3)
                RETURNING id
            """, profile_id, content, json.dumps(data))
            
            return row["id"]
    
    async def search_facts(
        self,
        query: str,
        profile_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Full-text search on facts"""
        async with self.pool.acquire() as conn:
            if profile_id:
                rows = await conn.fetch("""
                    SELECT id, profile_id, content, data, created_at
                    FROM facts
                    WHERE tsv @@ to_tsquery('english', $1)
                      AND profile_id = $2
                    ORDER BY created_at DESC
                    LIMIT $3
                """, query, profile_id, limit)
            else:
                rows = await conn.fetch("""
                    SELECT id, profile_id, content, data, created_at
                    FROM facts
                    WHERE tsv @@ to_tsquery('english', $1)
                    ORDER BY created_at DESC
                    LIMIT $2
                """, query, limit)
            
            return [dict(row) for row in rows]
    
    async def get_profile_facts(
        self,
        profile_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Get all facts for a profile"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, content, data, created_at
                FROM facts
                WHERE profile_id = $1
                ORDER BY created_at DESC
                LIMIT $2
            """, profile_id, limit)
            
            return [dict(row) for row in rows]
    
    # =========================================================================
    # CONVERSATIONS & MESSAGES
    # =========================================================================
    
    async def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        """Get conversation with all messages"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT 
                  c.id, c.title, c.profile_id,
                  EXTRACT(EPOCH FROM c.created_at) * 1000 as created_at,
                  EXTRACT(EPOCH FROM c.updated_at) * 1000 as updated_at,
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'role', m.role,
                        'content', m.content,
                        'timestamp', EXTRACT(EPOCH FROM m.created_at) * 1000,
                        'sources', COALESCE(m.data->'sources', '[]'::jsonb)
                      ) ORDER BY m.created_at ASC
                    ) FILTER (WHERE m.id IS NOT NULL),
                    '[]'::json
                  ) as messages
                FROM conversations c
                LEFT JOIN messages m ON m.conversation_id = c.id
                WHERE c.id = $1
                GROUP BY c.id
            """, conversation_id)
            
            if not row:
                return None
            
            result = dict(row)
            result["messages"] = json.loads(result["messages"])
            return result
    
    async def link_conversation_to_profile(
        self,
        conversation_id: str,
        profile_id: str
    ) -> None:
        """Link a conversation to a visitor profile"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE conversations
                SET profile_id = $2
                WHERE id = $1
            """, conversation_id, profile_id)
    
    async def link_session_to_profile(
        self,
        session_id: str,
        profile_id: str,
        ip: str,
        fingerprint: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> None:
        """Create or update session linked to profile with IP tracking"""
        session_data = {
            "ip": ip,
            "fingerprint": fingerprint,
            "user_agent": user_agent,
            "location": {},
            "device": {},
            "page_views": [],
            "interactions": []
        }
        
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO sessions (
                    session_id, profile_id, data, created_at, last_seen
                )
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT (session_id) DO UPDATE SET
                    profile_id = EXCLUDED.profile_id,
                    data = EXCLUDED.data,
                    last_seen = NOW()
            """, session_id, profile_id, json.dumps(session_data))
    
    # =========================================================================
    # IP TRACKING
    # =========================================================================
    
    async def get_profiles_by_ip(
        self,
        ip: str,
        time_window_hours: int = 24
    ) -> list[Dict]:
        """Get profiles that used this IP recently"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT DISTINCT
                    p.*,
                    s.last_seen as last_ip_use
                FROM profiles p
                JOIN sessions s ON s.profile_id = p.id
                WHERE s.data->>'ip' = $1
                  AND s.last_seen > NOW() - make_interval(hours => $2)
                ORDER BY s.last_seen DESC
            """, ip, time_window_hours)
            
            return [dict(row) for row in rows]
    
    async def get_profile_ips(
        self,
        profile_id: str,
        limit: int = 10
    ) -> list[Dict]:
        """Get IP addresses used by this profile"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT DISTINCT ON (s.data->>'ip')
                    s.data->>'ip' as ip,
                    s.data->'location' as location,
                    s.created_at as first_seen,
                    s.last_seen
                FROM sessions s
                WHERE s.profile_id = $1
                  AND s.data->>'ip' IS NOT NULL
                ORDER BY s.data->>'ip', s.last_seen DESC
                LIMIT $2
            """, profile_id, limit)
            
            return [dict(row) for row in rows]
