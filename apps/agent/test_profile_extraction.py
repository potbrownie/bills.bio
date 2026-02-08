#!/usr/bin/env python3
"""
Test script for profile info extraction and saving.

Tests:
1. Profile extraction from user message
2. Profile data saving to database
3. Multi-signal profile matching (session_id, fingerprint, IP)
4. Profile upgrade (anonymous → identified)
"""

import asyncio
import json
import os
import sys
from pathlib import Path

# Add agent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from openai import AsyncOpenAI
from db.postgres import PostgresDB
from extractors.simple_profile_extractor import SimpleProfileExtractor, AsyncProfileUpdater
from db.profile_management import handle_user_identification


async def test_extraction():
    """Test 1: Profile extraction from messages"""
    print("\n" + "="*80)
    print("TEST 1: Profile Extraction")
    print("="*80)
    
    openai_client = AsyncOpenAI()
    extractor = SimpleProfileExtractor(openai_client)
    
    # Test cases
    test_messages = [
        {
            "message": "Hi! I'm Sarah Chen from San Francisco. I work as a product manager at Google.",
            "expected": ["identity", "location", "professional"]
        },
        {
            "message": "My name is John, I'm 32 years old, and I'm interested in AI and machine learning.",
            "expected": ["identity", "interests"]
        },
        {
            "message": "You can reach me at @sarahchen on Twitter or linkedin.com/in/sarah-chen",
            "expected": ["socials"]
        },
        {
            "message": "Just browsing your portfolio, looks great!",
            "expected": []  # Nothing to extract
        }
    ]
    
    for i, test in enumerate(test_messages, 1):
        print(f"\n--- Test Case {i} ---")
        print(f"Message: {test['message']}")
        
        extracted = await extractor.extract_from_message(test['message'])
        
        print(f"Extracted: {json.dumps(extracted, indent=2)}")
        
        # Check if expected fields are present
        for expected_field in test['expected']:
            if expected_field in extracted:
                print(f"✅ Found expected field: {expected_field}")
            else:
                print(f"❌ Missing expected field: {expected_field}")
        
        if not test['expected'] and not extracted:
            print("✅ Correctly extracted nothing")
    
    return True


async def test_database_save():
    """Test 2: Saving extracted data to database"""
    print("\n" + "="*80)
    print("TEST 2: Database Save")
    print("="*80)
    
    # Check if DATABASE_URL is set
    if not os.getenv("DATABASE_URL"):
        print("⚠️  DATABASE_URL not set - skipping database tests")
        print("   Set DATABASE_URL to test database functionality")
        return False
    
    db = PostgresDB()
    await db.connect()
    
    openai_client = AsyncOpenAI()
    updater = AsyncProfileUpdater(openai_client, db)
    
    try:
        # Create a test profile
        test_session_id = f"test-session-{asyncio.current_task().get_name()}"
        profile = await db.get_or_create_visitor_profile(
            session_id=test_session_id,
            ip="192.168.1.100",
            fingerprint="test-fingerprint-123"
        )
        profile_id = profile["id"]
        
        print(f"\n✅ Created test profile: {profile_id}")
        print(f"   Status: {profile['status']}")
        print(f"   Name: {profile['name']}")
        
        # Test extraction and save
        test_message = "Hi! I'm Alex Thompson from Seattle. I'm a software engineer at Microsoft and I'm interested in AI."
        
        print(f"\n--- Extracting from message ---")
        print(f"Message: {test_message}")
        
        # Use the background updater (fire-and-forget)
        updater.update_profile_in_background(profile_id, test_message)
        
        # Wait a bit for async extraction to complete
        print("\n⏳ Waiting for background extraction...")
        await asyncio.sleep(3)
        
        # Check if profile was updated
        updated_profile = await db.get_profile(profile_id)
        
        print(f"\n--- Profile after extraction ---")
        print(f"Name: {updated_profile['name']}")
        
        # Parse data if it's a string
        data = updated_profile['data']
        if isinstance(data, str):
            data = json.loads(data)
        
        print(f"Data: {json.dumps(data, indent=2)}")
        checks = [
            ("Name", updated_profile['name'] == "Alex Thompson"),
            ("Location", 'location' in data and 'Seattle' in str(data.get('location'))),
            ("Professional", 'professional' in data and 'Microsoft' in str(data.get('professional'))),
            ("Interests", 'interests' in data and 'AI' in str(data.get('interests'))),
        ]
        
        for check_name, passed in checks:
            if passed:
                print(f"✅ {check_name} extracted correctly")
            else:
                print(f"❌ {check_name} not found or incorrect")
        
        # Cleanup
        print(f"\n🧹 Cleaning up test profile...")
        async with db.pool.acquire() as conn:
            await conn.execute("DELETE FROM profiles WHERE id = $1", profile_id)
        
        return all(passed for _, passed in checks)
    
    finally:
        await db.close()


