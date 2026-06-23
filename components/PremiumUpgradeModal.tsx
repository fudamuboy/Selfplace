import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MODAL_MAX_WIDTH } from '../constants/Layout';
import useSubscriptionStore, { IAP_PRODUCT_IDS } from '../store/useSubscriptionStore';
import useAuthStore from '../store/useAuthStore';
import type { SubscriptionIOS } from 'react-native-iap';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface Props {
  visible:      boolean;
  onClose:      () => void;
  currentPlan:  'free' | 'plus' | 'signature';
  onPlanUpdated: (newPlan: 'free' | 'plus' | 'signature') => void;
}

// ─── Helper: find a product by its ID from the available products list ────────
function findProduct(products: SubscriptionIOS[], id: string): SubscriptionIOS | undefined {
  return products.find((p) => p.productId === id);
}

// ─── Helper: localised price string, falls back to dash while loading ─────────
function getDisplayPrice(product?: SubscriptionIOS): string {
  return product?.localizedPrice ?? '—';
}

export const PremiumUpgradeModal: React.FC<Props> = ({
  visible,
  onClose,
  currentPlan,
  onPlanUpdated,
}) => {
  const { currentTheme } = useThemeStore();
  const { planType }     = useAuthStore();
  const router = useRouter();

  const {
    availableProducts,
    productsLoading,
    purchaseLoading,
    purchaseError,
    restoreLoading,
    restoreMessage,
    iapConnected,
    iapReady,
    productsLoaded,
    storeUnavailable,
    purchasePlan,
    restorePurchases,
    clearPurchaseError,
    clearRestoreMessage,
  } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<'free' | 'plus' | 'signature'>(currentPlan);

  // Pulse animation for the loading ring
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Clear errors when modal opens ─────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      clearPurchaseError();
      clearRestoreMessage();
    }
  }, [visible]);

  // ── Keep selectedPlan in sync with currentPlan prop ───────────────────────
  useEffect(() => {
    setSelectedPlan(currentPlan);
  }, [currentPlan, visible]);

  // ── Watch for planType updates from IAP listener ──────────────────────────
  useEffect(() => {
    if (planType !== currentPlan) {
      onPlanUpdated(planType);
    }
  }, [planType]);

  // ── Pulse animation during loading ───────────────────────────────────────
  useEffect(() => {
    if (purchaseLoading || restoreLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.00, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [purchaseLoading, restoreLoading]);

  // ── Trigger purchase ──────────────────────────────────────────────────────
  const handleUpgrade = async () => {
    if (selectedPlan === 'free' || selectedPlan === currentPlan) {
      onClose();
      return;
    }
    const productId =
      selectedPlan === 'signature'
        ? IAP_PRODUCT_IDS.signature
        : IAP_PRODUCT_IDS.plus;

    await purchasePlan(productId);
  };

  // ── Products ──────────────────────────────────────────────────────────────
  const plusProduct      = findProduct(availableProducts, IAP_PRODUCT_IDS.plus);
  const signatureProduct = findProduct(availableProducts, IAP_PRODUCT_IDS.signature);

  // ── Action button label ───────────────────────────────────────────────────
  const getButtonLabel = () => {
    if (selectedPlan === currentPlan) return 'Kapat';
    if (selectedPlan === 'free')      return 'Ücretsiz Plana Dön';
    return 'Apple ile Abone Ol';
  };

  // ── Feature row helper ────────────────────────────────────────────────────
  const renderFeatureRow = (text: string, icon = 'checkmark-circle', isAvailable = true) => (
    <View style={styles.featureRow} key={text}>
      <Ionicons
        name={icon as any}
        size={16}
        color={
          isAvailable
            ? currentTheme.colors.primary
            : currentTheme.colors.text.muted
        }
        style={styles.featureIcon}
      />
      <Text
        style={[
          styles.featureText,
          {
            color: isAvailable
              ? currentTheme.colors.text.secondary
              : currentTheme.colors.text.muted,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );

  // ── Loading overlay ───────────────────────────────────────────────────────
  const isLoading = purchaseLoading || restoreLoading;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />

        <View
          style={[
            styles.container,
            {
              backgroundColor: currentTheme.colors.background[1],
              borderColor:     currentTheme.colors.glow,
            },
          ]}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={24} color={currentTheme.colors.primary} />
              <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>
                Selfplace Premium
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isLoading}>
              <Ionicons
                name="close"
                size={24}
                color={
                  isLoading
                    ? currentTheme.colors.text.muted
                    : currentTheme.colors.text.secondary
                }
              />
            </TouchableOpacity>
          </View>

          {/* ── Error banner / IAP unavailable warning ── */}
          {purchaseError ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(248,113,113,0.12)', borderColor: '#f87171' }]}>
              <Ionicons name="warning-outline" size={16} color="#f87171" />
              <Text style={styles.errorText}>{purchaseError}</Text>
            </View>
          ) : null}

          {/* Simulator detection or store unavailable warning */}
          {!iapConnected && !productsLoading ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(234,179,8,0.1)', borderColor: '#eab308', flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="information-circle-outline" size={16} color="#eab308" />
                <Text style={[styles.errorText, { color: '#eab308' }]}>
                  {purchaseError || (storeUnavailable 
                    ? "Şu an mağazaya erişilemiyor. Lütfen daha sonra tekrar deneyin."
                    : "Apple Store bağlantısı şu an kurulamadı. Lütfen tekrar deneyin.")}
                </Text>
              </View>
              <TouchableOpacity 
                style={{ 
                  marginTop: 10, 
                  backgroundColor: 'rgba(234,179,8,0.2)', 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 8,
                  borderColor: '#eab308',
                }}>
                <Text style={{ color: '#eab308', fontSize: 12, fontWeight: 'bold' }}>Bağlantı Sorunu</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Loading status banner */}
          {productsLoading ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6' }]}>
              <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />
              <Text style={[styles.errorText, { color: '#3b82f6' }]}>
                Store bağlantısı hazırlanıyor...
              </Text>
            </View>
          ) : null}

          {/* ── Restore message banner ── */}
          {restoreMessage ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: restoreMessage.includes('yüklendi')
                    ? 'rgba(74,222,128,0.1)'
                    : 'rgba(148,163,184,0.1)',
                  borderColor: restoreMessage.includes('yüklendi') ? '#4ade80' : currentTheme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name={restoreMessage.includes('yüklendi') ? 'checkmark-circle-outline' : 'information-circle-outline'}
                size={16}
                color={restoreMessage.includes('yüklendi') ? '#4ade80' : currentTheme.colors.text.secondary}
              />
              <Text
                style={[
                  styles.errorText,
                  {
                    color: restoreMessage.includes('yüklendi')
                      ? '#4ade80'
                      : currentTheme.colors.text.secondary,
                  },
                ]}
              >
                {restoreMessage}
              </Text>
            </View>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ── Free Plan Card ── */}
            <TouchableOpacity
              style={[
                styles.planCard,
                {
                  backgroundColor: currentTheme.colors.card,
                  borderColor:
                    selectedPlan === 'free'
                      ? currentTheme.colors.primary
                      : currentTheme.colors.cardBorder,
                },
              ]}
              onPress={() => setSelectedPlan('free')}
              activeOpacity={0.9}
              disabled={isLoading}
            >
              <View style={styles.planHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.planTitle, { color: currentTheme.colors.text.primary }]}>
                    Ücretsiz Plan
                  </Text>
                  <Text style={[styles.planDesc, { color: currentTheme.colors.text.muted }]}>
                    Kendinle sakin ve güvenli bir alan.
                  </Text>
                </View>
                <Text style={[styles.priceText, { color: currentTheme.colors.text.primary, fontSize: 32 }]}>
                  0₺
                </Text>
              </View>
              {selectedPlan === 'free' && (
                <View style={styles.featuresList}>
                  {renderFeatureRow("Günlük ruh hali check-in'leri")}
                  {renderFeatureRow('Hafif ve güvenli yapay zeka yoldaşlığı')}
                  {renderFeatureRow('1 Özel ilişki bağlantısı')}
                  {renderFeatureRow('Zaman tüneli ve derin hafıza', 'close-circle', false)}
                </View>
              )}
            </TouchableOpacity>

            {/* ── Plus Plan Card ── */}
            <TouchableOpacity
              style={[
                styles.planCard,
                {
                  backgroundColor: currentTheme.colors.card,
                  borderColor:
                    selectedPlan === 'plus'
                      ? currentTheme.colors.primary
                      : currentTheme.colors.cardBorder,
                },
              ]}
              onPress={() => setSelectedPlan('plus')}
              activeOpacity={0.9}
              disabled={isLoading}
            >
              <LinearGradient
                colors={
                  selectedPlan === 'plus'
                    ? ['rgba(167, 139, 250, 0.1)', 'transparent']
                    : ['transparent', 'transparent']
                }
                style={styles.gradientCard}
              >
                <View style={styles.planHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.planTitle, { color: currentTheme.colors.primary }]}>
                      Selfplace Plus
                    </Text>
                    <Text style={[styles.planDesc, { color: currentTheme.colors.text.muted }]}>
                      Sizi giderek daha iyi anlayan duygusal bir yoldaş.
                    </Text>
                  </View>
                  <View style={styles.priceContainer}>
                    {productsLoading ? (
                      <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                    ) : !iapReady || !productsLoaded ? (
                      <Text style={[styles.pricePeriod, { color: currentTheme.colors.text.muted, fontSize: 13 }]}>
                        Yükleniyor...
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.priceText, { color: currentTheme.colors.primary }]}>
                          {getDisplayPrice(plusProduct)}
                        </Text>
                        <Text style={[styles.pricePeriod, { color: currentTheme.colors.text.muted }]}>
                          / 1 Ay
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                {selectedPlan === 'plus' && (
                  <View style={styles.featuresList}>
                    {renderFeatureRow('Sizi hatırlayan duygusal devamlılık')}
                    {renderFeatureRow('Ruh halinize uyum sağlayan doğal konuşmalar')}
                    {renderFeatureRow('İlişkinizin ritmini ve hava durumunu anlama')}
                    {renderFeatureRow('Sınırsız yansıma ve uyum analizi')}
                    {renderFeatureRow('Ortak ritüeller and zaman tüneli')}
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Signature Plan Card ── */}
            <TouchableOpacity
              style={[
                styles.planCard,
                {
                  backgroundColor: currentTheme.colors.card,
                  borderColor:
                    selectedPlan === 'signature'
                      ? currentTheme.colors.mascot.start
                      : currentTheme.colors.cardBorder,
                },
              ]}
              onPress={() => setSelectedPlan('signature')}
              activeOpacity={0.9}
              disabled={isLoading}
            >
              <LinearGradient
                colors={
                  selectedPlan === 'signature'
                    ? ['rgba(244, 114, 182, 0.15)', 'transparent']
                    : ['transparent', 'transparent']
                }
                style={styles.gradientCard}
              >
                <View style={styles.planHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.planTitle, { color: currentTheme.colors.mascot.start }]}>
                      Selfplace Signature
                    </Text>
                    <Text style={[styles.planDesc, { color: currentTheme.colors.text.muted }]}>
                      Daha gerçek hissettiren derin duygusal deneyim.
                    </Text>
                  </View>
                  <View style={styles.priceContainer}>
                    {productsLoading ? (
                      <ActivityIndicator size="small" color={currentTheme.colors.mascot.start} />
                    ) : !iapReady || !productsLoaded ? (
                      <Text style={[styles.pricePeriod, { color: currentTheme.colors.text.muted, fontSize: 13 }]}>
                        Yükleniyor...
                      </Text>
                    ) : (
                      <>
                        <Text style={[styles.priceText, { color: currentTheme.colors.mascot.start }]}>
                          {getDisplayPrice(signatureProduct)}
                        </Text>
                        <Text style={[styles.pricePeriod, { color: currentTheme.colors.text.muted }]}>
                          / 1 Ay
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                {selectedPlan === 'signature' && (
                  <View style={styles.featuresList}>
                    {renderFeatureRow('Daha doğal ve yaşayan konuşmalar')}
                    {renderFeatureRow('İlişkinizi daha derinden hisseden bir AI')}
                    {renderFeatureRow('Sessizliği bile anlayabilen bir yoldaş')}
                    {renderFeatureRow('Kişiliğinize ve anlık derinliğinize uyum')}
                    {renderFeatureRow('Tüm Plus ayrıcalıkları')}
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Apple legal note ── */}
            <Text style={[styles.legalNote, { color: currentTheme.colors.text.muted }]}>
              Ödeme, satın alma onayında Apple Kimliği hesabınızdan tahsil edilecektir. Abonelik, mevcut dönemin bitiminden en az 24 saat önce iptal edilmediği sürece otomatik olarak yenilenir. Hesabınız, mevcut dönemin bitiminden 24 saat önce yenileme için ücretlendirilecektir. Satın aldıktan sonra App Store'daki hesap ayarlarınıza giderek aboneliklerinizi yönetebilir ve iptal edebilirsiniz.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4, marginBottom: 12 }}>
              <TouchableOpacity onPress={() => { onClose(); router.push('/terms'); }} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={[styles.legalNote, { color: currentTheme.colors.text.muted, textDecorationLine: 'underline', marginBottom: 0 }]}>
                  Kullanım Koşulları (Apple Standart EULA)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onClose(); router.push('/privacy-policy'); }} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={[styles.legalNote, { color: currentTheme.colors.text.muted, textDecorationLine: 'underline', marginBottom: 0 }]}>
                  Gizlilik Politikası
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* ── Action Button ── */}
          <Animated.View style={{ transform: [{ scale: isLoading ? pulseAnim : 1 }] }}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    selectedPlan === 'signature'
                      ? currentTheme.colors.mascot.start
                      : currentTheme.colors.primary,
                  opacity: (isLoading || (selectedPlan !== 'free' && (!iapReady || !productsLoaded))) ? 0.6 : 1,
                },
              ]}
              onPress={handleUpgrade}
              disabled={isLoading || (selectedPlan !== 'free' && (!iapReady || !productsLoaded))}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={[styles.actionButtonText, { marginLeft: 10 }]}>
                    {purchaseLoading ? 'Apple ile doğrulanıyor…' : 'Geri yükleniyor…'}
                  </Text>
                </View>
              ) : (selectedPlan !== 'free' && (!iapReady || !productsLoaded)) ? (
                <Text style={styles.actionButtonText}>Store Bağlantısı Bekleniyor...</Text>
              ) : (
                <Text style={styles.actionButtonText}>{getButtonLabel()}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* ── Restore Purchases link ── */}
          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={restorePurchases}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {restoreLoading ? (
              <ActivityIndicator size="small" color={currentTheme.colors.text.muted} />
            ) : (
              <Text style={[styles.restoreBtnText, { color: currentTheme.colors.text.muted }]}>
                Satın Alımları Geri Yükle
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius:  32,
    borderTopRightRadius: 32,
    paddingTop:           24,
    paddingHorizontal:    24,
    paddingBottom:        40,
    width:                '100%',
    maxWidth:             MODAL_MAX_WIDTH,
    alignSelf:            'center',
    borderWidth:          1,
    borderBottomWidth:    0,
    maxHeight:            '92%',
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           10,
  },
  title: {
    fontSize:   20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  errorBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    borderRadius:    12,
    borderWidth:     1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom:    12,
  },
  errorText: {
    flex:       1,
    fontSize:   13,
    lineHeight: 18,
    color:      '#f87171',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  planCard: {
    borderRadius: 24,
    borderWidth:  1,
    marginBottom: 16,
    overflow:     'hidden',
  },
  gradientCard: {
    padding: 20,
  },
  planHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    padding:        20,
  },
  planTitle: {
    fontSize:   18,
    fontWeight: 'bold',
  },
  planDesc: {
    fontSize:  12,
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    justifyContent: 'flex-end',
    flexWrap:      'nowrap',
    minWidth:      120,
    minHeight:     50,
  },
  priceText: {
    fontSize:   width < 390 ? 38 : 44,
    fontWeight: '800',
    lineHeight: 50,
  },
  pricePeriod: {
    fontSize:     16,
    fontWeight:   '600',
    marginLeft:   6,
    marginBottom: 8,
  },
  featuresList: {
    paddingHorizontal: 20,
    paddingBottom:     20,
    gap:               10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
  },
  legalNote: {
    fontSize:   11,
    lineHeight: 16,
    textAlign:  'center',
    paddingHorizontal: 8,
    marginBottom: 4,
    opacity: 0.7,
  },
  actionButton: {
    height:       56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems:   'center',
    marginTop:    10,
    shadowColor:  '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },
  actionButtonText: {
    color:      '#FFF',
    fontSize:   16,
    fontWeight: '700',
  },
  restoreBtn: {
    alignItems:  'center',
    paddingTop:  16,
    paddingBottom: 4,
    minHeight:   36,
    justifyContent: 'center',
  },
  restoreBtnText: {
    fontSize:   13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
