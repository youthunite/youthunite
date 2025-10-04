import { Resend } from 'resend';

type EmailConfig = {
  RESEND: string;
  RESEND_DOMAIN: string;
};

const getEmailStyles = () => `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: #F8F9FA;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      color: #FFFFFF;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #1A1A1A;
      line-height: 1.6;
    }
    .content p {
      margin: 0 0 16px 0;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      background-color: #FF6B35;
      color: #FFFFFF;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-weight: 600;
      margin: 20px 0;
      font-size: 16px;
    }
    .button:hover {
      background-color: #FF8A5B;
    }
    .footer {
      background-color: #1B365D;
      padding: 30px;
      text-align: center;
      color: #FFFFFF;
      font-size: 14px;
    }
    .footer a {
      color: #4A90E2;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #E5E7EB;
      margin: 30px 0;
    }
    .highlight {
      background-color: #F8F9FA;
      padding: 16px;
      border-left: 4px solid #FF6B35;
      border-radius: 4px;
      margin: 20px 0;
    }
  </style>
`;

export const sendEmail = async (
  config: EmailConfig,
  {
    to,
    subject,
    html,
  }: {
    to: string | string[];
    subject: string;
    html: string;
  }
) => {
  const resend = new Resend(config.RESEND);
  
  const wrappedHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${getEmailStyles()}
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: `YouthUnite <noreply@${config.RESEND_DOMAIN}>`,
    to,
    subject,
    html: wrappedHtml,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};

export const createWelcomeEmail = (userName: string) => `
  <div class="container">
    <div class="header">
      <h1>Welcome to YouthUnite!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>We're thrilled to have you join our community! YouthUnite is your platform for learning, growing, and connecting with opportunities.</p>
      <div class="highlight">
        <p><strong>Get started by:</strong></p>
        <p>✓ Exploring upcoming events and programs<br>
        ✓ Connecting with other members<br>
        ✓ Accessing learning resources</p>
      </div>
      <p>If you have any questions, feel free to reach out to our team anytime.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} YouthUnite. All rights reserved.</p>
    </div>
  </div>
`;

export const createPasswordResetEmail = (resetUrl: string) => `
  <div class="container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>You requested to reset your password for your YouthUnite account.</p>
      <p>Click the button below to set a new password:</p>
      <center>
        <a href="${resetUrl}" class="button">Reset Password</a>
      </center>
      <p style="color: #2C3E50; font-size: 14px;">This link will expire in 1 hour.</p>
      <div class="divider"></div>
      <p style="font-size: 14px; color: #2C3E50;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} YouthUnite. All rights reserved.</p>
    </div>
  </div>
`;

export const createEventRegistrationEmail = (
  userName: string,
  eventName: string,
  eventDate: string,
  eventLocation: string
) => `
  <div class="container">
    <div class="header">
      <h1>Event Registration Confirmed!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      <p>You're all set! Your registration for <strong>${eventName}</strong> has been confirmed.</p>
      <div class="highlight">
        <p><strong>Event Details:</strong></p>
        <p>📅 <strong>Date:</strong> ${eventDate}<br>
        📍 <strong>Location:</strong> ${eventLocation}</p>
      </div>
      <p>We're looking forward to seeing you there!</p>
      <p>If you have any questions about the event, please don't hesitate to contact us.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} YouthUnite. All rights reserved.</p>
    </div>
  </div>
`;

export const createContactFormEmail = (
  firstName: string,
  lastName: string,
  email: string,
  question: string
) => `
  <div class="container">
    <div class="header">
      <h1>New Contact Form Submission</h1>
    </div>
    <div class="content">
      <p><strong>From:</strong> ${firstName} ${lastName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <div class="divider"></div>
      <p><strong>Message:</strong></p>
      <div class="highlight">
        <p>${question.replace(/\n/g, '<br>')}</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} YouthUnite. All rights reserved.</p>
    </div>
  </div>
`;

export const createContactConfirmationEmail = (firstName: string) => `
  <div class="container">
    <div class="header">
      <h1>We Received Your Message!</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Thank you for reaching out to YouthUnite! We've received your message and our team will get back to you as soon as possible.</p>
      <p>We typically respond within 1-2 business days.</p>
      <div class="divider"></div>
      <p>In the meantime, feel free to explore our platform and check out upcoming events!</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} YouthUnite. All rights reserved.</p>
    </div>
  </div>
`;
