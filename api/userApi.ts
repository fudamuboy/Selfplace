import client from './client';

// ─── Subscription types ────────────────────────────────────────────────────
export interface SubscriptionStatus {
  plan_type:   'free' | 'plus' | 'signature';
  is_active:   boolean;
  expires_at:  string | null;
}

// ─── GET /api/user/subscription (lightweight DB check, no Apple round-trip) ─
export const getSubscription = async (): Promise<SubscriptionStatus> => {
  const res = await client.get('/subscriptions/status');
  return res.data;
};

// ─── POST /api/subscriptions/verify ──────────────────────────────────────────
// Called after every successful Apple purchase.
// Backend validates the receipt with Apple and returns the confirmed plan.
export const verifyAppleReceipt = async (
  receiptData: string
): Promise<SubscriptionStatus> => {
  const res = await client.post('/subscriptions/verify', { receiptData });
  return res.data;
};

// ─── POST /api/subscriptions/restore ──────────────────────────────────────────
// Called by "Restore Purchases" — same backend logic as verify.
export const restorePurchases = async (
  receiptData: string
): Promise<SubscriptionStatus> => {
  const res = await client.post('/subscriptions/restore', { receiptData });
  return res.data;
};

// ─── PUT /api/user/subscription ─────────────────────────────────────────────
// ADMIN/TESTING ONLY — never called from the production purchase flow.
// Kept on backend for internal use. Not exposed to any user-facing UI.
export const updateSubscription = async (
  planType: 'free' | 'plus' | 'signature'
): Promise<{ message: string; subscription: SubscriptionStatus }> => {
  const res = await client.put('/user/subscription', { planType });
  return res.data;
};
