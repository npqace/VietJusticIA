import os
import logging
from ..database.models import ConsultationRequest
from .brevo_email_service import send_email

logger = logging.getLogger(__name__)


async def send_consultation_request_notification(consultation_request: ConsultationRequest) -> bool:
    """
    Send email notification to admin when a new consultation request is submitted.
    """
    admin_email = os.getenv("ADMIN_EMAIL")

    if not admin_email:
        logger.warning("ADMIN_EMAIL not configured in environment. Skipping notification email.")
        return False

    # Format the request date
    created_at_formatted = consultation_request.created_at.strftime("%d/%m/%Y %H:%M")

    # Vietnamese HTML content for admin notification
    html_content = f"""
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #2854A8;">Yêu cầu tư vấn pháp luật mới</h2>
        <p>Bạn đã nhận được một yêu cầu tư vấn pháp luật mới từ hệ thống VietJusticIA.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2854A8; margin-top: 0;">Thông tin người yêu cầu</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Họ và tên:</td>
                    <td style="padding: 8px 0;">{consultation_request.full_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                    <td style="padding: 8px 0;">{consultation_request.email}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Số điện thoại:</td>
                    <td style="padding: 8px 0;">{consultation_request.phone}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Địa chỉ:</td>
                    <td style="padding: 8px 0;">{consultation_request.district}, {consultation_request.province}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-weight: bold;">Ngày gửi:</td>
                    <td style="padding: 8px 0;">{created_at_formatted}</td>
                </tr>
            </table>
        </div>

        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Nội dung yêu cầu</h3>
            <p style="white-space: pre-wrap; margin: 0;">{consultation_request.content}</p>
        </div>

        <p style="margin-top: 30px;">Vui lòng đăng nhập vào hệ thống admin để xử lý yêu cầu này.</p>
        <p><strong>Mã yêu cầu:</strong> #{consultation_request.id}</p>

        <br>
        <p>Trân trọng,</p>
        <p><strong>Hệ thống VietJusticIA</strong></p>
    </div>
    """

    subject = f"[VietJusticIA] Yêu cầu tư vấn mới từ {consultation_request.full_name}"

    return await send_email(subject, admin_email, html_content)
