"""Email sending helper. Ready for Resend/SendGrid integration.
When no API key is configured, emails are logged but not sent."""
import os
import logging

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@acuity-professional.com")
APP_NAME = "Acuity Professional"


async def send_email(to_email: str, subject: str, html_body: str):
    """Send an email. Returns True if sent, False if skipped (no key configured)."""
    if RESEND_API_KEY:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                    json={"from": f"{APP_NAME} <{FROM_EMAIL}>", "to": [to_email], "subject": subject, "html": html_body},
                )
                if resp.status_code in (200, 201):
                    logger.info(f"Email sent to {to_email}: {subject}")
                    return True
                logger.warning(f"Email send failed: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"Email send error: {e}")
        return False

    if SENDGRID_API_KEY:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"},
                    json={
                        "personalizations": [{"to": [{"email": to_email}]}],
                        "from": {"email": FROM_EMAIL, "name": APP_NAME},
                        "subject": subject,
                        "content": [{"type": "text/html", "value": html_body}],
                    },
                )
                if resp.status_code in (200, 201, 202):
                    logger.info(f"Email sent via SendGrid to {to_email}: {subject}")
                    return True
                logger.warning(f"SendGrid send failed: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.error(f"SendGrid send error: {e}")
        return False

    logger.info(f"[EMAIL NOT SENT - No API key] To: {to_email}, Subject: {subject}")
    return False


def build_invite_email(inviter_name: str, team_name: str, join_url: str):
    subject = f"{inviter_name} invited you to join {team_name} on Acuity Professional"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Acuity Professional</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">You've been invited!</h2>
            <p style="color: #4b5563; line-height: 1.6;">
                <strong>{inviter_name}</strong> has invited you to join <strong>{team_name}</strong> on Acuity Professional, a collaborative work management platform.
            </p>
            <a href="{join_url}" style="display: inline-block; background: #f97316; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Join Team
            </a>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                If you didn't expect this invitation, you can ignore this email.
            </p>
        </div>
    </div>
    """
    return subject, html


def build_board_invite_email(inviter_name: str, board_name: str, app_url: str):
    subject = f"{inviter_name} shared '{board_name}' with you on Acuity Professional"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Acuity Professional</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">Board shared with you</h2>
            <p style="color: #4b5563; line-height: 1.6;">
                <strong>{inviter_name}</strong> has shared the board <strong>"{board_name}"</strong> with you.
            </p>
            <a href="{app_url}" style="display: inline-block; background: #f97316; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
                Open Board
            </a>
        </div>
    </div>
    """
    return subject, html
