const nodemailer = require('nodemailer');

const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM || `"Selfplace" <${process.env.SMTP_USER}>`;

  // 1. Resend HTTP API (Port 443 - Never Blocked)
  if (process.env.RESEND_API_KEY) {
    try {
      console.log(`[EmailService] Sending email to ${to} via Resend HTTP API...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || from.replace(/<.*?>/, `<onboarding@resend.dev>`),
          to,
          subject,
          html,
          text,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || JSON.stringify(data));
      }

      console.log(`[EmailService] Resend Success! Message ID: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (err) {
      console.error('[EmailService] Resend HTTP Error:', err.message);
      throw err;
    }
  }

  // 2. SendGrid HTTP API (Port 443 - Never Blocked)
  if (process.env.SENDGRID_API_KEY) {
    try {
      console.log(`[EmailService] Sending email to ${to} via SendGrid HTTP API...`);
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.SENDGRID_FROM_EMAIL || 'support@selfplace.app', name: 'Selfplace' },
          subject,
          content: [
            { type: 'text/plain', value: text || 'Selfplace Email' },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      console.log(`[EmailService] SendGrid Success!`);
      return { success: true };
    } catch (err) {
      console.error('[EmailService] SendGrid HTTP Error:', err.message);
      throw err;
    }
  }

  // 3. SMTP Fallback (Perfect for local development)
  console.log(`[EmailService] Sending email to ${to} via SMTP transporter...`);
  const info = await smtpTransporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
  console.log(`[EmailService] SMTP Success! Message ID: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

module.exports = { sendEmail };
