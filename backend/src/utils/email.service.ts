import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.password,
  },
});

export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  if (!config.smtp.user || !config.smtp.password) {
    console.log('[EMAIL] SMTP not configured, skipping email:', options.subject, 'to:', options.to);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`✉️ [EMAIL SENT] Message ID: ${info.messageId} to ${options.to}`);
  } catch (err) {
    console.error(`❌ [EMAIL SEND FAILED] To ${options.to}:`, (err as Error).message);
    throw err;
  }
};

// ─── Email Templates ──────────────────────────────────

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f6f9; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .otp-box { background: #f0f4ff; border: 2px dashed #2563eb; border-radius: 12px; text-align: center; padding: 24px; margin: 24px 0; }
    .otp { font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #1e3a5f; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .critical { background: #fee2e2; border-left: 4px solid #ef4444; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 12px; }
    .btn { display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 ERP Operations Portal</h1>
      <p>Internal Business Management System</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>This is an automated message from the ERP Portal. Do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} ERP Operations Portal. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

export const sendOtpEmail = async (to: string, otp: string, purpose: string): Promise<void> => {
  const purposeMap: Record<string, string> = {
    EMAIL_VERIFICATION: 'Email Verification',
    PASSWORD_RESET: 'Password Reset',
    LOGIN_VERIFICATION: '2FA Login Verification',
  };
  const html = baseTemplate(`
    <h2 style="color:#1e3a5f;margin-top:0">Your Verification Code</h2>
    <p>You requested a verification code for <strong>${purposeMap[purpose] || purpose}</strong>.</p>
    <div class="otp-box">
      <p style="margin:0 0 8px;color:#64748b;font-size:14px">Your OTP</p>
      <div class="otp">${otp}</div>
    </div>
    <div class="alert">
      <strong>⏱ This OTP expires in 10 minutes.</strong><br/>
      Do not share this code with anyone. Our team will never ask for your OTP.
    </div>
    <p style="color:#64748b;font-size:14px">If you did not request this code, please ignore this email or contact your administrator.</p>
  `);
  await sendEmail({ to, subject: 'Your ERP Portal Verification Code', html });
};

export const sendLowStockEmail = async (
  to: string,
  productName: string,
  currentStock: number,
  minimumStock: number,
  imageUrl?: string
): Promise<void> => {
  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${productName}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; border: 1px solid #e2e8f0; vertical-align: middle; margin-right: 14px;" />`
    : '';

  const html = baseTemplate(`
    <h2 style="color:#f59e0b;margin-top:0">⚠️ Low Stock Alert</h2>
    <p>The following product has fallen below its minimum stock threshold:</p>
    <div class="alert" style="display: flex; align-items: center;">
      ${imageHtml}
      <div>
        <strong style="font-size: 16px; color: #1e293b;">${productName}</strong><br/>
        Current Stock: <strong>${currentStock}</strong> units<br/>
        Minimum Stock: <strong>${minimumStock}</strong> units
      </div>
    </div>
    <p>Please reorder stock to avoid fulfillment delays.</p>
  `);
  await sendEmail({ to, subject: `Low Stock Alert: ${productName}`, html });
};

export const sendCriticalStockEmail = async (
  to: string,
  productName: string,
  currentStock: number,
  minimumStock: number,
  imageUrl?: string
): Promise<void> => {
  const imageHtml = imageUrl
    ? `<img src="${imageUrl}" alt="${productName}" style="width: 70px; height: 70px; border-radius: 8px; object-fit: cover; border: 1px solid #fee2e2; vertical-align: middle; margin-right: 14px;" />`
    : '';

  const html = baseTemplate(`
    <h2 style="color:#ef4444;margin-top:0">🔴 Critical Stock Alert</h2>
    <p>A product has reached critically low stock levels and requires <strong>immediate attention</strong>:</p>
    <div class="alert critical" style="display: flex; align-items: center;">
      ${imageHtml}
      <div>
        <strong style="font-size: 16px; color: #1e293b;">${productName}</strong><br/>
        Current Stock: <strong>${currentStock}</strong> units<br/>
        Minimum Stock: <strong>${minimumStock}</strong> units<br/>
        <em>Stock is at ${Math.round((currentStock / minimumStock) * 100)}% of minimum threshold</em>
      </div>
    </div>
    <p>Please take immediate action to replenish this stock.</p>
  `);
  await sendEmail({ to, subject: `🔴 CRITICAL Stock Alert: ${productName}`, html });
};

export const sendChallanConfirmationEmail = async (
  to: string,
  challanNumber: string,
  customerName: string,
  totalQuantity: number
): Promise<void> => {
  const html = baseTemplate(`
    <h2 style="color:#1e3a5f;margin-top:0">✅ Challan Confirmed</h2>
    <p>A sales challan has been confirmed:</p>
    <table>
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Challan Number</td><td><strong>${challanNumber}</strong></td></tr>
      <tr><td>Customer</td><td>${customerName}</td></tr>
      <tr><td>Total Quantity</td><td>${totalQuantity} units</td></tr>
      <tr><td>Date</td><td>${new Date().toLocaleDateString('en-IN')}</td></tr>
    </table>
    <p>Stock has been deducted and inventory updated accordingly.</p>
  `);
  await sendEmail({ to, subject: `Challan Confirmed: ${challanNumber}`, html });
};

export const sendFollowupReminderEmail = async (
  to: string,
  customerName: string,
  followUpDate: Date,
  notes?: string
): Promise<void> => {
  const html = baseTemplate(`
    <h2 style="color:#1e3a5f;margin-top:0">📅 Follow-up Reminder</h2>
    <p>You have a follow-up due for:</p>
    <div class="alert">
      <strong>Customer:</strong> ${customerName}<br/>
      <strong>Due Date:</strong> ${followUpDate.toLocaleDateString('en-IN')}<br/>
      ${notes ? `<strong>Notes:</strong> ${notes}` : ''}
    </div>
    <p>Please action this follow-up as soon as possible.</p>
  `);
  await sendEmail({ to, subject: `Follow-up Reminder: ${customerName}`, html });
};
