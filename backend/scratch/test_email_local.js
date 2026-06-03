require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const mailOptions = {
  from: process.env.SMTP_FROM || `"Selfplace Test" <${process.env.SMTP_USER}>`,
  to: 'selfplace.support@gmail.com',
  subject: 'Selfplace Local SMTP Test',
  text: 'If you receive this, SMTP works locally!',
};

async function test() {
  console.log("Transporter config:", {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
  });

  try {
    console.log("Sending email...");
    const info = await transporter.sendMail(mailOptions);
    console.log("Success! Message sent:", info.messageId);
  } catch (err) {
    console.error("Local SMTP Error:", err.message);
  } finally {
    process.exit(0);
  }
}

test();
