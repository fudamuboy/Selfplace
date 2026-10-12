/**
 * Purchase flow — StoreKit and the backend are mocked. No real purchase, no network.
 */
import useAuthStore from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';

const SIG = 'selfplace_signature_v2_monthly';
const RECEIPT = 'RECEIPT-BASE64-SENSITIVE';

// ─── react-native-iap mock: captures the listeners so tests can play StoreKit ───
let onPurchaseUpdated: ((p: any) => Promise<void> | void) | null = null;
let onPurchaseError: ((e: any) => void) | null = null;
const mockIap = {
  initConnection: jest.fn(async () => true),
  endConnection: jest.fn(async () => undefined),
  getSubscriptions: jest.fn(async () => [{ productId: SIG, platform: 'ios' }, { productId: 'selfplace_plus_v2_monthly', platform: 'ios' }]),
  requestSubscription: jest.fn(),
  finishTransaction: jest.fn(async () => undefined),
  getAvailablePurchases: jest.fn(async (): Promise<any[]> => []),
  purchaseUpdatedListener: jest.fn((cb: any) => { onPurchaseUpdated = cb; return { remove: jest.fn() }; }),
  purchaseErrorListener: jest.fn((cb: any) => { onPurchaseError = cb; return { remove: jest.fn() }; }),
};
// jest's moduleNameMapper maps both 'react-native' and 'react-native-iap' to the same mock module,
// so the factory provides Platform too and forwards lazily (mockIap is initialised after hoisting).
jest.mock('react-native-iap', () => ({
  Platform: { OS: 'ios' },
  initConnection: (...a: any[]) => (mockIap.initConnection as any)(...a),
  endConnection: (...a: any[]) => (mockIap.endConnection as any)(...a),
  getSubscriptions: (...a: any[]) => (mockIap.getSubscriptions as any)(...a),
  requestSubscription: (...a: any[]) => (mockIap.requestSubscription as any)(...a),
  finishTransaction: (...a: any[]) => (mockIap.finishTransaction as any)(...a),
  getAvailablePurchases: (...a: any[]) => (mockIap.getAvailablePurchases as any)(...a),
  purchaseUpdatedListener: (...a: any[]) => (mockIap.purchaseUpdatedListener as any)(...a),
  purchaseErrorListener: (...a: any[]) => (mockIap.purchaseErrorListener as any)(...a),
}));
jest.mock('expo-application', () => ({ applicationId: 'com.silmo.Selfplace' }));

const mockApi = {
  verifyAppleReceipt: jest.fn(),
  restorePurchases: jest.fn(),
};
jest.mock('../api/userApi', () => ({
  verifyAppleReceipt: (...a: any[]) => (mockApi.verifyAppleReceipt as any)(...a),
  restorePurchases: (...a: any[]) => (mockApi.restorePurchases as any)(...a),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: useSubscriptionStore, __resetPurchaseStateForTests } = require('../store/useSubscriptionStore');

const purchase = (overrides: Record<string, unknown> = {}) => ({
  productId: SIG, transactionId: '2000000123456789', transactionReceipt: RECEIPT, transactionDate: Date.now(), ...overrides,
});
const ACTIVE = { plan_type: 'signature', is_active: true, expires_at: '2099-01-01T00:00:00Z', environment: 'Sandbox' };
const FREE = { plan_type: 'free', is_active: false, expires_at: null };           // Apple shows no transaction
const EXPIRED = { plan_type: 'free', is_active: false, expires_at: '2020-01-01T00:00:00Z' };
const CANCELLED = { plan_type: 'free', is_active: false, expires_at: '2099-01-01T00:00:00Z' }; // refunded before expiry
const backendDown = Object.assign(new Error('Request failed'), { response: { status: 503 } });

/** A requestSubscription that stays open, like the Apple sheet waiting for the user. */
const pendingSheet = () => new Promise(() => {});
const flush = () => new Promise((r) => setTimeout(r, 0));
const state = () => useSubscriptionStore.getState();

let logSpy: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  onPurchaseUpdated = null;
  onPurchaseError = null;
  __resetPurchaseStateForTests();
  useLanguageStore.setState({ language: 'en' });
  useAuthStore.setState({ planType: 'free' });
  useSubscriptionStore.setState({
    purchaseLoading: false, purchaseError: null, purchaseNotice: null, verificationPending: false,
    restoreLoading: false, restoreMessage: null,
  });
  await state().initIAP();
});

afterEach(() => {
  // Diagnostics must never contain the receipt
  const logged = JSON.stringify(logSpy.mock.calls);
  expect(logged).not.toContain(RECEIPT);
  jest.restoreAllMocks();
});

