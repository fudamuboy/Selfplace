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
import * as Application from 'expo-application';

// ─── Apple product IDs — must match App Store Connect exactly ────────────────
export const IAP_PRODUCT_IDS = {
  plus:      'selfplace_plus_v2_monthly',
  signature: 'selfplace_signature_v2_monthly',
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
      if (__DEV__) console.log('[StoreKit] Starting initIAP...');
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
        if (__DEV__) console.log('[StoreKit] purchaseUpdatedListener triggered for product:', purchase.productId);
        const receipt = purchase.transactionReceipt;
        if (!receipt) {
          console.warn('[StoreKit Debug] Purchase triggered but no transaction receipt found.');
          return;
        }

        set({ purchaseLoading: true, purchaseError: null });

        try {
          if (__DEV__) console.log('[StoreKit] Verifying receipt with backend...');
          const result = await verifyAppleReceipt(receipt);
          if (__DEV__) console.log('[StoreKit] Backend validation success. plan_type updated to:', result.plan_type);

          // Update global plan — ONLY set after backend confirms
          useAuthStore.getState().setPlanType(result.plan_type);

          // CRITICAL: acknowledge transaction so Apple doesn't refund / re-charge
          if (__DEV__) console.log('[StoreKit] Finishing transaction with Apple...');
          await finishTransaction({ purchase, isConsumable: false });
          if (__DEV__) console.log('[StoreKit] Transaction finished successfully.');
        } catch (err: any) {
          console.error('[StoreKit Debug] Backend verification failed:', err.message);
          // DO NOT finishTransaction on backend failure —
          // Apple will re-deliver the purchase on next launch (user is never charged twice).
          set({ purchaseError: 'Abonelik doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.' });
        } finally {
          set({ purchaseLoading: false });
        }
      });

      purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
        if ((error as any).code === 'E_USER_CANCELLED') {
          if (__DEV__) console.log('[StoreKit] User cancelled the payment sheet.');
          set({ purchaseLoading: false, purchaseError: null });
          return;
        }
        console.error('[StoreKit Debug] Purchase error listener caught error:', error.message, (error as any).code, error);
        set({
          purchaseLoading: false,
          purchaseError: `Satın alma işlemi başarısız oldu: ${error.message} (Code: ${(error as any).code})`,
        });
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
          
          const debugMsg = [
            `DIAGNOSTIC REPORT:`,
            `Bundle ID: ${runtimeBundleId}`,
            `SKUs: ${ALL_PRODUCT_IDS.join(', ')}`,
            `initConnection: ${connected}`,
            `raw length: 0`,
            `Reasons this happens:`,
            `1. Paid Apps Agreement is NOT ACTIVE in App Store Connect.`,
            `2. Products have "Missing Metadata" status.`,
            `3. Missing App Store Connect Localizations (Group or Product).`,
            `4. No Review Screenshot uploaded for each product.`,
            `5. StoreKit 2 Sandbox delay (wait 2 hours).`
          ].join('\\n');

          set({ 
            productsLoading: false,
            productsLoaded: true,
            storeUnavailable: true,
            purchaseError: 'Şu an mağazaya erişilemiyor. Lütfen daha sonra tekrar deneyin.'
          });
          return;
        }

        // Filter to iOS-only subscriptions to satisfy SubscriptionIOS type
        const products = (raw as any[]).filter(
          (p): p is SubscriptionIOS => !('subscriptionOfferDetails' in p) && 'localizedPrice' in p
        );
        if (__DEV__) console.log('[StoreKit] Filtered iOS products count:', products.length);
        if (__DEV__) products.forEach(p =>
          console.log(`[StoreKit] Product: ID=${p.productId}, Title=${p.title}, Price=${p.localizedPrice}`)
        );

        if (products.length === 0 && raw.length > 0) {
          console.warn('[StoreKit Debug] All products filtered out (not matching iOS subscription shape).');
          set({ 
            productsLoading: false,
            productsLoaded: true,
            storeUnavailable: true,
            purchaseError: 'Şu an mağazaya erişilemiyor. Lütfen daha sonra tekrar deneyin.'
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

      // Listeners have been moved up before getSubscriptions

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
    if (get().iapConnected) {
      try {
        await endConnection();
        if (__DEV__) console.log('[StoreKit] endConnection() completed.');
      } catch (err: any) {
        console.warn('[StoreKit Debug] endConnection failed:', err.message);
      }
    }
    set({ iapConnected: false, iapReady: false, productsLoaded: false });
  },

  // ── purchasePlan ───────────────────────────────────────────────────────────
  purchasePlan: async (productId: string) => {
    if (Platform.OS !== 'ios') return;

    if (__DEV__) console.log('[StoreKit] purchasePlan requested for:', productId);

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
        purchaseError: 'Abonelik ürünleri yüklenemedi (availableProducts is empty). Check initIAP logs.',
      });
      return;
    }

    set({ purchaseLoading: true, purchaseError: null });

    try {
      if (__DEV__) console.log('[StoreKit] Initiating requestSubscription for:', productId);
      await requestSubscription({ sku: productId });
      if (__DEV__) console.log('[StoreKit] requestSubscription call returned.');
      // Completion is handled by purchaseUpdatedListener above.
      // purchaseLoading stays true until the listener fires and resets it.
    } catch (err: any) {
      // E_USER_CANCELLED — user dismissed the Apple sheet, completely silent
      if ((err as any).code === 'E_USER_CANCELLED') {
        if (__DEV__) console.log('[StoreKit] requestSubscription cancelled by user.');
        set({ purchaseLoading: false, purchaseError: null });
        return;
      }
      console.error('[StoreKit Debug] requestSubscription caught error:', err.message, (err as any).code, err);
      set({
        purchaseLoading: false,
        purchaseError: `Satın alma başlatılamadı: ${err?.message || JSON.stringify(err)} (Code: ${(err as any).code})`,
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
