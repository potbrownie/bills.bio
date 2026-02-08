"""
Simple Profile Extractor
Extracts ONLY structured profile fields (name, location, company, etc.)
Does NOT extract memories - mem0 handles that
"""

from typing import Dict
import json
import asyncio
from openai import AsyncOpenAI


class SimpleProfileExtractor:
    """Extract ONLY structured profile fields from user messages"""
    
    PROFILE_EXTRACTION_PROMPT = """Extract ONLY these structured fields from the user's message:

User message: {message}

Extract if explicitly mentioned:

IDENTITY:
- Name (first name, full name, preferred name)

LOCATION:
- City
- Country
- State/region
- Timezone (if mentioned)

PROFESSIONAL:
- Job title/role
- Company/organization
- Industry/field
- Website/portfolio URL
- Years of experience
- Education (degree, school, major, year)

SOCIALS & CONTACT:
- Twitter/X handle
- LinkedIn profile
- GitHub username
- Instagram handle
- Telegram username
- Discord handle
- Email address
- Phone number
- Personal website

INTERESTS & EXPERTISE:
- Topics they're interested in
- Skills/technologies they work with
- Areas of expertise
- Hobbies/passions
- Projects they're working on
- Problems they're trying to solve

CONTEXT:
- Why they're visiting
- What they're looking for
- How they found this site
- What they want to discuss
- Goals/objectives
- Current challenges

PERSONAL:
- Languages spoken
- Availability/timezone preferences
- Preferred communication methods

Return ONLY valid JSON with this structure:
{{
  "identity": {{
    "name": "..."
  }},
  "bio": "...",
  "location": {{
    "city": "...",
    "country": "...",
    "state": "...",
    "timezone": "..."
  }},
  "professional": {{
    "title": "...",
    "company": "...",
    "industry": [...],
    "website": "...",
    "experience_years": null,
    "education": {{
      "degree": "...",
      "school": "...",
      "major": "...",
      "year": null
    }}
  }},
  "socials": {{
    "twitter": "...",
    "linkedin": "...",
    "github": "...",
    "instagram": "...",
    "telegram": "...",
    "discord": "...",
    "email": "...",
    "phone": "...",
    "website": "..."
  }},
  "interests": {{
    "topics": [...],
    "skills": [...],
    "expertise": [...],
    "hobbies": [...],
    "projects": [...],
    "problems": [...]
  }},
  "context": {{
    "why_visiting": "...",
    "looking_for": "...",
    "referral_source": "...",
    "discussion_topics": [...],
    "goals": [...],
    "challenges": [...]
  }},
  "personal": {{
    "languages": [...],
    "timezone_preference": "...",
    "contact_preference": "..."
  }}
}}

IMPORTANT: 
- ONLY include fields that were EXPLICITLY stated
- Use null for unmentioned numeric fields
- Omit fields/sections entirely if not mentioned
- Don't infer or assume anything
- Return empty object {{}} if nothing to extract
- For arrays, only include if items were mentioned"""

    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
    
    async def extract_from_message(self, user_message: str) -> Dict:
        """
        Extract structured profile fields from a single user message.
        
        Args:
            user_message: User's message text
            
        Returns:
            Dict with profile field updates (empty if nothing found)
        """
        
        if not user_message or not user_message.strip():
            return {}
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",  # Fast and cheap
                messages=[{
                    "role": "user",
                    "content": self.PROFILE_EXTRACTION_PROMPT.format(
                        message=user_message
                    )
                }],
                temperature=0.1,  # Low temp for consistent extraction
                response_format={"type": "json_object"}
            )
            
            extracted = json.loads(response.choices[0].message.content)
            
            # Clean up - remove null/empty values
            return self._clean_data(extracted)
        
        except Exception as e:
            print(f"Profile extraction error: {e}")
            return {}
    
    def _clean_data(self, data: Dict) -> Dict:
        """Remove null, empty strings, empty arrays, empty objects"""
        
        if not isinstance(data, dict):
            return {}
        
        cleaned = {}
        
        for key, value in data.items():
            if isinstance(value, dict):
                # Recursively clean nested dicts
                nested = self._clean_data(value)
                if nested:  # Only add if has content
                    cleaned[key] = nested
            
            elif isinstance(value, list):
                # Keep non-empty lists
                if value:
                    cleaned[key] = value
            
            elif value not in (None, "", [], {}):
                # Keep non-empty values
                cleaned[key] = value
        
        return cleaned


class AsyncProfileUpdater:
    """
    Async wrapper for profile updates
    Ensures profile updates don't block the response
    """
    
    def __init__(self, openai_client: AsyncOpenAI, db):
        self.extractor = SimpleProfileExtractor(openai_client)
        self.db = db
        self._tasks = set()  # Track tasks to prevent GC
    
    def update_profile_in_background(
        self,
        profile_id: str,
        user_message: str
    ) -> None:
        """
        Fire-and-forget profile update.
        Returns immediately, extraction happens in background.
        
        Args:
            profile_id: Profile UUID to update
            user_message: User's message to extract from
        """
        
        task = asyncio.create_task(
            self._extract_and_update(profile_id, user_message)
        )
        
        # Keep reference to prevent GC
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
    
    async def _extract_and_update(
        self,
        profile_id: str,
        user_message: str
    ) -> None:
        """Internal method that does the actual work"""
        
        try:
            # Extract structured fields
            updates = await self.extractor.extract_from_message(user_message)
            
            if not updates:
                return  # Nothing to update
            
            # Update profile (merge with existing data)
            # update_profile_data already handles name update
            await self.db.update_profile_data(profile_id, updates)
            
            print(f"✓ Profile updated: {profile_id} - {list(updates.keys())}")
        
        except Exception as e:
            # Log but don't crash - profile updates shouldn't break chat
            print(f"✗ Profile update failed for {profile_id}: {e}")


# Convenience function for simple usage
async def extract_and_update_profile(
    openai_client: AsyncOpenAI,
    db,
    profile_id: str,
    user_message: str
) -> None:
    """
    Simple function to extract and update profile.
    Can be called with asyncio.create_task() for fire-and-forget.
    
    Example:
        asyncio.create_task(
            extract_and_update_profile(
                openai_client, db, profile_id, user_message
            )
        )
    """
    
    extractor = SimpleProfileExtractor(openai_client)
    
    try:
        updates = await extractor.extract_from_message(user_message)
        
        if updates:
            # update_profile_data already handles name update
            await db.update_profile_data(profile_id, updates)
    
    except Exception as e:
        print(f"✗ Profile update failed: {e}")
