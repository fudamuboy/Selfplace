import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { MODAL_MAX_WIDTH } from '../constants/Layout';

export type PremiumFeatureType = 'time-tunnel' | 'deep-memory' | 'advanced-ai' | 'shared-ritual' | 'daily-sync' | 'whispers' | null;

interface PremiumGateModalProps {
  visible: boolean;
  feature: PremiumFeatureType;
  onClose: () => void;
  onUpgrade: () => void;
}

export const PremiumGateModal: React.FC<PremiumGateModalProps> = ({
  visible,
  feature,
  onClose,
  onUpgrade,
}) => {
  const { currentTheme } = useThemeStore();

  if (!visible || !feature) return null;

  const getFeatureDetails = () => {
    switch (feature) {
      case 'time-tunnel':
        return {
          title: 'Zaman Tüneli',
          message: 'Geçmiş duygusal yolculuğunu daha derin keşfetmek için Plus’a geçebilirsin ✨',
          icon: 'trail-sign-outline'
        };
      case 'deep-memory':
        return {
          title: 'Derin Hafıza',
          message: 'İlişkinizdeki gelişimleri ve özel anları daha güçlü takip etmek için Plus deneyimi önerilir ✨',
          icon: 'library-outline'
        };
      case 'advanced-ai':
        return {
          title: 'Gelişmiş AI',
          message: 'Seni daha iyi anlayan gelişmiş duygusal rehberlik için premium özellikleri keşfedebilirsin ✨',
          icon: 'sparkles-outline'
        };
      case 'shared-ritual':
        return {
          title: 'Ortak Ritüeller',
          message: 'İlişkinizin günlük ritimlerini ve derin yansımalarını açmak için Plus’a geçebilirsin ✨',
          icon: 'chatbubbles-outline'
        };
      case 'daily-sync':
        return {
          title: 'Duygu Uyum Analizi',
          message: 'Günlük uyum analizi, duygusal hava durumu ve ilişki enerjisi analizlerini açmak için Plus’a geçebilirsin ✨',
          icon: 'analytics-outline'
        };
      case 'whispers':
        return {
          title: 'İlişki Fısıltıları',
          message: 'Günün size özel hafif duygusal uyum tavsiyelerini açmak için Plus’a geçebilirsin ✨',
          icon: 'leaf-outline'
        };
      default:
        return {
          title: 'Premium Özellik',
          message: 'İlişkinizi daha derin takip etmek için Plus özellikleri sana yardımcı olabilir ✨',
          icon: 'star-outline'
        };
    }
  };

  const details = getFeatureDetails();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={[styles.container, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
            <Ionicons name={details.icon as any} size={32} color={currentTheme.colors.primary} />
          </View>
          
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>
            {details.title}
          </Text>
          
          <Text style={[styles.message, { color: currentTheme.colors.text.secondary }]}>
            {details.message}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.upgradeBtn, { backgroundColor: currentTheme.colors.primary }]}
              onPress={onUpgrade}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeBtnText}>Plus Aboneliğine Geç</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dismissBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.dismissBtnText, { color: currentTheme.colors.text.muted }]}>Daha Sonra</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: MODAL_MAX_WIDTH,
    alignSelf: 'center',
    borderRadius: 32,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  upgradeBtn: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissBtn: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
