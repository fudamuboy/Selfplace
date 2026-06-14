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
  type SubscriptionIOS,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import useAuthStore from './useAuthStore';
import { verifyAppleReceipt, restorePurchases as restoreFromBackend } from '../api/userApi';

// ─── Apple product IDs — must match App Store Connect exactly ────────────────
export const IAP_PRODUCT_IDS = {
  plus:      'selfplace_plus_monthly',
  signature: 'selfplace_signature_monthly',
};

export const ALL_PRODUCT_IDS = [IAP_PRODUCT_IDS.plus, IAP_PRODUCT_IDS.signature];

// ─── Store interface ──────────────────────────────────────────────────────────
interface SubscriptionState {
  availableProducts:   SubscriptionIOS[];
  productsLoading:     boolean;
  purchaseLoading:     boolean;
  purchaseError:       string | null;
  restoreLoading:      boolean;
  restoreMessage:      string | null;
  iapConnected:        boolean;
  iapReady:            boolean;
  productsLoaded:      boolean;
  storeUnavailable:    boolean;

  initIAP:             () => Promise<void>;
  teardownIAP:         () => void;
  purchasePlan:        (productId: string) => Promise<void>;
  restorePurchases:    () => Promise<void>;
  clearPurchaseError:  () => void;
  clearRestoreMessage: () => void;
}

// ─── Singleton listener refs — kept outside Zustand to avoid stale closures ──
let purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
let purchaseErrorSub:  ReturnType<typeof purchaseErrorListener>   | null = null;

