"""Query Bill's profile data (bio, interests, projects, blog metadata)."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


def _data_dir() -> Path:
    """Return agent data directory (parent of tools/)."""
    return Path(__file__).resolve().parent.parent / "data"


def _load_from_postgres() -> dict:
    """Load profile from PostgreSQL database."""
    try:
        import psycopg2
        database_url = os.environ.get("DATABASE_URL", "").strip()
        if not database_url:
            raise ValueError("DATABASE_URL not set")
        
        conn = psycopg2.connect(database_url)
        try:
            cur = conn.cursor()
            # Get owner profile
            cur.execute("SELECT name, data FROM profiles WHERE type = 'owner' LIMIT 1")
            row = cur.fetchone()
            if not row:
                return {"profile": {}, "projects": [], "blogPosts": []}
            
            name, data = row
            # Extract from JSONB data field
            bio = data.get("bio", "")
            location_obj = data.get("location", {})
            location = f"{location_obj.get('city', '')}, {location_obj.get('country', '')}" if location_obj else ""
            
            # Extract interests from multiple sources
            interests = []
            
            # Technical/knowledge interests
            knowledge = data.get("knowledge", {})
            if knowledge:
                topics = knowledge.get("topics", [])
                interests.extend([t.get("name", "") for t in topics if t.get("name")])
            
            # Personal hobbies/interests
            interests_data = data.get("interests", {})
            if interests_data:
                personal = interests_data.get("personal", [])
                interests.extend([p.get("name", "") for p in personal if isinstance(p, dict) and p.get("name")])
            
            # Extract projects, experience, ideas, writing, socials from data
            projects = data.get("projects", [])
            experience = data.get("experience", [])
            ideas = data.get("ideas_thinking_about", [])
            writing = data.get("writing", [])
            personal_interests = interests_data.get("personal", [])
            socials = data.get("socials", {})
            
            profile = {
                "name": name,
                "bio": bio,
                "location": location,
                "interests": interests,
                "personal_interests": personal_interests,  # Full details
                "socials": socials,  # Social media handles
                "experience": experience,
                "ideas": ideas
            }
            
            return {
                "profile": profile,
                "projects": projects,
                "blogPosts": writing  # Blog posts/writing
            }
        finally:
            conn.close()
    except ImportError:
        logger.warning("psycopg2 not installed; install with: pip install psycopg2-binary")
        return _load_from_json()
    except Exception as e:
        logger.warning(f"Failed to load from PostgreSQL: {e}, falling back to JSON")
        return _load_from_json()


def _load_from_json() -> dict:
    """Load profile from JSON file (fallback)."""
    json_path = _data_dir() / "profile.json"
    if not json_path.exists():
        return {"profile": {}, "projects": [], "blogPosts": []}
    with open(json_path, encoding="utf-8") as f:
        return json.load(f)


def _load_profile_data() -> dict:
    """Load profile from PostgreSQL if DATABASE_URL is set, else from JSON."""
    database_url = os.environ.get("DATABASE_URL", "").strip()
    if database_url:
        return _load_from_postgres()
    return _load_from_json()


def query_profile(query: str, scope: str = "all") -> str:
    """Return profile data relevant to the given query and scope.

    Args:
        query: Natural language or keyword query (e.g. "Bill's interests",
            "blog posts about design").
        scope: One of "bio", "interests", "projects", "blog", "all".
            Filters which section to return.

    Returns:
        A text summary of the matching profile data for the LLM to cite.
    """
    ttl = int(os.environ.get("PROFILE_CACHE_TTL_SECONDS", "0") or "0")
    cache = None
    key = f"profile:{query}:{scope}"
    if ttl > 0:
        from agent.cache import get_profile_cache
        cache = get_profile_cache()
        cached = cache.get(key, float(ttl))
        if cached is not None:
            return cached
    data = _load_profile_data()
    query_lower = query.lower()
    parts: list[str] = []

    def _store_and_return(result: str) -> str:
        if ttl > 0 and cache is not None:
            cache.set(key, result, float(ttl))
        return result

    if scope in ("all", "bio"):
        profile = data.get("profile", {})
        if profile:
            parts.append(
                f"Name: {profile.get('name', 'Bill')}. "
                f"Bio: {profile.get('bio', '')}"
            )
        if scope == "bio":
            return _store_and_return("\n".join(parts) if parts else "No profile bio found.")

    if scope in ("all", "interests"):
        profile = data.get("profile", {})
        interests = profile.get("interests", [])
        if interests:
            parts.append("Interests: " + ", ".join(interests))
        
        # Always include detailed personal interests so AI has full context
        personal = profile.get("personal_interests", [])
        if personal:
            parts.append("\nPersonal Interests (specific favorites):")
            for item in personal:
                if isinstance(item, dict):
                    name = item.get("name", "")
                    favorite = item.get("favorite", "")
                    if name and favorite:
                        parts.append(f"- {name}: {favorite}")
        
        # Add socials when asked about connecting/social media/follow
        query_keywords_social = ["social", "twitter", "linkedin", "github", "instagram", "follow", "connect", "reach"]
        if any(keyword in query_lower for keyword in query_keywords_social):
            socials = profile.get("socials", {})
            if socials:
                social_list = []
                if socials.get("twitter"):
                    social_list.append(f"Twitter: {socials['twitter']}")
                if socials.get("linkedin"):
                    social_list.append(f"LinkedIn: {socials['linkedin']}")
                if socials.get("github"):
                    social_list.append(f"GitHub: {socials['github']}")
                if socials.get("instagram"):
                    social_list.append(f"Instagram: {socials['instagram']}")
                if social_list:
                    parts.append("\nSocial Media:\n" + "\n".join(f"- {s}" for s in social_list))
        
        if scope == "interests":
            return _store_and_return("\n".join(parts) if parts else "No interests listed.")

    if scope in ("all", "projects"):
        projects = data.get("projects", [])
        if projects:
            proj_lines = []
            for p in projects:
                proj_lines.append(
                    f"- {p.get('name', '')} ({p.get('year', '')}, {p.get('status', '')}): "
                    f"{p.get('description', '')}"
                )
            parts.append("Projects / Ventures:\n" + "\n".join(proj_lines))
        if scope == "projects":
            return _store_and_return("\n".join(parts) if parts else "No projects listed.")

    if scope in ("all", "blog"):
        posts = data.get("blogPosts", [])
        if posts:
            post_lines = []
            for p in posts:
                post_lines.append(
                    f"- {p.get('title', '')} ({p.get('date', '')}, {p.get('category', '')}, "
                    f"{p.get('readTime', '')}): {p.get('excerpt', '')}"
                )
            parts.append("Blog posts:\n" + "\n".join(post_lines))
        if scope == "blog":
            return _store_and_return("\n".join(parts) if parts else "No blog posts found.")

    return _store_and_return("\n\n".join(parts) if parts else "No matching profile data found.")
