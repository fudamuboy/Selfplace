const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email Transporter (Flexible SMTP configuration)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // Use explicit env variable
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.register = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user exists
    const userExist = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: 'Bu e-posta veya kullanıcı adı zaten kullanımda.' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashedPassword]
    );

    const user = newUser.rows[0];
    res.status(201).json({
      message: 'Kayıt başarılı.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ message: 'E-posta veya şifre hatalı.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userResult = await db.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [req.user.id]);
    res.json(userResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      // Don't reveal user doesn't exist
      return res.json({ message: 'Şifre sıfırlama bağlantısı e-posta adresine gönderildi.' });
    }

    const user = userRes.rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const hashedToken = crypto.createHash('sha256').update(resetCode).digest('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await db.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [hashedToken, expires, user.id]
    );

    const mailOptions = {
      from: process.env.SMTP_FROM || `"Selfplace" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Selfplace Şifre Sıfırlama Kodu',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9f9f9; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
             <h1 style="color: #6366f1; margin: 0; font-size: 28px;">Selfplace</h1>
             <p style="color: #666; font-size: 14px;">Kendine giden yolculuk</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #1f2937; margin-top: 0; text-align: center;">Şifre Sıfırlama Kodu</h2>
            <p style="color: #4b5563; line-height: 1.6; text-align: center;">Merhaba, şifrenizi yenilemek için aşağıdaki 6 haneli kodu uygulamaya girin:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 12px; text-align: center; margin: 30px 0;">
               <code style="font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 5px;">${resetCode}</code>
            </div>
            
            <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; text-align: center;">Bu kod 30 dakika boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız, bu e-postayı güvenle silebilirsiniz.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
            © 2026 Selfplace. Tüm hakları saklıdır.
          </div>
        </div>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email] Success! Message sent to ${user.email}`);
      console.log(`[Email] Message ID: ${info.messageId}`);
      console.log(`[Email] Accepted:`, info.accepted);
      if (info.rejected.length > 0) console.log(`[Email] Rejected:`, info.rejected);
    } catch (mailError) {
      console.error('[Email] SMTP Error:', mailError.message);
      console.log('----------------------------------------------------');
      console.log('DEVELOPMENT MODE: PASSWORD RESET LINK');
      console.log('Target Email:', user.email);
      console.log('Reset Link:', resetLink);
      console.log('----------------------------------------------------');
    }

    res.json({ message: 'Şifre sıfırlama bağlantısı e-posta adresine gönderildi.' });
  } catch (err) {
    console.error('[authController] forgotPassword error:', err.message);
    res.status(500).json({ message: 'Şifre sıfırlama işlemi sırasında bir hata oluştu.' });
  }
};

exports.testEmail = async (req, res) => {
  const { email } = req.body;
  console.log('--- SMTP DEBUG INFO ---');
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('-----------------------');

  const testOptions = {
    from: process.env.SMTP_FROM || `"Selfplace Test" <${process.env.SMTP_USER}>`,
    to: email || process.env.SMTP_USER,
    subject: 'Selfplace SMTP Test Email',
    text: 'If you receive this, your SMTP configuration is working correctly! ✨',
    html: '<b>If you receive this, your SMTP configuration is working correctly! ✨</b>'
  };

  try {
    const info = await transporter.sendMail(testOptions);
    res.json({ 
      message: 'Test email sent successfully!', 
      messageId: info.messageId,
      accepted: info.accepted 
    });
  } catch (err) {
    console.error('[testEmail] Error:', err.message);
    res.status(500).json({ message: 'Test email failed.', error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const userRes = await db.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2',
      [hashedToken, new Date()]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }

    const user = userRes.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Şifreniz başarıyla güncellendi.' });
  } catch (err) {
    console.error('[authController] resetPassword error:', err.message);
    res.status(500).json({ message: 'Şifre sıfırlanırken bir hata oluştu.' });
  }
};
