const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@abmindia.com";

let transporter = null;

if (SMTP_HOST && SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

async function sendOtpEmail(toEmail, otp, purpose) {
  const subject = purpose === "signup" ? "Verify your email to create your account" : "Your login OTP";
  const text = `Your OTP is ${otp}. It will expire in 10 minutes.`;
  const html = `<p>Your OTP is <strong>${otp}</strong>.</p><p>It will expire in 10 minutes.</p>`;

  if (!transporter) {
    console.log(`[EMAIL FALLBACK] To: ${toEmail} | Subject: ${subject} | OTP: ${otp}`);
    return { fallback: true };
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject,
    text,
    html
  });

  return { fallback: false };
}

module.exports = {
  sendOtpEmail
};