describe('purchase flow', () => {
  test('successful purchase: Premium only after backend verification, then transaction finished', async () => {
    mockIap.requestSubscription.mockImplementation(pendingSheet);
    mockApi.verifyAppleReceipt.mockResolvedValue(ACTIVE);

    state().purchasePlan(SIG);
    expect(useAuthStore.getState().planType).toBe('free'); // nothing granted on tap
    expect(state().purchaseLoading).toBe(true);

    await onPurchaseUpdated!(purchase());

    expect(mockApi.verifyAppleReceipt).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().planType).toBe('signature');
    expect(mockIap.finishTransaction).toHaveBeenCalledTimes(1);
    expect(state().purchaseLoading).toBe(false);
    expect(state().purchaseError).toBeNull();
    expect(state().purchaseNotice).toContain('Selfplace Signature');
  });

  test('rapid double tap starts only one purchase request', async () => {
    mockIap.requestSubscription.mockImplementation(pendingSheet);
    state().purchasePlan(SIG);
    state().purchasePlan(SIG);
    state().purchasePlan(SIG);
    await flush();
    expect(mockIap.requestSubscription).toHaveBeenCalledTimes(1);
  });

  test('Apple success + backend failure: no failure message, transaction kept, retry without buying again', async () => {
    mockIap.requestSubscription.mockImplementation(pendingSheet);
    mockApi.verifyAppleReceipt.mockRejectedValueOnce(backendDown);

    state().purchasePlan(SIG);
    await onPurchaseUpdated!(purchase());

    expect(useAuthStore.getState().planType).toBe('free');
    expect(mockIap.finishTransaction).not.toHaveBeenCalled(); // retryable
    expect(state().verificationPending).toBe(true);
    expect(state().purchaseError).toBeNull();
    expect(state().purchaseLoading).toBe(false);

    // Tapping the button again verifies the existing purchase — it never opens a new payment
    mockApi.verifyAppleReceipt.mockResolvedValueOnce(ACTIVE);
    await state().purchasePlan(SIG);
    expect(mockIap.requestSubscription).toHaveBeenCalledTimes(1);
    expect(mockIap.getAvailablePurchases).not.toHaveBeenCalled();
    expect(useAuthStore.getState().planType).toBe('signature');
    expect(mockIap.finishTransaction).toHaveBeenCalledTimes(1);
    expect(state().verificationPending).toBe(false);
  });

  test('retry while the backend is still down stays pending and does not query StoreKit', async () => {
    mockIap.requestSubscription.mockImplementation(pendingSheet);
    mockApi.verifyAppleReceipt.mockRejectedValue(backendDown);
    state().purchasePlan(SIG);
    await onPurchaseUpdated!(purchase());

    await state().retryVerification();
    expect(mockIap.getAvailablePurchases).not.toHaveBeenCalled();
    expect(state().verificationPending).toBe(true);
    expect(useAuthStore.getState().planType).toBe('free');
  });

  test('backend returns Free after a purchase: not granted, kept retryable, explained', async () => {
    mockIap.requestSubscription.mockImplementation(pendingSheet);
    mockApi.verifyAppleReceipt.mockResolvedValue(FREE);

    state().purchasePlan(SIG);
    await onPurchaseUpdated!(purchase());

    expect(useAuthStore.getState().planType).toBe('free');
    expect(mockIap.finishTransaction).not.toHaveBeenCalled();
    expect(state().verificationPending).toBe(true);
    expect(state().purchaseNotice).toMatch(/doesn’t show an active subscription/);
    expect(state().purchaseError).toBeNull();
  });

  test('already-owned subscription (E_UNKNOWN): verifies the owned purchase instead of reporting a failure', async () => {
    mockIap.requestSubscription.mockRejectedValue({ code: 'E_UNKNOWN', message: 'An unknown error occurred' });
    mockIap.getAvailablePurchases.mockResolvedValue([purchase({ transactionId: 'owned-1' })]);
    mockApi.verifyAppleReceipt.mockResolvedValue(ACTIVE);

    const done = state().purchasePlan(SIG);
    onPurchaseError!({ code: 'E_UNKNOWN', message: 'An unknown error occurred' }); // event + promise rejection
    await done;
    await flush();

    expect(mockIap.getAvailablePurchases).toHaveBeenCalledTimes(1);
    expect(mockApi.verifyAppleReceipt).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().planType).toBe('signature');
    expect(state().purchaseError).toBeNull();
    expect(state().purchaseNotice).toMatch(/already active/);
  });

  test('E_ALREADY_OWNED also verifies the owned subscription', async () => {
    mockIap.requestSubscription.mockRejectedValue({ code: 'E_ALREADY_OWNED' });
    mockIap.getAvailablePurchases.mockResolvedValue([purchase({ transactionId: 'owned-2' })]);
    mockApi.verifyAppleReceipt.mockResolvedValue(ACTIVE);

    await state().purchasePlan(SIG);
    expect(mockIap.getAvailablePurchases).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().planType).toBe('signature');
    expect(state().purchaseError).toBeNull();
  });

  test.each(['E_NETWORK_ERROR', 'E_ITEM_UNAVAILABLE', 'E_SERVICE_ERROR', 'E_REMOTE_ERROR'])(
    '%s is reported without any StoreKit lookup (no Apple ID prompt)',
    async (code) => {
      mockIap.requestSubscription.mockRejectedValue({ code });
      const done = state().purchasePlan(SIG);
      onPurchaseError!({ code });
      await done;
      await flush();

      expect(mockIap.getAvailablePurchases).not.toHaveBeenCalled();
      expect(mockApi.verifyAppleReceipt).not.toHaveBeenCalled();
      expect(state().purchaseError).toBe(`The purchase failed: Code: ${code}`);
      expect(state().purchaseLoading).toBe(false);
      expect(useAuthStore.getState().planType).toBe('free');
    }
  );

  test('genuine failure (E_UNKNOWN and nothing owned) is reported once, with its code', async () => {
    mockIap.requestSubscription.mockRejectedValue({ code: 'E_UNKNOWN', message: 'x' });
    mockIap.getAvailablePurchases.mockResolvedValue([]);

    await state().purchasePlan(SIG);
    expect(state().purchaseError).toBe('The purchase failed: Code: E_UNKNOWN');
    expect(useAuthStore.getState().planType).toBe('free');
    expect(state().purchaseLoading).toBe(false);
  });

  test('stray StoreKit error with no purchase in flight never shows a failure nor triggers a restore', async () => {
    onPurchaseError!({ code: 'E_UNKNOWN', message: 'x' });
    await flush();
    expect(state().purchaseError).toBeNull();
    expect(mockIap.getAvailablePurchases).not.toHaveBeenCalled();
  });

  test('user cancellation is silent and releases the guard', async () => {
    mockIap.requestSubscription.mockRejectedValueOnce({ code: 'E_USER_CANCELLED' });
    const done = state().purchasePlan(SIG);
    onPurchaseError!({ code: 'E_USER_CANCELLED' });
    await done;

    expect(state().purchaseError).toBeNull();
    expect(state().purchaseLoading).toBe(false);
    expect(mockApi.verifyAppleReceipt).not.toHaveBeenCalled();

    mockIap.requestSubscription.mockImplementation(pendingSheet);
    state().purchasePlan(SIG);
    expect(mockIap.requestSubscription).toHaveBeenCalledTimes(2); // a new attempt is allowed
  });

  test('deferred (Ask to Buy) purchase: nothing granted, user informed', async () => {
    mockIap.requestSubscription.mockRejectedValueOnce({ code: 'E_DEFERRED_PAYMENT' });
    const done = state().purchasePlan(SIG);
    onPurchaseError!({ code: 'E_DEFERRED_PAYMENT' });
    await done;

    expect(useAuthStore.getState().planType).toBe('free');
    expect(mockApi.verifyAppleReceipt).not.toHaveBeenCalled();
    expect(state().purchaseNotice).toMatch(/awaiting approval/);
    expect(state().purchaseError).toBeNull();
  });

  test('duplicate delivery of the same transaction is verified once', async () => {
    mockIap.requestSubscription.mockImplementation(pendingSheet);
    let resolveVerify: (v: any) => void = () => {};
    mockApi.verifyAppleReceipt.mockImplementation(() => new Promise((r) => { resolveVerify = r; }));

    state().purchasePlan(SIG);
    const first = onPurchaseUpdated!(purchase());
    const second = onPurchaseUpdated!(purchase()); // same transaction delivered again while verifying
    resolveVerify(ACTIVE);
    await Promise.all([first, second]);
    await onPurchaseUpdated!(purchase()); // and once more after it was verified

    expect(mockApi.verifyAppleReceipt).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().planType).toBe('signature');
    expect(state().purchaseError).toBeNull();
  });

  test('re-delivered at launch and provably expired: not granted, closed out, no message', async () => {
    mockApi.verifyAppleReceipt.mockResolvedValue(EXPIRED);
    await onPurchaseUpdated!(purchase({ transactionId: 'old-renewal' })); // no purchase in flight

    expect(useAuthStore.getState().planType).toBe('free');
    expect(mockIap.finishTransaction).toHaveBeenCalledTimes(1);
    expect(state().verificationPending).toBe(false);
    expect(state().purchaseNotice).toBeNull();
  });

  test('re-delivered at launch, Apple shows no transaction: kept unfinished and retried on next delivery', async () => {
    mockApi.verifyAppleReceipt.mockResolvedValueOnce(FREE);
    await onPurchaseUpdated!(purchase({ transactionId: 'maybe-valid' }));

    expect(useAuthStore.getState().planType).toBe('free');
    expect(mockIap.finishTransaction).not.toHaveBeenCalled(); // never closed on an inconclusive answer
    expect(state().verificationPending).toBe(false);          // nothing bought this session: no banner
    expect(state().purchaseNotice).toBeNull();

    // Next launch: StoreKit delivers it again and Apple now reports it active
    mockApi.verifyAppleReceipt.mockResolvedValueOnce(ACTIVE);
    await onPurchaseUpdated!(purchase({ transactionId: 'maybe-valid' }));
    expect(mockApi.verifyAppleReceipt).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().planType).toBe('signature');
    expect(mockIap.finishTransaction).toHaveBeenCalledTimes(1);
  });

  test('re-delivered at launch, cancelled before expiry: not granted and not closed out', async () => {
    mockApi.verifyAppleReceipt.mockResolvedValue(CANCELLED);
    await onPurchaseUpdated!(purchase({ transactionId: 'refunded' }));

    expect(useAuthStore.getState().planType).toBe('free');
    expect(mockIap.finishTransaction).not.toHaveBeenCalled();
    expect(state().verificationPending).toBe(false);
  });

  test('just-bought purchase answered "expired" stays pending (receipt not updated yet)', async () => {
    mockIap.requestSubscription.mockImplementation(pendingSheet);
    mockApi.verifyAppleReceipt.mockResolvedValue(EXPIRED);
    state().purchasePlan(SIG);
    await onPurchaseUpdated!(purchase());

    expect(mockIap.finishTransaction).not.toHaveBeenCalled();
    expect(state().verificationPending).toBe(true);
    expect(useAuthStore.getState().planType).toBe('free');
  });

  test('unknown product delivered by StoreKit is ignored', async () => {
    await onPurchaseUpdated!(purchase({ productId: 'com.other.app.product' }));
    expect(mockApi.verifyAppleReceipt).not.toHaveBeenCalled();
    expect(useAuthStore.getState().planType).toBe('free');
  });

  test('purchase guard is released after the timeout', async () => {
    jest.useFakeTimers();
    try {
      mockIap.requestSubscription.mockImplementation(pendingSheet);
      state().purchasePlan(SIG);
      jest.advanceTimersByTime(3 * 60 * 1000 + 1);
      expect(state().purchaseLoading).toBe(false);
      state().purchasePlan(SIG);
      expect(mockIap.requestSubscription).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('restore purchases', () => {
  test('restored transaction goes through server verification', async () => {
    mockIap.getAvailablePurchases.mockResolvedValue([purchase({ transactionId: 'restored-1' })]);
    mockApi.restorePurchases.mockResolvedValue(ACTIVE);

    await state().restorePurchases();
    expect(mockApi.restorePurchases).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().planType).toBe('signature');
    expect(state().restoreMessage).toBe('Your Selfplace Signature subscription has been restored ✨');
  });

  test('nothing to restore', async () => {
    mockIap.getAvailablePurchases.mockResolvedValue([]);
    await state().restorePurchases();
    expect(state().restoreMessage).toBe('No active subscription was found to restore.');
    expect(useAuthStore.getState().planType).toBe('free');
  });

  test('restore with an expired subscription grants nothing', async () => {
    mockIap.getAvailablePurchases.mockResolvedValue([purchase({ transactionId: 'expired-1' })]);
    mockApi.restorePurchases.mockResolvedValue(EXPIRED);
    await state().restorePurchases();
    expect(state().restoreMessage).toBe('No active subscription was found.');
    expect(useAuthStore.getState().planType).toBe('free');
  });

  test('restore while the backend is down keeps the purchase pending for a retry', async () => {
    mockIap.getAvailablePurchases.mockResolvedValue([purchase({ transactionId: 'restored-2' })]);
    mockApi.restorePurchases.mockRejectedValue(backendDown);
    await state().restorePurchases();
    expect(state().restoreMessage).toBe('Restore failed. Please try again.');
    expect(state().verificationPending).toBe(true);
    expect(useAuthStore.getState().planType).toBe('free');
  });
});