// ─── Store ────────────────────────────────────────────────────────────────────
const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  availableProducts:   [],
  productsLoading:     false,
  purchaseLoading:     false,
  purchaseError:       null,
  restoreLoading:      false,
  restoreMessage:      null,
  iapConnected:        false,
  iapReady:            false,
  productsLoaded:      false,
  storeUnavailable:    false,

  // ── initIAP ────────────────────────────────────────────────────────────────
  initIAP: async () => {
    if (Platform.OS !== 'ios') return;

    try {
      console.log('[StoreKit Debug] Starting initIAP...');
      set({ 
        productsLoading: true, 
        purchaseError: null,
        iapReady: false,
        productsLoaded: false,
        storeUnavailable: false
      });

      try {
        console.log('[StoreKit Debug] Calling initConnection()...');
        await initConnection();
        console.log('[StoreKit Debug] initConnection() succeeded.');
        set({ iapConnected: true, iapReady: true });
      } catch (connErr: any) {
        console.warn('[StoreKit Debug] initConnection() failed (expected on simulator):', connErr.message);
        set({ 
          productsLoading: false, 
          iapConnected: false,
          iapReady: false,
          storeUnavailable: true
        });
        return;
      }

      console.log('[StoreKit Debug] Fetching subscriptions for SKUs:', ALL_PRODUCT_IDS);
      // Fetch localised subscription product info from Apple
      const raw = await getSubscriptions({ skus: ALL_PRODUCT_IDS });
      console.log('[StoreKit Debug] getSubscriptions() raw response count:', raw ? raw.length : 0);

      // Filter to iOS-only subscriptions to satisfy SubscriptionIOS type
      const products = (raw as any[]).filter(
        (p): p is SubscriptionIOS => !('subscriptionOfferDetails' in p) && 'localizedPrice' in p
      );
      console.log('[StoreKit Debug] Filtered iOS products count:', products.length);
      products.forEach(p => {
        console.log(`[StoreKit Debug] Product: ID=${p.productId}, Title=${p.title}, Price=${p.localizedPrice}`);
      });

      set({ 
        availableProducts: products, 
        productsLoading: false,
        productsLoaded: true,
        storeUnavailable: products.length === 0
      });

      // ── Purchase success listener ──────────────────────────────────────────
      purchaseUpdateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
        console.log('[StoreKit Debug] purchaseUpdatedListener triggered for product:', purchase.productId);
        const receipt = purchase.transactionReceipt;
        if (!receipt) {
          console.warn('[StoreKit Debug] Purchase triggered but no transaction receipt found.');
          return;
        }

        set({ purchaseLoading: true, purchaseError: null });

        try {
          console.log('[StoreKit Debug] Verifying receipt with backend...');
          const result = await verifyAppleReceipt(receipt);
          console.log('[StoreKit Debug] Backend validation success. plan_type updated to:', result.plan_type);

          // Update global plan — ONLY set after backend confirms
          useAuthStore.getState().setPlanType(result.plan_type);

          // CRITICAL: acknowledge transaction so Apple doesn't refund / re-charge
          console.log('[StoreKit Debug] Finishing transaction with Apple...');
          await finishTransaction({ purchase, isConsumable: false });
          console.log('[StoreKit Debug] Transaction finished successfully.');
        } catch (err: any) {
          console.error('[StoreKit Debug] Backend verification failed:', err.message);
          // DO NOT finishTransaction on backend failure —
          // Apple will re-deliver the purchase on next launch (user is never charged twice).
          set({ purchaseError: 'Abonelik doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.' });
        } finally {
          set({ purchaseLoading: false });
        }
      });

      // ── Purchase error listener ────────────────────────────────────────────
      purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
        // E_USER_CANCELLED = user dismissed Apple sheet — NOT an error, completely silent.
        if ((error as any).code === 'E_USER_CANCELLED') {
          console.log('[StoreKit Debug] User cancelled the payment sheet.');
          set({ purchaseLoading: false, purchaseError: null });
          return;
        }
        console.error('[StoreKit Debug] Purchase error listener caught error:', error.message, (error as any).code);
        set({
          purchaseLoading: false,
          purchaseError: 'Satın alma işlemi başarısız oldu. Lütfen tekrar deneyin.',
        });
      });

    } catch (err: any) {
      console.warn('[StoreKit Debug] initIAP outer catch error:', err.message);
      set({ productsLoading: false, iapConnected: false, iapReady: false, storeUnavailable: true });
    }
  },

  // ── teardownIAP ────────────────────────────────────────────────────────────
  teardownIAP: async () => {
    console.log('[StoreKit Debug] Starting teardownIAP...');
    purchaseUpdateSub?.remove();
    purchaseErrorSub?.remove();
    purchaseUpdateSub = null;
    purchaseErrorSub  = null;
    if (get().iapConnected) {
      try {
        await endConnection();
        console.log('[StoreKit Debug] endConnection() completed.');
      } catch (err: any) {
        console.warn('[StoreKit Debug] endConnection failed:', err.message);
      }
    }
    set({ iapConnected: false, iapReady: false, productsLoaded: false });
  },

  // ── purchasePlan ───────────────────────────────────────────────────────────
  purchasePlan: async (productId: string) => {
    if (Platform.OS !== 'ios') return;

    console.log('[StoreKit Debug] purchasePlan requested for:', productId);

    if (!get().iapConnected || !get().iapReady) {
      console.warn('[StoreKit Debug] Connection not ready. Rejecting purchase.');
      set({
        purchaseLoading: false,
        purchaseError: 'Apple Store bağlantısı aktif değil. Satın alma işlemi başlatılamaz.',
      });
      return;
    }

    if (get().availableProducts.length === 0) {
      console.warn('[StoreKit Debug] Available products array is empty. Rejecting purchase.');
      set({
        purchaseLoading: false,
        purchaseError: 'Abonelik ürünleri yüklenemedi. Lütfen tekrar deneyin.',
      });
      return;
    }

    set({ purchaseLoading: true, purchaseError: null });

    try {
      console.log('[StoreKit Debug] Initiating requestSubscription for:', productId);
      await requestSubscription({ sku: productId });
      console.log('[StoreKit Debug] requestSubscription call returned.');
      // Completion is handled by purchaseUpdatedListener above.
      // purchaseLoading stays true until the listener fires and resets it.
    } catch (err: any) {
      // E_USER_CANCELLED — user dismissed the Apple sheet, completely silent
      if ((err as any).code === 'E_USER_CANCELLED') {
        console.log('[StoreKit Debug] requestSubscription caught user cancellation.');
        set({ purchaseLoading: false, purchaseError: null });
        return;
      }
      console.error('[StoreKit Debug] requestSubscription caught error:', err.message, (err as any).code);
      set({
        purchaseLoading: false,
        purchaseError: 'Satın alma başlatılamadı. Lütfen tekrar deneyin.',
      });
    }
  },

  // ── restorePurchases ───────────────────────────────────────────────────────
  restorePurchases: async () => {
    if (Platform.OS !== 'ios') return;

    if (!get().iapConnected) {
      set({
        restoreLoading: false,
        restoreMessage: 'Apple Store bağlantısı aktif değil. Satın alımlar geri yüklenemez.',
      });
      return;
    }

    set({ restoreLoading: true, restoreMessage: null, purchaseError: null });

    try {
      // Fetch all past purchases from Apple's StoreKit
      const purchases = await getAvailablePurchases();

      if (!purchases || purchases.length === 0) {
        set({
          restoreLoading: false,
          restoreMessage: 'Geri yüklenecek aktif abonelik bulunamadı.',
        });
        return;
      }

      // Find the most recent Selfplace subscription receipt
      const latestPurchase = purchases
        .filter((p) => ALL_PRODUCT_IDS.includes(p.productId))
        .sort((a, b) => (b.transactionDate ?? 0) - (a.transactionDate ?? 0))[0];

      if (!latestPurchase?.transactionReceipt) {
        set({
          restoreLoading: false,
          restoreMessage: 'Geri yüklenecek aktif abonelik bulunamadı.',
        });
        return;
      }

      // Validate with backend
      const result = await restoreFromBackend(latestPurchase.transactionReceipt);
      useAuthStore.getState().setPlanType(result.plan_type);

      const planLabel =
        result.plan_type === 'signature' ? 'Selfplace Signature' :
        result.plan_type === 'plus'      ? 'Selfplace Plus'      : null;

      set({
        restoreLoading: false,
        restoreMessage: planLabel
          ? `${planLabel} aboneliğin başarıyla geri yüklendi ✨`
          : 'Aktif bir abonelik bulunamadı.',
      });

    } catch (err: any) {
      console.error('[IAP] restorePurchases error:', err.message);
      set({
        restoreLoading: false,
        restoreMessage: 'Geri yükleme başarısız oldu. Lütfen tekrar deneyin.',
      });
    }
  },

  // ── Helpers ────────────────────────────────────────────────────────────────
  clearPurchaseError:  () => set({ purchaseError: null }),
  clearRestoreMessage: () => set({ restoreMessage: null }),
}));

export default useSubscriptionStore;
