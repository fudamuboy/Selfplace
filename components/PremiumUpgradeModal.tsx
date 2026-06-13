import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { updateSubscription } from '../api/userApi';
import { MODAL_MAX_WIDTH } from '../constants/Layout';
import { logger } from '../utils/logger';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'plus' | 'signature';
  onPlanUpdated: (newPlan: 'free' | 'plus' | 'signature') => void;
}

export const PremiumUpgradeModal: React.FC<Props> = ({
  visible,
  onClose,
  currentPlan,
  onPlanUpdated
}) => {
  const { currentTheme } = useThemeStore();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'plus' | 'signature'>(currentPlan);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (selectedPlan === currentPlan) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await updateSubscription(selectedPlan);
      onPlanUpdated(res.subscription.plan_type);
      onClose();
    } catch (error) {
      logger.error('[PremiumUpgradeModal] Upgrade error', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFeatureRow = (text: string, icon = "checkmark-circle", isAvailable = true) => (
    <View style={styles.featureRow}>
      <Ionicons 
        name={icon as any} 
        size={18} 
        color={isAvailable ? currentTheme.colors.primary : currentTheme.colors.text.muted} 
        style={styles.featureIcon}
      />
      <Text style={[
        styles.featureText, 
        { color: isAvailable ? currentTheme.colors.text.secondary : currentTheme.colors.text.muted }
      ]}>
        {text}
      </Text>
    </View>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={[styles.container, { backgroundColor: currentTheme.colors.background[1], borderColor: currentTheme.colors.glow }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={24} color={currentTheme.colors.primary} />
              <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Selfplace Premium</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={currentTheme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            {/* Free Tier Card */}
            <TouchableOpacity
              style={[
                styles.planCard,
                { 
                  backgroundColor: currentTheme.colors.card, 
                  borderColor: selectedPlan === 'free' ? currentTheme.colors.primary : currentTheme.colors.cardBorder 
                }
              ]}
              onPress={() => setSelectedPlan('free')}
              activeOpacity={0.9}
            >
              <View style={styles.planHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.planTitle, { color: currentTheme.colors.text.primary }]}>Ücretsiz Plan</Text>
                  <Text style={[styles.planDesc, { color: currentTheme.colors.text.muted }]}>Kendinle sakin ve güvenli bir alan.</Text>
                </View>
                <Text style={[styles.priceText, { color: currentTheme.colors.text.primary, fontSize: 32 }]}>0₺</Text>
              </View>
              {selectedPlan === 'free' && (
                <View style={styles.featuresList}>
                  {renderFeatureRow("Günlük ruh hali check-in'leri")}
                  {renderFeatureRow("Hafif ve güvenli yapay zeka yoldaşlığı")}
                  {renderFeatureRow("1 Özel ilişki bağlantısı")}
                  {renderFeatureRow("Zaman tüneli ve derin hafıza", "close-circle", false)}
                </View>
              )}
            </TouchableOpacity>

            {/* Plus Tier Card */}
            <TouchableOpacity
              style={[
                styles.planCard,
                { 
                  backgroundColor: currentTheme.colors.card, 
                  borderColor: selectedPlan === 'plus' ? currentTheme.colors.primary : currentTheme.colors.cardBorder 
                }
              ]}
              onPress={() => setSelectedPlan('plus')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={selectedPlan === 'plus' ? ['rgba(167, 139, 250, 0.1)', 'transparent'] : ['transparent', 'transparent']}
                style={styles.gradientCard}
              >
                <View style={styles.planHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.planTitle, { color: currentTheme.colors.primary }]}>Selfplace Plus</Text>
                    <Text style={[styles.planDesc, { color: currentTheme.colors.text.muted }]}>Sizi giderek daha iyi anlayan duygusal bir yoldaş.</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.priceText, { color: currentTheme.colors.primary }]}>199₺</Text>
                    <Text style={[styles.pricePeriod, { color: currentTheme.colors.text.muted }]}>/ ay</Text>
                  </View>
                </View>
                {selectedPlan === 'plus' && (
                  <View style={styles.featuresList}>
                    {renderFeatureRow("Sizi hatırlayan duygusal devamlılık")}
                    {renderFeatureRow("Ruh halinize uyum sağlayan daha doğal konuşmalar")}
                    {renderFeatureRow("İlişkinizin ritmini ve hava durumunu anlama")}
                    {renderFeatureRow("Sınırsız yansıma ve uyum analizi")}
                    {renderFeatureRow("Ortak ritüeller ve zaman tüneli")}
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Signature Tier Card */}
            <TouchableOpacity
              style={[
                styles.planCard,
                { 
                  backgroundColor: currentTheme.colors.card, 
                  borderColor: selectedPlan === 'signature' ? currentTheme.colors.mascot.start : currentTheme.colors.cardBorder 
                }
              ]}
              onPress={() => setSelectedPlan('signature')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={selectedPlan === 'signature' ? ['rgba(244, 114, 182, 0.15)', 'transparent'] : ['transparent', 'transparent']}
                style={styles.gradientCard}
              >
                <View style={styles.planHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.planTitle, { color: currentTheme.colors.mascot.start }]}>Selfplace Signature</Text>
                    <Text style={[styles.planDesc, { color: currentTheme.colors.text.muted }]}>Daha gerçek hissettiren derin duygusal deneyim.</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.priceText, { color: currentTheme.colors.mascot.start }]}>399₺</Text>
                    <Text style={[styles.pricePeriod, { color: currentTheme.colors.text.muted }]}>/ ay</Text>
                  </View>
                </View>
                {selectedPlan === 'signature' && (
                  <View style={styles.featuresList}>
                    {renderFeatureRow("Daha doğal ve yaşayan konuşmalar")}
                    {renderFeatureRow("İlişkinizi daha derinden hisseden bir AI")}
                    {renderFeatureRow("Sessizliği bile anlayabilen bir yoldaş")}
                    {renderFeatureRow("Kişiliğinize ve anlık derinliğinize uyum")}
                    {renderFeatureRow("Tüm Plus ayrıcalıkları")}
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { 
                backgroundColor: selectedPlan === 'signature' ? currentTheme.colors.mascot.start : currentTheme.colors.primary 
              }
            ]}
            onPress={handleUpgrade}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.actionButtonText}>
                {selectedPlan === currentPlan ? 'Kapat' : (selectedPlan === 'free' ? 'Planı Ücretsiz Yap' : 'Hemen Yükselt')}
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    width: '100%',
    maxWidth: MODAL_MAX_WIDTH,
    alignSelf: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gradientCard: {
    padding: 20,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
    minWidth: 120,
  },
  priceText: {
    fontSize: width < 390 ? 42 : 48,
    fontWeight: '800',
    lineHeight: 50,
  },
  pricePeriod: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    marginBottom: 8,
  },
  featuresList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
  },
  actionButton: {
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
