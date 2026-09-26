const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@abmindia.com";

let transporter = null;

function getTransporter() {
  if (!transporter && SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      tls: {
        ciphers: "SSLv3",
        rejectUnauthorized: false
      }
    });
  }
  return transporter;
}

function buildOtpEmailHtml(otp, purpose, toEmail) {
  const isSignup = purpose === "signup";
  const title = isSignup ? "Verify your email address" : "Your login verification code";
  const intro = isSignup
    ? "Welcome to <strong>ABM TaskIQ</strong>! Please use the One-Time Password (OTP) below to verify your email address and activate your account."
    : "We received a sign-in request for your <strong>ABM TaskIQ</strong> account. Use the verification code below to sign in.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 30px 32px; text-align: left;">
              <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">ABM TaskIQ</div>
              <div style="font-size: 12px; color: #93c5fd; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px;">Smart Task Guidance & Learning Platform</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">${title}</h2>
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
                ${intro}
              </p>
              <div style="background-color: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 22px 16px; text-align: center; margin: 24px 0;">
                <span style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Your 6-Digit One-Time Code</span>
                <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; display: inline-block;">${otp}</span>
                <div style="font-size: 12.5px; color: #64748b; margin-top: 10px;">
                  ⏳ Valid for <strong>10 minutes</strong> only
                </div>
              </div>
              <p style="font-size: 13.5px; line-height: 1.5; color: #64748b; margin: 0 0 16px;">
                Enter this verification code on the registration screen to complete your setup.
              </p>
              <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 6px; font-size: 12.5px; color: #78350f; line-height: 1.5;">
                <strong>Security note:</strong> Never share this OTP with anyone. ABM team members will never ask for your verification code. If you did not initiate this request, please disregard this email.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              This is an automated notification from ABM TaskIQ for <strong>${toEmail}</strong>.<br>
              &copy; 2026 ABM Knowledgeware. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function sendOtpEmail(toEmail, otp, purpose) {
  const isSignup = purpose === "signup";
  const subject = isSignup
    ? "ABM TaskIQ - Verify your email to complete registration"
    : "ABM TaskIQ - Your login verification code";
  const text = `Your ABM TaskIQ verification code is: ${otp}. It will expire in 10 minutes.`;
  const html = buildOtpEmailHtml(otp, purpose, toEmail);

  const client = getTransporter();

  if (!client) {
    console.log(`[EMAIL FALLBACK] To: ${toEmail} | Subject: ${subject} | OTP: ${otp}`);
    return { fallback: true };
  }

  try {
    await client.sendMail({
      from: `ABM TaskIQ <${SMTP_FROM}>`,
      to: toEmail,
      subject,
      text,
      html
    });
    console.log(`[EMAIL SENT] Successfully sent OTP to ${toEmail}`);
    return { fallback: false };
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send OTP to ${toEmail}:`, error);
    console.log(`[EMAIL FALLBACK DUE TO ERROR] To: ${toEmail} | OTP: ${otp}`);
    return { fallback: true, error: error.message };
  }
}

module.exports = {
  sendOtpEmail
};
