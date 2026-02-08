"""Schedule Google Meet meetings with qualified requesters."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


def schedule_meeting(name: str, email: str, reason: str, duration_minutes: int = 30) -> str:
    """Schedule a Google Meet meeting with a qualified person.
    
    Args:
        name: Full name of the person requesting the meeting.
        email: Email address where the meeting invite will be sent.
        reason: Reason for the meeting (must be qualified/legitimate).
        duration_minutes: Meeting duration in minutes (default 30).
    
    Returns:
        A confirmation message with meeting details or an error message.
    """
    # Validate inputs
    if not name or not name.strip():
        return "Error: Name is required to schedule a meeting."
    
    if not email or "@" not in email:
        return "Error: A valid email address is required to schedule a meeting."
    
    if not reason or not reason.strip():
        return "Error: A reason for the meeting is required."
    
    # Check for Google Calendar credentials
    credentials_path = os.environ.get("GOOGLE_CALENDAR_CREDENTIALS_PATH")
    token_path = os.environ.get("GOOGLE_CALENDAR_TOKEN_PATH")
    
    if not credentials_path or not token_path:
        return (
            "Meeting scheduling is not yet configured. "
            "Please contact Bill directly at the email provided on the site."
        )
    
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
        import pickle
        import os.path
        
        # Load token
        creds = None
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
        
        # Refresh token if needed
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
                # Save refreshed token
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
            else:
                return (
                    "Google Calendar authentication needs to be refreshed. "
                    "Please contact Bill directly at the email provided on the site."
                )
        
        # Create calendar service
        service = build('calendar', 'v3', credentials=creds)
        
        # Schedule meeting for 48 hours from now (allows time for review)
        start_time = datetime.utcnow() + timedelta(hours=48)
        # Round to next 30-minute mark
        start_time = start_time.replace(minute=(start_time.minute // 30) * 30, second=0, microsecond=0)
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        # Create event with Google Meet
        event = {
            'summary': f'Meeting with {name}',
            'description': f'Reason: {reason}\n\nRequested by: {name} ({email})',
            'start': {
                'dateTime': start_time.isoformat() + 'Z',
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': end_time.isoformat() + 'Z',
                'timeZone': 'UTC',
            },
            'attendees': [
                {'email': email, 'displayName': name},
            ],
            'conferenceData': {
                'createRequest': {
                    'requestId': f"meet-{int(datetime.utcnow().timestamp())}",
                    'conferenceSolutionKey': {'type': 'hangoutsMeet'},
                },
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                    {'method': 'popup', 'minutes': 30},
                ],
            },
        }
        
        # Get calendar ID (default is 'primary')
        calendar_id = os.environ.get("GOOGLE_CALENDAR_ID", "primary")
        
        # Create event
        created_event = service.events().insert(
            calendarId=calendar_id,
            body=event,
            conferenceDataVersion=1,
            sendUpdates='all',
        ).execute()
        
        meet_link = created_event.get('hangoutLink', 'N/A')
        event_link = created_event.get('htmlLink', 'N/A')
        
        # Format response
        start_formatted = start_time.strftime('%B %d, %Y at %I:%M %p UTC')
        
        logger.info(
            f"Meeting scheduled: {name} ({email}) - {reason} - {start_formatted}"
        )
        
        return (
            f"Meeting scheduled successfully!\n\n"
            f"Details:\n"
            f"- Attendee: {name} ({email})\n"
            f"- When: {start_formatted}\n"
            f"- Duration: {duration_minutes} minutes\n"
            f"- Google Meet: {meet_link}\n\n"
            f"A calendar invitation has been sent to {email}. "
            f"You'll receive a confirmation email shortly."
        )
        
    except ImportError:
        logger.warning("Google Calendar API libraries not installed")
        return (
            "Meeting scheduling requires additional setup. "
            "Install google-auth, google-auth-oauthlib, google-api-python-client: "
            "pip install google-auth google-auth-oauthlib google-api-python-client"
        )
    except Exception as e:
        logger.exception("Failed to schedule meeting")
        return (
            f"Unable to schedule meeting at this time. "
            f"Please try again later or contact Bill directly. Error: {e!s}"
        )
