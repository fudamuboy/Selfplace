const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const db = require('../config/db');
const authRoutes = require('../routes/authRoutes');
const crypto = require('crypto');

describe('Auth Integration Tests', () => {
  let server;
  let baseUrl;
  const testEmail = 'test_user_' + Math.random().toString(36).substring(7) + '@example.com';
  const testUsername = 'test_username_' + Math.random().toString(36).substring(7);
  const testPassword = 'SecurePassword123!';

  before(async () => {
    // 1. Clean up any existing test users in the DB
    await db.query("DELETE FROM users WHERE email LIKE 'test_user_%'");

    // 2. Setup mock express app
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    // 3. Start server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/auth`;
        console.log(`[TEST-SERVER] Running on ${baseUrl}`);
        resolve();
      });
    });
  });

  after(async () => {
    // 1. Clean up DB
    await db.query("DELETE FROM users WHERE email = $1 OR username = $2", [testEmail, testUsername]);
    
    // 2. Stop server
    if (server) {
      server.close();
    }
  });

  // --- REGISTRATION TESTS ---
  describe('POST /register', () => {
    test('Should successfully register a new user', async () => {
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          email: testEmail,
          password: testPassword,
          birth_date: '1996-08-20',
          accepted_terms: true
        })
      });

      const data = await response.json();
      assert.strictEqual(response.status, 201);
      assert.strictEqual(data.message, 'Kayıt başarılı.');
      assert.strictEqual(data.user.email, testEmail);
      assert.strictEqual(data.user.username, testUsername);
      assert.strictEqual(data.user.accepted_terms, true);
    });

    test('Should reject registration if terms are not accepted', async () => {
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'no_terms_user',
          email: 'no_terms@example.com',
          password: 'password123',
          accepted_terms: false
        })
      });

      const data = await response.json();
      assert.strictEqual(response.status, 400);
      assert.ok(data.message.includes('kabul etmelisiniz'));
    });

    test('Should reject registration if username or email is already taken', async () => {
      const response = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          email: testEmail,
          password: testPassword,
          accepted_terms: true
        })
      });

      const data = await response.json();
      assert.strictEqual(response.status, 400);
      assert.ok(data.message.includes('zaten kullanımda'));
    });
  });

  // --- LOGIN TESTS ---
  describe('POST /login', () => {
    test('Should successfully login with correct credentials', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        })
      });

      const data = await response.json();
      assert.strictEqual(response.status, 200);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, testEmail);
    });

    test('Should reject login with wrong password', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword123'
        })
      });

      const data = await response.json();
      assert.strictEqual(response.status, 400);
      assert.ok(data.message.includes('hatalı'));
    });

    test('Should reject login for non-existent user', async () => {
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ghost_user_999@example.com',
          password: 'password123'
        })
      });

      const data = await response.json();
      assert.strictEqual(response.status, 400);
      assert.ok(data.message.includes('hatalı'));
    });
  });

  // --- PASSWORD RESET TESTS ---
  describe('POST /forgot-password & /reset-password', () => {
    test('Should successfully trigger forgot password and update password', async () => {
      // 1. Call forgot-password
      const forgotResponse = await fetch(`${baseUrl}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });

      assert.strictEqual(forgotResponse.status, 200);

      // 2. Fetch the generated reset token from the DB manually for testing
      const userRes = await db.query('SELECT reset_password_token FROM users WHERE email = $1', [testEmail]);
      const hashedToken = userRes.rows[0]?.reset_password_token;
      assert.ok(hashedToken);

      // 3. Wait, forgotPassword generated a 6-digit code, but the database stores the SHA-256 hash of it.
      // Let's create a temporary token in DB to test the reset password endpoint directly.
      const rawToken = '123456';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
      await db.query(
        'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
        [tokenHash, expires, testEmail]
      );

      // 4. Call reset-password with this token
      const resetResponse = await fetch(`${baseUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken,
          newPassword: 'NewSecurePassword789!'
        })
      });

      const resetData = await resetResponse.json();
      assert.strictEqual(resetResponse.status, 200);
      assert.ok(resetData.message.includes('güncellendi'));

      // 5. Try logging in with the new password
      const loginResponse = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'NewSecurePassword789!'
        })
      });

      assert.strictEqual(loginResponse.status, 200);
    });

    test('Should reject password reset with invalid token', async () => {
      const response = await fetch(`${baseUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'wrong_token',
          newPassword: 'SomePassword123!'
        })
      });

      const data = await response.json();
      assert.strictEqual(response.status, 400);
      assert.ok(data.message.includes('Geçersiz veya süresi dolmuş'));
    });
  });
});
