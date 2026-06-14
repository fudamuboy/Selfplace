const db = require('../config/db');
const https = require('https');

// ---------------------------------------------------------------------------
// Apple verification URLs
// ---------------------------------------------------------------------------
const APPLE_VERIFY_URL_PROD    = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Apple status code 21007 means the receipt is a sandbox receipt sent to production.
// We retry automatically against sandbox in that case.
const APPLE_STATUS_SANDBOX_ON_PROD = 21007;

/**
 * POST body to Apple receipt verification.
 */
function buildApplePayload(receiptData) {
  return JSON.stringify({
    'receipt-data': receiptData,
    password: process.env.APPLE_SHARED_SECRET,
    'exclude-old-transactions': true,
  });
}

/**
 * Calls Apple's verifyReceipt endpoint and returns the parsed JSON body.
 */
function callAppleVerify(receiptData, useSandbox = false) {
  return new Promise((resolve, reject) => {
    const url   = useSandbox ? APPLE_VERIFY_URL_SANDBOX : APPLE_VERIFY_URL_PROD;
    const body  = buildApplePayload(receiptData);
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error(`Apple response parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy(new Error('Apple verifyReceipt timeout'));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Maps an Apple product ID to our internal plan type.
 */
function mapProductIdToPlan(productId) {
  if (productId === 'selfplace_signature_monthly') return 'signature';
  if (productId === 'selfplace_plus_monthly')      return 'plus';
  return 'free';
}

/**
 * Extract the most recent valid latest_receipt_info item for a given product.
 * Apple may return multiple items; we want the one with the latest expiry date.
 */
function extractLatestTransaction(latestReceiptInfo) {
  if (!Array.isArray(latestReceiptInfo) || latestReceiptInfo.length === 0) {
    return null;
  }
  // Sort descending by expires_date_ms
  const sorted = latestReceiptInfo.slice().sort(
    (a, b) => parseInt(b.expires_date_ms || '0') - parseInt(a.expires_date_ms || '0')
  );
  return sorted[0];
}

/**
 * Persists the validated subscription state to the database.
 */
async function persistSubscription(userId, {
  planType,
  isActive,
  expiresAt,
  appleOriginalTransactionId,
  appleProductId,
  receiptData,
  latestReceipt,
}) {
  // Check if a row exists
  const existing = await db.query(
    'SELECT id FROM subscription_status WHERE user_id = $1',
    [userId]
  );

  if (existing.rows.length === 0) {
    await db.query(
      `INSERT INTO subscription_status
         (user_id, plan_type, is_active, expires_at,
          apple_original_transaction_id, apple_product_id,
          apple_receipt_data, apple_latest_receipt, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [userId, planType, isActive, expiresAt,
       appleOriginalTransactionId, appleProductId,
       receiptData, latestReceipt]
    );
  } else {
    await db.query(
      `UPDATE subscription_status
       SET plan_type = $1, is_active = $2, expires_at = $3,
           apple_original_transaction_id = $4, apple_product_id = $5,
           apple_receipt_data = $6, apple_latest_receipt = $7,
           updated_at = NOW()
       WHERE user_id = $8`,
      [planType, isActive, expiresAt,
       appleOriginalTransactionId, appleProductId,
       receiptData, latestReceipt, userId]
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/subscriptions/verify
// ---------------------------------------------------------------------------
exports.verifyAppleReceipt = async (req, res) => {
  const userId = req.user.id;
  const { receiptData } = req.body;

  if (!receiptData) {
    return res.status(400).json({ message: 'receiptData zorunludur.' });
  }

  if (!process.env.APPLE_SHARED_SECRET) {
    console.error('[Subscription] APPLE_SHARED_SECRET environment variable is not set.');
    return res.status(500).json({ message: 'Sunucu yapılandırma hatası.' });
  }

  try {
    console.log(`[Subscription] Verifying Apple receipt for user ${userId}...`);

    // Step 1: Verify with Apple (production first, fall back to sandbox)
    const isProd = process.env.NODE_ENV === 'production';
    let appleResponse = await callAppleVerify(receiptData, !isProd);

    // Step 2: If sandbox receipt was sent to production, retry with sandbox
    if (isProd && appleResponse.status === APPLE_STATUS_SANDBOX_ON_PROD) {
      console.log('[Subscription] Sandbox receipt detected in production. Retrying against sandbox...');
      appleResponse = await callAppleVerify(receiptData, true);
    }

    const { status, latest_receipt_info, latest_receipt } = appleResponse;

    // Step 3: Non-zero status = Apple validation failure
    if (status !== 0) {
      console.warn(`[Subscription] Apple returned non-zero status: ${status} for user ${userId}`);
      return res.status(400).json({
        message: 'Apple abonelik doğrulaması başarısız oldu.',
        appleStatus: status,
      });
    }

    // Step 4: Extract the most recent transaction
    const latestTx = extractLatestTransaction(latest_receipt_info);

    if (!latestTx) {
      // No active subscription found — downgrade to free
      await persistSubscription(userId, {
        planType: 'free',
        isActive: false,
        expiresAt: null,
        appleOriginalTransactionId: null,
        appleProductId: null,
        receiptData,
        latestReceipt: latest_receipt || null,
      });

      return res.json({
        plan_type: 'free',
        is_active: false,
        expires_at: null,
      });
    }

    // Step 5: Check expiry
    const expiresMs = parseInt(latestTx.expires_date_ms || '0', 10);
    const expiresAt = expiresMs ? new Date(expiresMs).toISOString() : null;
    const isCancelled = !!latestTx.cancellation_date;
    const isExpired = expiresMs > 0 && Date.now() > expiresMs;
    const isActive = !isCancelled && !isExpired;

    const planType = isActive ? mapProductIdToPlan(latestTx.product_id) : 'free';

    console.log(`[Subscription] User ${userId}: plan=${planType}, active=${isActive}, expires=${expiresAt}, product=${latestTx.product_id}`);

    // Step 6: Persist to database
    await persistSubscription(userId, {
      planType,
      isActive,
      expiresAt,
      appleOriginalTransactionId: latestTx.original_transaction_id || null,
      appleProductId: latestTx.product_id || null,
      receiptData,
      latestReceipt: latest_receipt || null,
    });

    // Step 7: Respond to client
    return res.json({
      plan_type: planType,
      is_active: isActive,
      expires_at: expiresAt,
    });

  } catch (err) {
    console.error('[Subscription] verifyAppleReceipt error:', err.message);
    return res.status(500).json({ message: 'Abonelik doğrulanırken bir hata oluştu.' });
  }
};

// ---------------------------------------------------------------------------
// POST /api/subscriptions/restore
// ---------------------------------------------------------------------------
// Restore is semantically identical to verify — same receipt validation flow.
// We keep them as separate endpoints so the frontend can distinguish intent in logs.
exports.restorePurchases = async (req, res) => {
  // Delegate directly to the same logic
  return exports.verifyAppleReceipt(req, res);
};

// ---------------------------------------------------------------------------
// GET /api/subscriptions/status
// ---------------------------------------------------------------------------
// Lightweight status check used on app wake — no Apple round-trip required.
exports.getSubscriptionStatus = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await db.query(
      `SELECT plan_type, is_active, expires_at,
              apple_product_id, apple_original_transaction_id
       FROM subscription_status
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ plan_type: 'free', is_active: true, expires_at: null });
    }

    const row = result.rows[0];

    // Auto-expire check: if expires_at has passed, set is_active = false in DB
    if (row.expires_at && new Date(row.expires_at) < new Date() && row.is_active) {
      await db.query(
        `UPDATE subscription_status
         SET plan_type = 'free', is_active = false, updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
      return res.json({ plan_type: 'free', is_active: false, expires_at: row.expires_at });
    }

    return res.json(row);
  } catch (err) {
    console.error('[Subscription] getSubscriptionStatus error:', err.message);
    return res.status(500).json({ message: 'Abonelik durumu alınamadı.' });
  }
};
