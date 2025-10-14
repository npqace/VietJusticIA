import random
import logging
from datetime import datetime, timedelta, timezone

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_otp(length: int = 6) -> str:
    """
    Generates a random OTP of a specified length.
    """
    return "".join([str(random.randint(0, 9)) for _ in range(length)])

def get_otp_expiry_time(minutes: int = 15) -> datetime:
    """
    Returns the expiry time for an OTP.
    """
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)

def send_otp_email(email: str, otp: str):
    """
    Sends the OTP to the user's email address.

    TODO: Replace this with a real email sending service like SendGrid or AWS SES.
    For now, it just logs the OTP to the console for development purposes.
    """
    logger.info(f"--- OTP for {email} ---")
    logger.info(f"Your verification code is: {otp}")
    logger.info("-----------------------")
    # In a real implementation, you would have something like:
    # from flask_mail import Message
    # msg = Message("Your VietJusticIA Verification Code",
    #               sender="noreply@vietjusticia.com",
    #               recipients=[email])
    # msg.body = f"Your verification code is: {otp}"
    # mail.send(msg)
    return True
