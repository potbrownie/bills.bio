#!/usr/bin/env python3
"""Test script for the send_email tool.

This script tests the email delivery functionality to ensure AWS SES
is properly configured.

Usage:
    python scripts/test_email.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path to import tools
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from tools.send_email import send_email


def test_basic_email():
    """Test basic email sending without sender info."""
    print("=" * 60)
    print("Test 1: Basic email (no sender info)")
    print("=" * 60)
    
    result = send_email(
        subject="Test Email from bills.bio Agent",
        message="This is a test email to verify AWS SES configuration is working correctly."
    )
    
    print(f"Result: {result}")
    print()
    
    if "successfully" in result.lower():
        print("✅ Test 1 PASSED")
    else:
        print("❌ Test 1 FAILED")
    
    return "successfully" in result.lower()


def test_email_with_sender():
    """Test email with sender information."""
    print("=" * 60)
    print("Test 2: Email with sender info")
    print("=" * 60)
    
    result = send_email(
        subject="Test: Email with Sender Info",
        message="This test includes sender name and email to verify reply-to functionality.",
        sender_name="Test User",
        sender_email="test@example.com"
    )
    
    print(f"Result: {result}")
    print()
    
    if "successfully" in result.lower():
        print("✅ Test 2 PASSED")
    else:
        print("❌ Test 2 FAILED")
    
    return "successfully" in result.lower()


def test_email_validation():
    """Test input validation."""
    print("=" * 60)
    print("Test 3: Input validation")
    print("=" * 60)
    
    # Test empty subject
    result1 = send_email(subject="", message="Test message")
    print(f"Empty subject: {result1}")
    
    # Test empty message
    result2 = send_email(subject="Test", message="")
    print(f"Empty message: {result2}")
    
    print()
    
    passed = (
        "Error" in result1 and "subject" in result1.lower() and
        "Error" in result2 and "message" in result2.lower()
    )
    
    if passed:
        print("✅ Test 3 PASSED")
    else:
        print("❌ Test 3 FAILED")
    
    return passed


def test_missing_config():
    """Test behavior when configuration is missing."""
    print("=" * 60)
    print("Test 4: Missing configuration check")
    print("=" * 60)
    
    owner_email = os.environ.get("OWNER_EMAIL")
    
    if not owner_email:
        print("⚠️  OWNER_EMAIL not configured")
        result = send_email(
            subject="Test",
            message="This should fail gracefully"
        )
        print(f"Result: {result}")
        
        if "not configured" in result.lower():
            print("✅ Test 4 PASSED (graceful failure)")
            return True
        else:
            print("❌ Test 4 FAILED (should show config error)")
            return False
    else:
        print(f"✓ OWNER_EMAIL configured: {owner_email}")
        
    ses_from = os.environ.get("SES_FROM_EMAIL")
    if ses_from:
        print(f"✓ SES_FROM_EMAIL configured: {ses_from}")
    else:
        print(f"⚠️  SES_FROM_EMAIL not set (will use OWNER_EMAIL)")
    
    print("✅ Test 4 PASSED (configuration present)")
    return True


def check_environment():
    """Check environment configuration."""
    print("=" * 60)
    print("Environment Check")
    print("=" * 60)
    
    required = {
        "OWNER_EMAIL": os.environ.get("OWNER_EMAIL"),
        "SES_FROM_EMAIL": os.environ.get("SES_FROM_EMAIL"),
        "AWS_REGION": os.environ.get("AWS_REGION", "us-east-1"),
    }
    
    optional = {
        "AWS_ACCESS_KEY_ID": os.environ.get("AWS_ACCESS_KEY_ID"),
        "AWS_SECRET_ACCESS_KEY": os.environ.get("AWS_SECRET_ACCESS_KEY"),
    }
    
    print("\nRequired Variables:")
    all_present = True
    for key, value in required.items():
        if value:
            # Mask sensitive values
            if "key" in key.lower() or "secret" in key.lower():
                display = f"{value[:4]}...{value[-4:]}" if len(value) > 8 else "***"
            else:
                display = value
            print(f"  ✓ {key}: {display}")
        else:
            print(f"  ✗ {key}: NOT SET")
            if key == "OWNER_EMAIL":
                all_present = False
    
    print("\nOptional Variables (or use IAM role):")
    for key, value in optional.items():
        if value:
            display = f"{value[:8]}..." if len(value) > 8 else "***"
            print(f"  ✓ {key}: {display}")
        else:
            print(f"  ✗ {key}: NOT SET (will use IAM role if available)")
    
    print()
    return all_present


def main():
    """Run all tests."""
    print("\n")
    print("╔" + "═" * 58 + "╗")
    print("║" + " " * 15 + "EMAIL TOOL TEST SUITE" + " " * 22 + "║")
    print("╚" + "═" * 58 + "╝")
    print()
    
    # Load environment variables
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✓ Loaded environment from {env_path}")
    else:
        print(f"⚠️  No .env file found at {env_path}")
        print("   Using system environment variables")
    print()
    
    # Check environment
    config_ok = check_environment()
    
    if not config_ok:
        print("❌ Configuration incomplete. Please set required variables.")
        print("\nRequired in .env file:")
        print("  OWNER_EMAIL=your.email@example.com")
        print("  SES_FROM_EMAIL=noreply@yourdomain.com")
        print("  AWS_REGION=us-east-1")
        print("  AWS_ACCESS_KEY_ID=your-access-key")
        print("  AWS_SECRET_ACCESS_KEY=your-secret-key")
        print("\nSee SES_EMAIL_SETUP.md for detailed setup instructions.")
        sys.exit(1)
    
    # Run tests
    results = []
    
    try:
        import boto3
        print("✓ boto3 is installed\n")
    except ImportError:
        print("❌ boto3 is not installed")
        print("   Install with: pip install boto3\n")
        sys.exit(1)
    
    # Test 4: Config check
    results.append(("Configuration", test_missing_config()))
    
    # Test 3: Validation
    results.append(("Input Validation", test_email_validation()))
    
    # Test 1: Basic email
    print("\n⚠️  The following tests will send actual emails to your OWNER_EMAIL.")
    response = input("Continue? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print("\nTests cancelled. Run again when ready to send test emails.")
        sys.exit(0)
    print()
    
    results.append(("Basic Email", test_basic_email()))
    
    # Test 2: Email with sender
    results.append(("Email with Sender", test_email_with_sender()))
    
    # Summary
    print("\n")
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    total = len(results)
    passed_count = sum(1 for _, p in results if p)
    
    print()
    print(f"Results: {passed_count}/{total} tests passed")
    print("=" * 60)
    
    if passed_count == total:
        print("\n🎉 All tests passed! Email tool is working correctly.")
        print("\nNext steps:")
        print("1. Check your inbox for test emails")
        print("2. Verify sender and reply-to addresses are correct")
        print("3. Test replying to emails with sender info")
        print("4. Test the tool through the agent chat interface")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        print("\nTroubleshooting:")
        print("- Verify email addresses in AWS SES Console")
        print("- Check AWS credentials are valid")
        print("- Review SES_EMAIL_SETUP.md for configuration help")
        print("- Check agent logs for detailed error messages")
    
    print()
    
    sys.exit(0 if passed_count == total else 1)


if __name__ == '__main__':
    main()
