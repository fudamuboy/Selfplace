// Pure subscription helpers — no database, no network, no Apple call.
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { _internal } = require('../controllers/subscriptionController');

const { mapProductIdToPlan, extractLatestTransaction } = _internal;

describe('mapProductIdToPlan', () => {
  it('maps the configured Selfplace products', () => {
    assert.strictEqual(mapProductIdToPlan('selfplace_signature_v2_monthly'), 'signature');
    assert.strictEqual(mapProductIdToPlan('selfplace_plus_v2_monthly'), 'plus');
  });

  it('never grants a plan for an unknown or foreign product', () => {
    assert.strictEqual(mapProductIdToPlan('com.other.app.premium'), 'free');
    assert.strictEqual(mapProductIdToPlan('selfplace_plus_monthly'), 'free'); // old / mistyped id
    assert.strictEqual(mapProductIdToPlan(undefined), 'free');
  });
});

describe('extractLatestTransaction', () => {
  it('returns null when Apple reports no subscription transaction', () => {
    assert.strictEqual(extractLatestTransaction([]), null);
    assert.strictEqual(extractLatestTransaction(undefined), null);
  });

  it('picks the transaction with the latest expiry, whatever the order', () => {
    const latest = extractLatestTransaction([
      { product_id: 'selfplace_plus_v2_monthly', expires_date_ms: '1000' },
      { product_id: 'selfplace_signature_v2_monthly', expires_date_ms: '3000' },
      { product_id: 'selfplace_plus_v2_monthly', expires_date_ms: '2000' },
    ]);
    assert.strictEqual(latest.product_id, 'selfplace_signature_v2_monthly');
    assert.strictEqual(latest.expires_date_ms, '3000');
  });

  it('does not mutate the array returned by Apple', () => {
    const input = [{ expires_date_ms: '1' }, { expires_date_ms: '2' }];
    extractLatestTransaction(input);
    assert.deepStrictEqual(input, [{ expires_date_ms: '1' }, { expires_date_ms: '2' }]);
  });
});
