#!/usr/bin/env python3
"""
Test profile extraction with live agent API.
"""

import asyncio
import json
import requests
import uuid
from db.postgres import PostgresDB


async def test_live_extraction():
    """Send a message to the live agent and check if profile is extracted"""
    
    print("\n" + "="*80)
    print("LIVE PROFILE EXTRACTION TEST")
    print("="*80)
    
    # Generate unique identifiers
    session_id = f"test-live-{uuid.uuid4()}"
    fingerprint = f"test-fp-{uuid.uuid4()}"
    
    print(f"\nTest session: {session_id}")
    print(f"Test fingerprint: {fingerprint}")
    
    # Prepare the request
    url = "http://localhost:8000/chat"
    payload = {
        "messages": [
            {
                "role": "user",
                "content": "Hi! I'm Emma Wilson from Austin, Texas. I'm a UX designer at Apple and I'm really interested in minimalist design and artificial intelligence."
            }
        ],
        "context": "public",
        "session_id": session_id,
        "ip": "192.168.1.50",
        "fingerprint": fingerprint
    }
    
    print("\n--- Sending message to agent ---")
    print(f"Message: {payload['messages'][0]['content']}")
    
    # Send request
    response = requests.post(url, json=payload)
    
    if response.status_code != 200:
        print(f"❌ Request failed: {response.status_code}")
        print(response.text)
        return
    
    result = response.json()
    print(f"\n✅ Agent responded:")
    print(f"Response: {result['message'][:200]}...")
    
    # Wait for background extraction to complete
    print("\n⏳ Waiting 3 seconds for background extraction...")
    await asyncio.sleep(3)
    
    # Check database
    print("\n--- Checking database ---")
    db = PostgresDB()
    await db.connect()
    
    try:
        # Get the profile
        async with db.pool.acquire() as conn:
            profile = await conn.fetchrow("""
                SELECT p.*, s.data as session_data
                FROM profiles p
                JOIN sessions s ON s.profile_id = p.id
                WHERE s.session_id = $1
                LIMIT 1
            """, session_id)
        
        if not profile:
            print("❌ Profile not found")
            return
        
        profile_id = profile['id']
        print(f"\n✅ Found profile: {profile_id}")
        print(f"   Status: {profile['status']}")
        print(f"   Name: {profile['name']}")
        
        # Parse the data
        data = profile['data']
        if isinstance(data, str):
            data = json.loads(data)
        
        print(f"\n--- Extracted Data ---")
        print(json.dumps(data, indent=2))
        
        # Verify expected fields
        checks = [
            ("Name", profile['name'] == "Emma Wilson"),
            ("Identity", 'identity' in data and data['identity'].get('name') == "Emma Wilson"),
            ("Location", 'location' in data and ('Austin' in str(data.get('location')) or 'Texas' in str(data.get('location')))),
            ("Professional", 'professional' in data and 'Apple' in str(data.get('professional'))),
            ("Interests", 'interests' in data and len(data.get('interests', [])) > 0),
        ]
        
        print(f"\n--- Verification ---")
        for check_name, passed in checks:
            status = "✅" if passed else "❌"
            print(f"{status} {check_name}")
        
        # Cleanup
        print(f"\n🧹 Cleaning up test profile...")
        async with db.pool.acquire() as cleanup_conn:
            await cleanup_conn.execute("DELETE FROM profiles WHERE id = $1", profile_id)
        
        # Summary
        all_passed = all(passed for _, passed in checks)
        print("\n" + "="*80)
        if all_passed:
            print("✅ LIVE EXTRACTION TEST PASSED!")
        else:
            print("⚠️  LIVE EXTRACTION TEST: Some checks failed")
        print("="*80 + "\n")
        
    finally:
        await db.close()


if __name__ == "__main__":
    asyncio.run(test_live_extraction())
