import { create } from 'zustand';
import {
  initConnection,
  endConnection,
  getSubscriptions,
  requestSubscription,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getAvailablePurchases,
  type Subscription,
  type SubscriptionAndroid,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import useAuthStore from './useAuthStore';
import { verifyAppleReceipt, restorePurchases as restoreFromBackend, type SubscriptionStatus } from '../api/userApi';
import * as Application from 'expo-application';
import { t } from '../i18n';

// ─── Apple product IDs — must match App Store Connect exactly ────────────────
export const IAP_PRODUCT_IDS = {
  plus:      'selfplace_plus_v2_monthly',
  signature: 'selfplace_signature_v2_monthly',
};

export const ALL_PRODUCT_IDS = [IAP_PRODUCT_IDS.plus, IAP_PRODUCT_IDS.signature];

// ─── Store interface ──────────────────────────────────────────────────────────
interface SubscriptionState {
  availableProducts:   Subscription[];
  productsLoading:     boolean;
  purchaseLoading:     boolean;
  purchaseError:       string | null;
  /** Neutral / positive purchase information (activated, already active, deferred…). */
  purchaseNotice:      string | null;
  /** Apple confirmed a purchase the backend has not verified yet. Buying again is never needed. */
  verificationPending: boolean;
  restoreLoading:      boolean;
  restoreMessage:      string | null;
  iapConnected:        boolean;
  iapReady:            boolean;
  productsLoaded:      boolean;
  storeUnavailable:    boolean;

  initIAP:             () => Promise<void>;
  teardownIAP:         () => void;
  purchasePlan:        (productId: string) => Promise<void>;
  retryVerification:   () => Promise<void>;
  restorePurchases:    () => Promise<void>;
  clearPurchaseError:  () => void;
  clearRestoreMessage: () => void;
}

// ─── Purchase flow state, kept outside Zustand ───────────────────────────────
// Read and written synchronously, so a second tap is rejected before React even re-renders.
let purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
let purchaseErrorSub:  ReturnType<typeof purchaseErrorListener>   | null = null;

const PURCHASE_TIMEOUT_MS = 3 * 60 * 1000;
let attemptCounter = 0;
let purchaseInFlight: { productId: string; attempt: number } | null = null;
let purchaseTimeout: ReturnType<typeof setTimeout> | null = null;
let errorHandledForAttempt = -1;

const transactionsInProgress = new Set<string>();       // being verified right now
const verifiedTransactions   = new Set<string>();       // verified + finished in this session
const pendingVerification    = new Map<string, Purchase>(); // Apple-confirmed, backend not yet: left unfinished
let syncInProgress = false;

type VerifySource  = 'purchase' | 'redelivery' | 'sync' | 'restore';
/** 'expired': Apple's latest known expiry for the subscription is in the past — provably not a valid purchase. */
type VerifyOutcome = 'verified' | 'expired' | 'not_active' | 'failed' | 'duplicate';
type SyncOutcome   = 'verified' | 'not_active' | 'none' | 'failed' | 'busy';

const isAndroid = () => Platform.OS === 'android';

// StoreKit errors that can mean "you already own this subscription" (Apple shows "You're currently
// subscribed to this"). Only these justify a StoreKit lookup, which may prompt for the Apple ID.
const OWNED_CHECK_ERROR_CODES = ['E_UNKNOWN', 'E_ALREADY_OWNED'];

/** Privacy-safe diagnostics: event names, product IDs, codes and a short transaction suffix only. */
function iapLog(event: string, details: Record<string, unknown> = {}) {
  console.log(`[IAP] ${event}`, details);
}

function transactionKey(purchase: Purchase): string | null {
  return purchase.transactionId || purchase.purchaseToken || null;
}

/** Last characters only: enough to correlate logs, never the full identifier. */
function shortTx(purchase: Purchase): string {
  const key = transactionKey(purchase);
  return key ? `…${key.slice(-6)}` : 'none';
}

function hasVerifiablePayload(purchase: Purchase): boolean {
  return isAndroid() ? !!purchase.purchaseToken : !!purchase.transactionReceipt;
}

function planLabel(plan: SubscriptionStatus['plan_type']): string {
  return plan === 'signature' ? 'Selfplace Signature' : 'Selfplace Plus';
}

function releasePurchaseGuard(reason: string) {
  if (purchaseTimeout) clearTimeout(purchaseTimeout);
  purchaseTimeout = null;
  if (purchaseInFlight) iapLog('purchase_guard_released', { reason, product: purchaseInFlight.productId });
  purchaseInFlight = null;
}

async function safeFinish(purchase: Purchase) {
  try {
    await finishTransaction({ purchase, isConsumable: false });
    iapLog('transaction_finished', { product: purchase.productId, tx: shortTx(purchase) });
  } catch (err: any) {
    // Restored / already-finished transactions may no longer be in the StoreKit queue
    iapLog('transaction_finish_skipped', { product: purchase.productId, tx: shortTx(purchase), code: err?.code });
  }
}

/**
 * The single verification path for every purchase source: Premium is granted only when the
 * backend confirms an active, unexpired entitlement with Apple / Google.
 */
async function verifyAndFinish(purchase: Purchase, source: VerifySource): Promise<VerifyOutcome> {
  const key = transactionKey(purchase);
  if (key && verifiedTransactions.has(key)) {
    iapLog('verification_skipped_duplicate', { source, product: purchase.productId, tx: shortTx(purchase) });
    await safeFinish(purchase);
    return 'duplicate';
  }
  if (key && transactionsInProgress.has(key)) {
    iapLog('verification_skipped_in_progress', { source, product: purchase.productId, tx: shortTx(purchase) });
    return 'duplicate';
  }
  if (key) transactionsInProgress.add(key);

  try {
    iapLog('verification_started', { source, product: purchase.productId, tx: shortTx(purchase) });
    const verify = source === 'restore' ? restoreFromBackend : verifyAppleReceipt;
    const result = await verify(
      isAndroid() ? '' : (purchase.transactionReceipt as string),
      isAndroid() ? 'android' : 'ios',
      isAndroid() ? purchase.purchaseToken : undefined,
      isAndroid() ? purchase.productId : undefined
    );

    if (result.is_active && result.plan_type !== 'free') {
      useAuthStore.getState().setPlanType(result.plan_type);
      iapLog('entitlement_updated', { plan: result.plan_type, environment: (result as any).environment ?? 'unknown' });
      await safeFinish(purchase);
      if (key) {
        verifiedTransactions.add(key);
        pendingVerification.delete(key);
      }
      return 'verified';
    }

    // Inactive. It is provably dead only if Apple's latest known expiry (the most recent renewal of the
    // subscription) is in the past: a renewal would be a new transaction. Otherwise (no transaction found,
    // or cancelled before expiry) the answer is inconclusive.
    const expiresMs = result.expires_at ? Date.parse(result.expires_at) : NaN;
    const expired = Number.isFinite(expiresMs) && expiresMs < Date.now();
    iapLog('verification_not_active', { source, product: purchase.productId, plan: result.plan_type, expired });
    return expired ? 'expired' : 'not_active';
  } catch (err: any) {
    // Backend unreachable / Apple validation error: keep the transaction UNFINISHED so it can be retried
    // (StoreKit also re-delivers it on the next launch). The user is never asked to pay again.
    iapLog('verification_failed', { source, product: purchase.productId, tx: shortTx(purchase), status: err?.response?.status ?? null });
    if (key) pendingVerification.set(key, purchase);
    return 'failed';
  } finally {
    if (key) transactionsInProgress.delete(key);
  }
}

/**
 * Verifies a purchase Apple already holds for this account: first the transactions we kept
 * unfinished, then StoreKit's owned purchases. getAvailablePurchases() restores completed
 * transactions and can prompt for the Apple ID, so this only runs on an explicit user action.
 */
async function syncExistingPurchase(source: 'sync' | 'restore'): Promise<SyncOutcome> {
  if (syncInProgress) return 'busy';
  syncInProgress = true;
  try {
    for (const purchase of Array.from(pendingVerification.values())) {
      const outcome = await verifyAndFinish(purchase, source);
      if (outcome === 'verified' || outcome === 'duplicate') return 'verified';
      // Backend still unreachable: asking StoreKit again would not help (and may prompt for the Apple ID)
      if (outcome === 'failed') return 'failed';
      pendingVerification.delete(transactionKey(purchase) ?? '');
    }

    iapLog('owned_purchases_lookup', { source });
    const purchases = await getAvailablePurchases();
    const latest = (purchases || [])
      .filter((p) => ALL_PRODUCT_IDS.includes(p.productId) && hasVerifiablePayload(p))
      .sort((a, b) => (b.transactionDate ?? 0) - (a.transactionDate ?? 0))[0];

    if (!latest) {
      iapLog('owned_purchases_none', { source });
      return 'none';
    }
    const outcome = await verifyAndFinish(latest, source);
    if (outcome === 'verified' || outcome === 'duplicate') return 'verified';
    return outcome === 'expired' ? 'not_active' : outcome;
  } catch (err: any) {
    iapLog('owned_purchases_lookup_failed', { source, code: err?.code ?? null });
    return 'failed';
  } finally {
    syncInProgress = false;
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────
const useSubscriptionStore = create<SubscriptionState>((set, get) => {
  const refreshPendingFlag = () => set({ verificationPending: pendingVerification.size > 0 });

  /** One handler for StoreKit errors from both the error event and the rejected purchase promise. */
  const handlePurchaseError = async (code: string | undefined) => {
    const attempt = purchaseInFlight?.attempt ?? null;
    if (attempt !== null) {
      if (errorHandledForAttempt === attempt) return; // event + promise rejection for the same attempt
      errorHandledForAttempt = attempt;
    }
    iapLog('storekit_error', { code: code ?? 'none', inFlight: attempt !== null });

    if (code === 'E_USER_CANCELLED') {
      releasePurchaseGuard('cancelled');
      set({ purchaseLoading: false, purchaseError: null });
      return;
    }

    if (code === 'E_DEFERRED_PAYMENT') {
      releasePurchaseGuard('deferred');
      set({ purchaseLoading: false, purchaseError: null, purchaseNotice: t('subscription.deferred') });
      return;
    }

    // An error with no purchase in flight (a stale or queued transaction, or the second notification of an
    // attempt already handled) must never overwrite the current state with "purchase failed", nor trigger
    // a StoreKit restore the user did not ask for.
    if (attempt === null) {
      iapLog('storekit_error_ignored_no_purchase_in_flight', { code: code ?? 'none' });
      return;
    }

    releasePurchaseGuard(`error_${code ?? 'none'}`);
    const failedMessage = t('subscription.purchaseFailed', { details: `Code: ${code ?? 'E_UNKNOWN'}` });

    // Network, product-availability and other errors: report them, without any StoreKit lookup
    if (!OWNED_CHECK_ERROR_CODES.includes(code ?? 'E_UNKNOWN')) {
      set({ purchaseLoading: false, purchaseError: failedMessage });
      return;
    }

    // E_UNKNOWN / E_ALREADY_OWNED: Apple may already hold an active subscription.
    // Verify it instead of reporting a failure.
    set({ purchaseLoading: true, purchaseError: null });
    const outcome = await syncExistingPurchase('sync');
    refreshPendingFlag();

    if (outcome === 'verified') {
      set({ purchaseLoading: false, purchaseNotice: t('subscription.alreadyActive') });
    } else if (outcome === 'failed') {
      set({ purchaseLoading: false, purchaseNotice: null });
    } else if (outcome === 'busy') {
      set({ purchaseLoading: false });
    } else {
      set({ purchaseLoading: false, purchaseError: failedMessage });
    }
  };

  return {
    availableProducts:   [],
    productsLoading:     false,
    purchaseLoading:     false,
    purchaseError:       null,
    purchaseNotice:      null,
    verificationPending: false,
    restoreLoading:      false,
    restoreMessage:      null,
    iapConnected:        false,
    iapReady:            false,
    productsLoaded:      false,
    storeUnavailable:    false,

    // ── initIAP ────────────────────────────────────────────────────────────────
    initIAP: async () => {
      try {
        if (__DEV__) console.log('[Store] Starting initIAP...');
        set({
          productsLoading: true,
          purchaseError: null,
          iapReady: false,
          productsLoaded: false,
          storeUnavailable: false
        });

        let connected = false;
        try {
          if (__DEV__) console.log('[StoreKit] Calling initConnection()...');
          connected = await initConnection();
          if (__DEV__) console.log('[StoreKit] initConnection() result:', connected);
          set({ iapConnected: connected, iapReady: connected });
        } catch (connErr: any) {
          console.warn('[StoreKit Debug] initConnection() failed:', connErr, connErr.stack);
          set({
            productsLoading: false,
            iapConnected: false,
            iapReady: false,
            storeUnavailable: true,
            purchaseError: `initConnection error: ${connErr?.message || JSON.stringify(connErr)}`
          });
          return;
        }

        // ── Set up listeners BEFORE getSubscriptions to catch pending transactions
        purchaseUpdateSub?.remove();
        purchaseErrorSub?.remove();

        purchaseUpdateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
          const userInitiated = !!purchaseInFlight && purchaseInFlight.productId === purchase.productId;
          iapLog('storekit_purchased', { product: purchase.productId, tx: shortTx(purchase), userInitiated });

          if (!ALL_PRODUCT_IDS.includes(purchase.productId)) {
            iapLog('storekit_purchased_ignored_unknown_product', { product: purchase.productId });
            return;
          }
          if (!hasVerifiablePayload(purchase)) {
            iapLog('storekit_purchased_without_receipt', { product: purchase.productId });
            if (userInitiated) {
              releasePurchaseGuard('no_receipt');
              set({ purchaseLoading: false });
            }
            return;
          }

          set({ purchaseLoading: true, purchaseError: null });
          const outcome = await verifyAndFinish(purchase, userInitiated ? 'purchase' : 'redelivery');

          if (outcome === 'verified') {
            const plan = useAuthStore.getState().planType;
            set({ purchaseNotice: userInitiated && plan !== 'free' ? t('subscription.activated', { plan: planLabel(plan) }) : null });
          } else if (outcome === 'not_active' || outcome === 'expired') {
            if (userInitiated) {
              // Just bought, but Apple does not report it as active yet: keep it unfinished and retryable
              const key = transactionKey(purchase);
              if (key) pendingVerification.set(key, purchase);
              set({ purchaseNotice: t('subscription.notActiveYet') });
            } else if (outcome === 'expired') {
              // Re-delivered at launch and provably expired: safe to close out
              await safeFinish(purchase);
            } else {
              // Re-delivered at launch, answer inconclusive: keep it unfinished (StoreKit re-delivers it on
              // the next launch, Restore can pick it up). No banner: nothing was bought in this session.
              iapLog('redelivered_transaction_kept_unfinished', { product: purchase.productId, tx: shortTx(purchase) });
            }
          }
          // 'failed' → verificationPending banner; 'duplicate' → nothing to change

          refreshPendingFlag();
          if (userInitiated) releasePurchaseGuard(`purchase_${outcome}`);
          set({ purchaseLoading: false });
        });

        purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
          handlePurchaseError((error as any).code);
        });

        const runtimeBundleId = Application.applicationId || 'Unknown';
        if (__DEV__) console.log('[StoreKit] Bundle ID:', runtimeBundleId);
        if (__DEV__) console.log('[StoreKit] Fetching subscriptions for SKUs:', ALL_PRODUCT_IDS);

        // Fetch localised subscription product info from Apple
        try {
          const raw = await getSubscriptions({ skus: ALL_PRODUCT_IDS });
          if (__DEV__) console.log('[StoreKit] getSubscriptions() response count:', raw ? raw.length : 0);

          if (!raw || raw.length === 0) {
            console.warn('[StoreKit Debug] getSubscriptions returned empty array.');
            set({
              productsLoading: false,
              productsLoaded: true,
              storeUnavailable: true,
              purchaseError: t('subscription.storeUnavailable')
            });
            return;
          }

          // Filter products based on current platform
          const products = (raw as Subscription[]).filter(
            (p) => p.platform === (Platform.OS === 'android' ? 'android' : 'ios')
          );
          if (__DEV__) console.log('[Store] Filtered products count:', products.length);

          if (products.length === 0 && raw.length > 0) {
            console.warn('[Store Debug] All products filtered out (not matching platform).');
            set({
              productsLoading: false,
              productsLoaded: true,
              storeUnavailable: true,
              purchaseError: t('subscription.storeUnavailable')
            });
            return;
          }

          set({
            availableProducts: products,
            productsLoading: false,
            productsLoaded: true,
            storeUnavailable: false
          });
        } catch (subErr: any) {
          console.error('[StoreKit Debug] getSubscriptions failed:', subErr, subErr.stack);
          set({
            productsLoading: false,
            storeUnavailable: true,
            purchaseError: `getSubscriptions error: ${subErr?.message || JSON.stringify(subErr)}`
          });
          return;
        }
      } catch (err: any) {
        console.error('[StoreKit Debug] initIAP outer catch error:', err, err.stack);
        set({
          productsLoading: false,
          iapConnected: false,
          iapReady: false,
          storeUnavailable: true,
          purchaseError: `initIAP outer error: ${err?.message || JSON.stringify(err)}`
        });
      }
    },

    // ── teardownIAP ────────────────────────────────────────────────────────────
    teardownIAP: async () => {
      if (__DEV__) console.log('[StoreKit] Starting teardownIAP...');
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      purchaseUpdateSub = null;
      purchaseErrorSub  = null;
      // Session state only: unfinished transactions stay in StoreKit and are re-delivered after login
      releasePurchaseGuard('teardown');
      transactionsInProgress.clear();
      verifiedTransactions.clear();
      pendingVerification.clear();
      if (get().iapConnected) {
        try {
          await endConnection();
          if (__DEV__) console.log('[StoreKit] endConnection() completed.');
        } catch (err: any) {
          console.warn('[StoreKit Debug] endConnection failed:', err.message);
        }
      }
      set({ iapConnected: false, iapReady: false, productsLoaded: false, purchaseLoading: false, verificationPending: false, purchaseNotice: null });
    },

    // ── purchasePlan ───────────────────────────────────────────────────────────
    purchasePlan: async (productId: string) => {
      // Synchronous guard: a second tap is ignored before any re-render or await
      if (purchaseInFlight || syncInProgress || get().restoreLoading) {
        iapLog('purchase_ignored_already_in_progress', { product: productId });
        return;
      }

      if (!get().iapConnected || !get().iapReady) {
        console.warn('[Store Debug] Connection not ready. Rejecting purchase.');
        set({ purchaseLoading: false, purchaseError: t('subscription.storeNotConnected') });
        return;
      }

      if (get().availableProducts.length === 0) {
        console.warn('[StoreKit Debug] Available products array is empty. Rejecting purchase.');
        set({ purchaseLoading: false, purchaseError: t('subscription.productsNotLoaded') });
        return;
      }

      // Apple already confirmed a purchase we could not verify: verify it, never buy again
      if (pendingVerification.size > 0) {
        iapLog('purchase_redirected_to_verification', { product: productId });
        await get().retryVerification();
        return;
      }

      const attempt = ++attemptCounter;
      purchaseInFlight = { productId, attempt };
      purchaseTimeout = setTimeout(() => {
        if (purchaseInFlight?.attempt === attempt) {
          iapLog('purchase_timeout', { product: productId });
          releasePurchaseGuard('timeout');
          set({ purchaseLoading: false });
        }
      }, PURCHASE_TIMEOUT_MS);

      set({ purchaseLoading: true, purchaseError: null, purchaseNotice: null });
      iapLog('purchase_started', { product: productId });

      try {
        if (Platform.OS === 'android') {
          const product = get().availableProducts.find(p => p.productId === productId) as SubscriptionAndroid;
          const offerToken = product?.subscriptionOfferDetails?.[0]?.offerToken;

          if (!offerToken) {
            console.warn('[Store Debug] Missing offerToken for Android subscription.');
            releasePurchaseGuard('missing_offer');
            set({ purchaseLoading: false, purchaseError: t('subscription.offerNotFound') });
            return;
          }
          await requestSubscription({
            sku: productId,
            subscriptionOffers: [{ sku: productId, offerToken }]
          });
        } else {
          await requestSubscription({ sku: productId });
        }
        // Completion (and releasing the guard) is handled by purchaseUpdatedListener
        iapLog('storekit_request_returned', { product: productId });
      } catch (err: any) {
        await handlePurchaseError(err?.code);
      }
    },

    // ── retryVerification ──────────────────────────────────────────────────────
    retryVerification: async () => {
      if (purchaseInFlight || syncInProgress) return;
      set({ purchaseLoading: true, purchaseError: null, purchaseNotice: null });
      const outcome = await syncExistingPurchase('sync');
      refreshPendingFlag();
      if (outcome === 'verified') {
        const plan = useAuthStore.getState().planType;
        set({ purchaseLoading: false, purchaseNotice: plan !== 'free' ? t('subscription.activated', { plan: planLabel(plan) }) : null });
      } else if (outcome === 'not_active' || outcome === 'none') {
        set({ purchaseLoading: false, purchaseNotice: t('subscription.notActiveYet') });
      } else {
        set({ purchaseLoading: false });
      }
    },

    // ── restorePurchases ───────────────────────────────────────────────────────
    restorePurchases: async () => {
      if (!get().iapConnected) {
        set({ restoreLoading: false, restoreMessage: t('subscription.restoreNotConnected') });
        return;
      }
      if (purchaseInFlight || syncInProgress) {
        iapLog('restore_ignored_already_in_progress');
        return;
      }

      set({ restoreLoading: true, restoreMessage: null, purchaseError: null, purchaseNotice: null });
      iapLog('restore_started');
      const outcome = await syncExistingPurchase('restore');
      refreshPendingFlag();
      iapLog('restore_finished', { outcome });

      const plan = useAuthStore.getState().planType;
      let restoreMessage: string;
      if (outcome === 'verified' && plan !== 'free') restoreMessage = t('subscription.restored', { plan: planLabel(plan) });
      else if (outcome === 'none') restoreMessage = t('subscription.nothingToRestore');
      else if (outcome === 'not_active' || outcome === 'verified') restoreMessage = t('subscription.noActiveSubscription');
      else restoreMessage = t('subscription.restoreFailed');

      set({ restoreLoading: false, restoreMessage });
    },

    // ── Helpers ────────────────────────────────────────────────────────────────
    clearPurchaseError:  () => set({ purchaseError: null, purchaseNotice: null }),
    clearRestoreMessage: () => set({ restoreMessage: null }),
  };
});

/** Test-only reset of the module-level purchase state. */
export const __resetPurchaseStateForTests = () => {
  releasePurchaseGuard('test_reset');
  attemptCounter = 0;
  errorHandledForAttempt = -1;
  transactionsInProgress.clear();
  verifiedTransactions.clear();
  pendingVerification.clear();
  syncInProgress = false;
};

export default useSubscriptionStore;
