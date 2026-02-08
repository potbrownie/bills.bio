#!/usr/bin/env python3
"""Setup script for Google Calendar OAuth authentication.

This script generates the OAuth token required for the schedule_meeting tool.
Run this once to authenticate and save credentials for future use.

Usage:
    export GOOGLE_CALENDAR_CREDENTIALS_PATH=/path/to/credentials.json
    export GOOGLE_CALENDAR_TOKEN_PATH=/path/to/token.pickle
    python scripts/setup_google_calendar.py
"""

import os
import pickle
import sys
from pathlib import Path

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
except ImportError:
    print("Error: Required packages not installed.")
    print("Install with: pip install google-auth google-auth-oauthlib google-api-python-client")
    sys.exit(1)

SCOPES = ['https://www.googleapis.com/auth/calendar.events']


def setup_calendar_auth():
    """Generate OAuth token for Google Calendar API."""
    credentials_path = os.environ.get('GOOGLE_CALENDAR_CREDENTIALS_PATH')
    token_path = os.environ.get('GOOGLE_CALENDAR_TOKEN_PATH')
    
    if not credentials_path:
        print("❌ Error: GOOGLE_CALENDAR_CREDENTIALS_PATH environment variable not set")
        print("   Set it to the path of your credentials.json file")
        print("   Example: export GOOGLE_CALENDAR_CREDENTIALS_PATH=/path/to/credentials.json")
        return False
    
    if not token_path:
        print("❌ Error: GOOGLE_CALENDAR_TOKEN_PATH environment variable not set")
        print("   Set it to the path where you want to store the token")
        print("   Example: export GOOGLE_CALENDAR_TOKEN_PATH=/path/to/token.pickle")
        return False
    
    if not os.path.exists(credentials_path):
        print(f"❌ Error: Credentials file not found at {credentials_path}")
        print("   Download it from Google Cloud Console:")
        print("   1. Go to https://console.cloud.google.com/")
        print("   2. Navigate to 'APIs & Services' > 'Credentials'")
        print("   3. Create OAuth 2.0 Client ID (Desktop app)")
        print("   4. Download the JSON file")
        return False
    
    print(f"📂 Using credentials from: {credentials_path}")
    print(f"💾 Token will be saved to: {token_path}")
    print()
    
    creds = None
    
    # Check for existing token
    if os.path.exists(token_path):
        print("🔍 Found existing token file...")
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    
    # If no valid credentials, let user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("🔄 Refreshing expired token...")
            try:
                creds.refresh(Request())
                print("✓ Token refreshed successfully")
            except Exception as e:
                print(f"❌ Failed to refresh token: {e}")
                print("   Requesting new authorization...")
                creds = None
        
        if not creds:
            print("🔐 Starting OAuth flow...")
            print("   A browser window will open for authorization.")
            print("   Please sign in and grant access to Google Calendar.")
            print()
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(
                    credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
                print("✓ Authorization successful!")
            except Exception as e:
                print(f"❌ Authorization failed: {e}")
                return False
        
        # Save credentials
        try:
            # Ensure directory exists
            token_dir = os.path.dirname(token_path)
            if token_dir:
                Path(token_dir).mkdir(parents=True, exist_ok=True)
            
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
            print(f"✓ Token saved to {token_path}")
        except Exception as e:
            print(f"❌ Failed to save token: {e}")
            return False
    else:
        print("✓ Token is already valid")
    
    print()
    print("=" * 60)
    print("✅ Google Calendar setup complete!")
    print()
    print("Next steps:")
    print("1. Add these to your .env file:")
    print(f"   GOOGLE_CALENDAR_CREDENTIALS_PATH={credentials_path}")
    print(f"   GOOGLE_CALENDAR_TOKEN_PATH={token_path}")
    print("   GOOGLE_CALENDAR_ID=primary")
    print()
    print("2. Restart your agent:")
    print("   cd apps/agent")
    print("   source venv/bin/activate")
    print("   uvicorn main:app --host 0.0.0.0 --port 8000")
    print()
    print("3. Test the meeting scheduler through the chat interface!")
    print("=" * 60)
    
    return True


def main():
    """Main entry point."""
    print("=" * 60)
    print("Google Calendar OAuth Setup")
    print("=" * 60)
    print()
    
    success = setup_calendar_auth()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
