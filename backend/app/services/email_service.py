"""
Email service for sending notifications
Converted from Node.js nodemailer setup
"""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Optional
from app.core.config import settings
from passlib.context import CryptContext

logger = logging.getLogger(__name__)

class EmailService:
    """Email service for sending notifications"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_pass = settings.SMTP_PASS.get_secret_value() if settings.SMTP_PASS else ""
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        text_content: Optional[str] = None,
        html_content: Optional[str] = None
    ) -> bool:
        """Send email"""
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f'"DeviceMS" <{self.smtp_user}>'
            message["To"] = to_email
            
            # Add text content
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)
            
            # Add HTML content
            if html_content:
                html_part = MIMEText(html_content, "html")
                message.attach(html_part)
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                start_tls=True,
                username=self.smtp_user,
                password=self.smtp_pass,
            )
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    async def send_two_factor_code(self, email: str, code: str) -> bool:
        """Send 2FA code email"""
        subject = "Your 2FA Code"
        text_content = f"Your 2FA code is: {code}. It expires in 10 minutes."
        html_content = f"""
        <html>
            <body>
                <h2>Two-Factor Authentication</h2>
                <p>Your 2FA code is: <strong>{code}</strong></p>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            </body>
        </html>
        """
        
        return await self.send_email(email, subject, text_content, html_content)
    
    async def send_password_reset(self, email: str, reset_token: str) -> bool:
        """Send password reset email"""
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        subject = "Password Reset Request"
        
        text_content = (
            "You requested a password reset.\n\n"
            f"Click the following link to reset your password:\n{reset_url}\n\n"
            "This link will expire in 1 hour.\n\n"
            "If you didn't request this reset, please ignore this email."
        )
        
        html_content = f"""\
            <!DOCTYPE html>
            <html lang="en">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Request</title>
                <style>
                    body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #333333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f8f9fa;
                    }}
                    .email-container {{
                    background-color: #ffffff;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
                    position: relative;
                    }}
                    h2 {{
                    color: #2c3e50;
                    margin-top: 0;
                    }}
                    p {{
                    margin: 16px 0;
                    }}
                    .btn {{
                    display: inline-block;
                    background-color: #007bff;
                    color: white !important;
                    text-decoration: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-weight: 600;
                    text-align: center;
                    margin: 20px 0;
                    box-shadow: 0 4px 6px rgba(0, 123, 255, 0.2);
                    }}
                    .btn:hover {{
                    background-color: #0069d9;
                    }}
                    .footer {{
                    font-size: 14px;
                    color: #7f8c8d;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eeeeee;
                    }}
                    .url {{
                    word-break: break-all;
                    color: #007bff;
                    text-decoration: underline;
                    }}
                    .kenya-flag-border {{
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    height: 10px;
                    display: flex;
                    flex-direction: column;
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                    overflow: hidden;
                    }}
                    .kenya-flag-border div {{
                    width: 100%;
                    }}
                    .stripe-1 {{ height: 25%; background-color: #000000; }}
                    .stripe-2 {{ height: 12.5%; background-color: #FFFFFF; }}
                    .stripe-3 {{ height: 25%; background-color: #BB0000; }}
                    .stripe-4 {{ height: 12.5%; background-color: #FFFFFF; }}
                    .stripe-5 {{ height: 25%; background-color: #006600; }}
                </style>
                </head>
                <body>
                <div class="email-container">
                    <div class="kenya-flag-border">
                    <div class="stripe-1"></div>
                    <div class="stripe-2"></div>
                    <div class="stripe-3"></div>
                    <div class="stripe-4"></div>
                    <div class="stripe-5"></div>
                    </div>

                    <h2>Password Reset Request</h2>
                    <p>You recently requested to reset your password.</p>
                    
                    <a href="{reset_url}" class="btn">Reset Your Password</a>
                    
                    <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                    <p class="url">{reset_url}</p>
                    
                    <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
                    
                    <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                    
                    <div class="footer">
                    <p>Thank you,<br>Your Application Team</p>
                    </div>
                </div>
                </body>
                </html>
        """
        
        return await self.send_email(email, subject, text_content, html_content)
    
    async def send_device_transfer_notification(
        self, 
        to_email: str, 
        device_hostname: str, 
        previous_owner: str, 
        new_owner: str,
        transfer_reason: str,
        transfer_location: str
    ) -> bool:
        """Send device transfer notification email"""
        subject = f"Device Transfer Notification - {device_hostname}"
        
        text_content = f"""
        Device Transfer Notification
        
        Device: {device_hostname}
        Previous Owner: {previous_owner or 'Unassigned'}
        New Owner: {new_owner}
        Transfer Location: {transfer_location}
        Reason: {transfer_reason or 'Not specified'}
        
        Please log into the Device Management System to view more details.
        """
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                        Device Transfer Notification
                    </h2>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #2c3e50; margin-top: 0;">Transfer Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 150px;">Device:</td>
                                <td style="padding: 8px 0;">{device_hostname}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Previous Owner:</td>
                                <td style="padding: 8px 0;">{previous_owner or 'Unassigned'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">New Owner:</td>
                                <td style="padding: 8px 0; color: #27ae60; font-weight: bold;">{new_owner}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                                <td style="padding: 8px 0;">{transfer_location}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Reason:</td>
                                <td style="padding: 8px 0;">{transfer_reason or 'Not specified'}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="margin: 20px 0;">
                        <a href="{settings.FRONTEND_URL}/devices" 
                           style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Device Details
                        </a>
                    </p>
                    
                    <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                        This is an automated notification from the Device Management System.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, text_content, html_content)

    async def send_approval_request_notification(
        self,
        to_email: str,
        requester_name: str,
        device_hostname: str,
        transfer_reason: str,
        approval_link: str
    ) -> bool:
        """Send approval request notification email"""
        subject = f"Device Transfer Approval Required - {device_hostname}"
        
        text_content = f"""
        Device Transfer Approval Required
        
        A device transfer request requires your approval:
        
        Requester: {requester_name}
        Device: {device_hostname}
        Reason: {transfer_reason}
        
        Please review and approve/reject this request in the Device Management System.
        Approval Link: {approval_link}
        """
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                        ⚠️ Approval Required
                    </h2>
                    
                    <p style="font-size: 16px; margin: 20px 0;">
                        A device transfer request requires your approval.
                    </p>
                    
                    <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #856404; margin-top: 0;">Request Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 120px;">Requester:</td>
                                <td style="padding: 8px 0;">{requester_name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Device:</td>
                                <td style="padding: 8px 0;">{device_hostname}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Reason:</td>
                                <td style="padding: 8px 0;">{transfer_reason}</td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{approval_link}" 
                           style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">
                            Review Request
                        </a>
                    </div>
                    
                    <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                        Please review this request promptly. This is an automated notification from the Device Management System.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, text_content, html_content)

    async def send_overdue_reminder(
        self,
        to_email: str,
        user_name: str,
        device_hostname: str,
        days_overdue: int,
        expected_return_date: str
    ) -> bool:
        """Send overdue device return reminder email"""
        subject = f"Overdue Device Return Reminder - {device_hostname}"
        
        text_content = f"""
        Device Return Reminder
        
        Hello {user_name},
        
        This is a reminder that the following device is overdue for return:
        
        Device: {device_hostname}
        Expected Return Date: {expected_return_date}
        Days Overdue: {days_overdue}
        
        Please return the device as soon as possible or contact your administrator.
        """
        
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                        📅 Device Return Reminder
                    </h2>
                    
                    <p style="font-size: 16px; margin: 20px 0;">
                        Hello {user_name},
                    </p>
                    
                    <p>This is a reminder that the following device is overdue for return:</p>
                    
                    <div style="background-color: #ffebee; border: 1px solid #ffcdd2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #c62828; margin-top: 0;">Overdue Device</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold; width: 150px;">Device:</td>
                                <td style="padding: 8px 0;">{device_hostname}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Expected Return:</td>
                                <td style="padding: 8px 0;">{expected_return_date}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-weight: bold;">Days Overdue:</td>
                                <td style="padding: 8px 0; color: #c62828; font-weight: bold;">{days_overdue} days</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="margin: 20px 0;">
                        Please return the device as soon as possible or contact your administrator if you need an extension.
                    </p>
                    
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}/devices" 
                           style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View My Devices
                        </a>
                    </p>
                    
                    <p style="color: #7f8c8d; font-size: 14px; margin-top: 30px;">
                        This is an automated reminder from the Device Management System.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, text_content, html_content)

    async def send_welcome_email(
        self,
        to_email: str,
        username: str,
        temporary_password: str,
        first_name: str = "User"
    ) -> bool:
        """Send welcome email with login credentials to new user"""
        subject = "Welcome to Assets Management System - Your Account is Ready"
        
        login_url = f"{settings.FRONTEND_URL}/login"
        
        text_content = f"""
        Welcome to Assets Management System
        
        Hello {first_name},
        
        Your account has been successfully created. Here are your login credentials:
        
        Email: {to_email}
        Username: {username}
        Temporary Password: {temporary_password}
        
        Login URL: {login_url}
        
        IMPORTANT NEXT STEPS:
        1. Log in using the credentials above
        2. You will be prompted to change your password immediately
        3. Use a strong password that includes uppercase, lowercase, numbers, and special characters
        4. Never share your password with anyone
        5. Enable two-factor authentication in your security settings for additional protection
        
        If you did not request this account, please contact your administrator immediately.
        
        Best regards,
        Assets Management System Team
        """
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Assets Management System</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    }}
                    .email-container {{
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 30px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
                        position: relative;
                    }}
                    h2 {{
                        color: #2c3e50;
                        margin-top: 0;
                        border-bottom: 3px solid #3498db;
                        padding-bottom: 10px;
                    }}
                    h3 {{
                        color: #2c3e50;
                        margin-top: 25px;
                        margin-bottom: 15px;
                        border-left: 4px solid #3498db;
                        padding-left: 15px;
                    }}
                    .credentials-box {{
                        background-color: #ecf0f1;
                        border-left: 4px solid #3498db;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 4px;
                        font-family: 'Courier New', monospace;
                    }}
                    .credentials-box p {{
                        margin: 10px 0;
                        font-size: 14px;
                    }}
                    .credentials-box strong {{
                        color: #2c3e50;
                        display: inline-block;
                        min-width: 140px;
                    }}
                    .credentials-value {{
                        background-color: #ffffff;
                        padding: 2px 6px;
                        border-radius: 3px;
                        font-weight: 600;
                        word-break: break-all;
                    }}
                    .btn {{
                        display: inline-block;
                        background-color: #3498db;
                        color: white !important;
                        text-decoration: none;
                        padding: 12px 24px;
                        border-radius: 6px;
                        font-weight: 600;
                        text-align: center;
                        margin: 20px 0;
                        box-shadow: 0 4px 6px rgba(52, 152, 219, 0.2);
                    }}
                    .btn:hover {{
                        background-color: #2980b9;
                    }}
                    .warning {{
                        background-color: #fff3cd;
                        border: 1px solid #ffeaa7;
                        color: #856404;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 20px 0;
                    }}
                    .steps {{
                        background-color: #e3f2fd;
                        border: 1px solid #90caf9;
                        padding: 20px;
                        border-radius: 4px;
                        margin: 20px 0;
                    }}
                    .steps ol {{
                        margin: 0;
                        padding-left: 20px;
                    }}
                    .steps li {{
                        margin: 8px 0;
                        color: #1565c0;
                    }}
                    .footer {{
                        font-size: 12px;
                        color: #7f8c8d;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eeeeee;
                        text-align: center;
                    }}
                    .kenya-flag-border {{
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 8px;
                        display: flex;
                        flex-direction: column;
                        border-bottom-left-radius: 8px;
                        border-bottom-right-radius: 8px;
                        overflow: hidden;
                    }}
                    .kenya-flag-border div {{
                        width: 100%;
                    }}
                    .stripe-1 {{ height: 25%; background-color: #000000; }}
                    .stripe-2 {{ height: 12.5%; background-color: #FFFFFF; }}
                    .stripe-3 {{ height: 25%; background-color: #BB0000; }}
                    .stripe-4 {{ height: 12.5%; background-color: #FFFFFF; }}
                    .stripe-5 {{ height: 25%; background-color: #006600; }}
                </style>
            </head>
            <body>
                <div class="email-container">
                    <h2>Welcome to Assets Management System</h2>
                    
                    <p>Hello {first_name},</p>
                    
                    <p>Your account has been successfully created in the Assets Management System. You can now log in using the credentials below:</p>
                    
                    <div class="credentials-box">
                        <p><strong>Email:</strong> <span class="credentials-value">{to_email}</span></p>
                        <p><strong>Username:</strong> <span class="credentials-value">{username}</span></p>
                        <p><strong>Temporary Password:</strong> <span class="credentials-value">{temporary_password}</span></p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{login_url}" class="btn">Login to Your Account</a>
                    </div>
                    
                    <div class="steps">
                        <h3 style="margin-top: 0; margin-left: -15px; color: #1565c0;">Next Steps:</h3>
                        <ol>
                            <li><strong>Log in</strong> using the credentials provided above</li>
                            <li><strong>Change your password</strong> immediately after your first login (you may be prompted automatically)</li>
                            <li><strong>Create a strong password</strong> with uppercase, lowercase, numbers, and special characters</li>
                            <li><strong>Enable Two-Factor Authentication</strong> in your security settings for additional protection</li>
                            <li><strong>Never share</strong> your password with anyone</li>
                        </ol>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important Security Notice</strong>
                        <p>This is a temporary password. You must change it immediately after your first login. If you don't change it within 24 hours, your account may be locked for security reasons.</p>
                    </div>
                    
                    <h3>Password Requirements</h3>
                    <p>When changing your password, ensure it meets the following requirements:</p>
                    <ul>
                        <li>Minimum 12 characters</li>
                        <li>At least one uppercase letter (A-Z)</li>
                        <li>At least one lowercase letter (a-z)</li>
                        <li>At least one number (0-9)</li>
                        <li>At least one special character (!@#$%^&*)</li>
                    </ul>
                    
                    <p>If you have any questions or need assistance, please contact your administrator at the support email.</p>
                    
                    <p style="margin-top: 30px; font-size: 13px; color: #7f8c8d;">
                        <strong>Did you not request this account?</strong> If you believe this email was sent in error, please contact your administrator immediately.
                    </p>
                    
                    <div class="footer">
                        <p>This is an automated message from the Assets Management System. Please do not reply to this email.</p>
                        <p>&copy; 2025 Assets Management System. All rights reserved.</p>
                    </div>
                    
                    <div class="kenya-flag-border">
                        <div class="stripe-1"></div>
                        <div class="stripe-2"></div>
                        <div class="stripe-3"></div>
                        <div class="stripe-4"></div>
                        <div class="stripe-5"></div>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return await self.send_email(to_email, subject, text_content, html_content)

    async def send_password_change_otp(self, email: str, first_name: str, otp_code: str) -> bool:
        """Send password change OTP via email"""
        subject = "Your Password Change OTP"
        
        text_content = f"""
        Hello {first_name},
        
        You requested to change your password. Here is your One-Time Password (OTP):
        
        OTP: {otp_code}
        
        This OTP will expire in 10 minutes.
        
        If you didn't request this, please ignore this email.
        """
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Change OTP</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        line-height: 1.6;
                        color: #333333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f8f9fa;
                    }}
                    .email-container {{
                        background-color: #ffffff;
                        border-radius: 8px;
                        padding: 30px;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
                        position: relative;
                    }}
                    h2 {{
                        color: #2c3e50;
                        margin-top: 0;
                        border-bottom: 3px solid #3498db;
                        padding-bottom: 10px;
                    }}
                    .otp-box {{
                        background-color: #ecf0f1;
                        border: 2px solid #3498db;
                        padding: 20px;
                        margin: 20px 0;
                        border-radius: 8px;
                        text-align: center;
                    }}
                    .otp-code {{
                        font-size: 32px;
                        font-weight: bold;
                        color: #2c3e50;
                        font-family: 'Courier New', monospace;
                        letter-spacing: 4px;
                        margin: 10px 0;
                    }}
                    .otp-expiry {{
                        color: #e74c3c;
                        font-weight: bold;
                        margin-top: 15px;
                    }}
                    .footer {{
                        font-size: 12px;
                        color: #7f8c8d;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eeeeee;
                    }}
                    .warning {{
                        background-color: #fff3cd;
                        border: 1px solid #ffeaa7;
                        padding: 12px;
                        border-radius: 4px;
                        margin: 15px 0;
                        color: #856404;
                    }}
                    .kenya-flag-border {{
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        height: 8px;
                        display: flex;
                        flex-direction: column;
                        border-bottom-left-radius: 8px;
                        border-bottom-right-radius: 8px;
                        overflow: hidden;
                    }}
                    .kenya-flag-border div {{
                        width: 100%;
                    }}
                    .stripe-1 {{ height: 25%; background-color: #000000; }}
                    .stripe-2 {{ height: 12.5%; background-color: #FFFFFF; }}
                    .stripe-3 {{ height: 25%; background-color: #BB0000; }}
                    .stripe-4 {{ height: 12.5%; background-color: #FFFFFF; }}
                    .stripe-5 {{ height: 25%; background-color: #006600; }}
                </style>
            </head>
            <body>
                <div class="email-container">
                    <h2>Password Change Verification</h2>
                    
                    <p>Hello {first_name},</p>
                    
                    <p>You requested to change your password. Use the One-Time Password (OTP) below to proceed:</p>
                    
                    <div class="otp-box">
                        <p style="margin: 0 0 10px 0; color: #7f8c8d;">Your OTP Code:</p>
                        <div class="otp-code">{otp_code}</div>
                        <div class="otp-expiry">⏱️ Expires in 10 minutes</div>
                    </div>
                    
                    <div class="warning">
                        <strong>🔒 Security Notice:</strong> Never share this OTP with anyone. We will never ask for it via email or phone.
                    </div>
                    
                    <p>If you didn't request a password change, please ignore this email and your password will remain unchanged.</p>
                    
                    <p>Have questions? Contact our support team.</p>
                    
                    <div class="footer">
                        <p>This is an automated message from the Assets Management System. Please do not reply to this email.</p>
                        <p>&copy; 2025 Assets Management System. All rights reserved.</p>
                    </div>
                    
                    <div class="kenya-flag-border">
                        <div class="stripe-1"></div>
                        <div class="stripe-2"></div>
                        <div class="stripe-3"></div>
                        <div class="stripe-4"></div>
                        <div class="stripe-5"></div>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return await self.send_email(email, subject, text_content, html_content)

# Create email service instance
email_service = EmailService()
