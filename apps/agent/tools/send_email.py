"""Send emails using AWS SES (Simple Email Service)."""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def _track_email_usage() -> None:
    """Track email usage in the database for billing purposes."""
    try:
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            logger.debug("DATABASE_URL not set, skipping email usage tracking")
            return
        
        # Import here to avoid dependency issues
        import asyncpg
        import asyncio
        
        async def update_email_count():
            try:
                conn = await asyncpg.connect(database_url)
                try:
                    # Increment email count for owner profile
                    await conn.execute("""
                        UPDATE profiles
                        SET data = jsonb_set(
                            COALESCE(data, '{}'::jsonb),
                            '{emails_sent_this_month}',
                            (COALESCE((data->>'emails_sent_this_month')::int, 0) + 1)::text::jsonb
                        )
                        WHERE type = 'owner'
                    """)
                    logger.debug("Email usage tracked successfully")
                finally:
                    await conn.close()
            except Exception as e:
                logger.warning(f"Failed to track email usage: {e}")
        
        # Run async update in background
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # If there's already a running loop, create a task
                asyncio.create_task(update_email_count())
            else:
                # Otherwise run it
                loop.run_until_complete(update_email_count())
        except RuntimeError:
            # No event loop, create a new one
            asyncio.run(update_email_count())
            
    except Exception as e:
        logger.warning(f"Error tracking email usage: {e}")


def send_email(
    subject: str,
    message: str,
    sender_name: str | None = None,
    sender_email: str | None = None,
    reply_to: str | None = None,
) -> str:
    """Send an email to the site owner using AWS SES.
    
    Args:
        subject: Email subject line.
        message: Email body/message content.
        sender_name: Name of the person sending (if applicable).
        sender_email: Email address of sender (will be added to reply-to if provided).
        reply_to: Reply-to email address (defaults to sender_email if provided).
    
    Returns:
        Confirmation message or error description.
    """
    # Validate inputs
    if not subject or not subject.strip():
        return "Error: Email subject is required."
    
    if not message or not message.strip():
        return "Error: Email message is required."
    
    # Get configuration from environment
    owner_email = os.environ.get("OWNER_EMAIL")
    ses_from_email = os.environ.get("SES_FROM_EMAIL")
    aws_region = os.environ.get("AWS_REGION", "us-east-1")
    
    if not owner_email:
        return (
            "Email delivery is not configured. "
            "Please use the contact information provided on the site."
        )
    
    if not ses_from_email:
        logger.warning("SES_FROM_EMAIL not set, using OWNER_EMAIL as sender")
        ses_from_email = owner_email
    
    try:
        import boto3
        from botocore.exceptions import ClientError, NoCredentialsError
        
        # Create SES client
        ses_client = boto3.client('ses', region_name=aws_region)
        
        # Build email body
        email_body = message
        
        # Add sender information if provided
        if sender_name or sender_email:
            email_body = f"From: {sender_name or 'Unknown'}"
            if sender_email:
                email_body += f" <{sender_email}>"
            email_body += f"\n\n{message}"
        
        # Prepare destination
        destination = {
            'ToAddresses': [owner_email],
        }
        
        # Prepare message
        email_message: dict[str, Any] = {
            'Subject': {
                'Data': subject,
                'Charset': 'UTF-8',
            },
            'Body': {
                'Text': {
                    'Data': email_body,
                    'Charset': 'UTF-8',
                },
            },
        }
        
        # Set reply-to if provided
        reply_to_addresses = []
        if reply_to:
            reply_to_addresses.append(reply_to)
        elif sender_email:
            reply_to_addresses.append(sender_email)
        
        # Send email
        send_kwargs: dict[str, Any] = {
            'Source': ses_from_email,
            'Destination': destination,
            'Message': email_message,
        }
        
        if reply_to_addresses:
            send_kwargs['ReplyToAddresses'] = reply_to_addresses
        
        response = ses_client.send_email(**send_kwargs)
        
        message_id = response.get('MessageId', 'unknown')
        
        logger.info(
            f"Email sent successfully: subject='{subject}', "
            f"from={sender_name or 'agent'}, message_id={message_id}"
        )
        
        # Track email usage for billing
        _track_email_usage()
        
        # Build confirmation message
        confirmation = f"Email sent successfully to {owner_email}."
        if sender_name:
            confirmation += f" Sender: {sender_name}"
        if sender_email:
            confirmation += f" (Reply-to: {sender_email})"
        
        return confirmation
        
    except ImportError:
        logger.error("boto3 not installed")
        return (
            "Email delivery requires boto3. "
            "Install with: pip install boto3"
        )
    except NoCredentialsError:
        logger.error("AWS credentials not found")
        return (
            "AWS credentials not configured. "
            "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, "
            "or configure IAM role for the application."
        )
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_message = e.response.get('Error', {}).get('Message', str(e))
        
        if error_code == 'MessageRejected':
            logger.error(f"SES rejected email: {error_message}")
            return (
                "Email was rejected. Please ensure the sender email "
                "is verified in AWS SES."
            )
        elif error_code == 'MailFromDomainNotVerified':
            logger.error(f"SES domain not verified: {error_message}")
            return (
                "The sender domain is not verified in AWS SES. "
                "Please verify the domain in the AWS SES console."
            )
        elif error_code == 'ConfigurationSetDoesNotExist':
            logger.error(f"SES configuration set error: {error_message}")
            return "Email configuration error. Please check AWS SES settings."
        else:
            logger.exception(f"SES error: {error_code} - {error_message}")
            return (
                f"Unable to send email at this time. "
                f"Error: {error_code}. Please try again later."
            )
    except Exception as e:
        logger.exception("Unexpected error sending email")
        return (
            f"Unable to send email at this time. "
            f"Error: {e!s}. Please try again later or use the contact form."
        )