async def test_profile_matching():
    """Test 3: Multi-signal profile matching"""
    print("\n" + "="*80)
    print("TEST 3: Profile Matching")
    print("="*80)
    
    if not os.getenv("DATABASE_URL"):
        print("⚠️  DATABASE_URL not set - skipping test")
        return False
    
    db = PostgresDB()
    await db.connect()
    
    try:
        # Create profile with session_id and fingerprint
        session_id = f"test-match-{asyncio.current_task().get_name()}"
        fingerprint = "test-fp-456"
        ip = "192.168.1.200"
        
        print("\n--- Creating profile ---")
        profile1 = await db.get_or_create_visitor_profile(
            session_id=session_id,
            ip=ip,
            fingerprint=fingerprint
        )
        profile1_id = profile1["id"]
        print(f"✅ Created profile: {profile1_id}")
        
        # Test 1: Match by session_id
        print("\n--- Test: Match by session_id ---")
        profile2 = await db.get_or_create_visitor_profile(
            session_id=session_id,  # Same session
            ip="different-ip",
            fingerprint="different-fp"
        )
        if profile2["id"] == profile1_id:
            print("✅ Correctly matched by session_id")
        else:
            print(f"❌ Created new profile instead of matching (got {profile2['id']})")
        
        # Test 2: Match by fingerprint (new session)
        print("\n--- Test: Match by fingerprint ---")
        profile3 = await db.get_or_create_visitor_profile(
            session_id="new-session-123",  # Different session
            ip="different-ip",
            fingerprint=fingerprint  # Same fingerprint
        )
        if profile3["id"] == profile1_id:
            print("✅ Correctly matched by fingerprint")
        else:
            print(f"❌ Created new profile instead of matching (got {profile3['id']})")
        
        # Test 3: No match = new profile
        print("\n--- Test: No match creates new profile ---")
        profile4 = await db.get_or_create_visitor_profile(
            session_id="completely-new",
            ip="new-ip",
            fingerprint="new-fp"
        )
        if profile4["id"] != profile1_id:
            print(f"✅ Correctly created new profile: {profile4['id']}")
        else:
            print("❌ Should have created new profile but matched existing")
        
        # Cleanup
        print(f"\n🧹 Cleaning up test profiles...")
        async with db.pool.acquire() as conn:
            await conn.execute("DELETE FROM profiles WHERE id IN ($1, $2)", profile1_id, profile4["id"])
        
        return True
    
    finally:
        await db.close()


async def test_profile_upgrade():
    """Test 4: Profile upgrade (anonymous → identified)"""
    print("\n" + "="*80)
    print("TEST 4: Profile Upgrade")
    print("="*80)
    
    if not os.getenv("DATABASE_URL"):
        print("⚠️  DATABASE_URL not set - skipping test")
        return False
    
    db = PostgresDB()
    await db.connect()
    
    try:
        # Create anonymous profile
        session_id = f"test-upgrade-{asyncio.current_task().get_name()}"
        profile = await db.get_or_create_visitor_profile(
            session_id=session_id,
            ip="192.168.1.300",
            fingerprint="test-fp-789"
        )
        profile_id = profile["id"]
        
        print(f"\n--- Initial Profile ---")
        print(f"ID: {profile_id}")
        print(f"Status: {profile['status']} (should be 'anonymous')")
        print(f"Name: {profile['name']} (should be 'Anonymous')")
        
        if profile['status'] != 'anonymous':
            print("❌ Profile should start as anonymous")
            return False
        
        # Upgrade to identified
        print("\n--- Upgrading to identified ---")
        upgraded = await handle_user_identification(
            db,
            profile_id=profile_id,
            extracted_name="Jane Doe",
            extracted_email="jane@example.com"
        )
        
        print(f"\n--- Upgraded Profile ---")
        print(f"ID: {upgraded['id']}")
        print(f"Status: {upgraded['status']} (should be 'identified')")
        print(f"Name: {upgraded['name']} (should be 'Jane Doe')")
        print(f"Email: {upgraded.get('email')} (should be 'jane@example.com')")
        
        checks = [
            ("Status upgraded", upgraded['status'] == 'identified'),
            ("Name updated", upgraded['name'] == "Jane Doe"),
            ("Email updated", upgraded.get('email') == "jane@example.com"),
        ]
        
        for check_name, passed in checks:
            if passed:
                print(f"✅ {check_name}")
            else:
                print(f"❌ {check_name}")
        
        # Cleanup
        print(f"\n🧹 Cleaning up test profile...")
        async with db.pool.acquire() as conn:
            await conn.execute("DELETE FROM profiles WHERE id = $1", profile_id)
        
        return all(passed for _, passed in checks)
    
    finally:
        await db.close()


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("PROFILE EXTRACTION & SAVING TEST SUITE")
    print("="*80)
    
    # Check for required env vars
    if not os.getenv("OPENAI_API_KEY"):
        print("\n❌ ERROR: OPENAI_API_KEY not set")
        print("   Set OPENAI_API_KEY environment variable to run tests")
        sys.exit(1)
    
    print(f"\n✅ OPENAI_API_KEY found")
    
    if os.getenv("DATABASE_URL"):
        print(f"✅ DATABASE_URL found - will run database tests")
    else:
        print(f"⚠️  DATABASE_URL not set - will skip database tests")
    
    # Run tests
    results = {}
    
    try:
        results['extraction'] = await test_extraction()
        results['database'] = await test_database_save()
        results['matching'] = await test_profile_matching()
        results['upgrade'] = await test_profile_upgrade()
    except Exception as e:
        print(f"\n❌ Test suite failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else ("❌ FAIL" if result is not False else "⚠️  SKIPPED")
        print(f"{test_name.upper()}: {status}")
    
    print("\n" + "="*80)
    
    # Exit code
    if all(r in (True, False) for r in results.values()):
        print("\n✅ All tests completed successfully!\n")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed\n")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
