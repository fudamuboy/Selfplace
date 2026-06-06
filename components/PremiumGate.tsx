import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  children: React.ReactNode;
  requiredPlan: 'plus' | 'signature';
  currentPlan: 'free' | 'plus' | 'signature';
  onUpgradePress: () => void;
  title?: string;
  subtitle?: string;
  containerStyle?: any;
}

export const PremiumGate: React.FC<Props> = ({
  children,
  requiredPlan,
  currentPlan,
  onUpgradePress,
  title = "Premium Özellik ✨",
  subtitle = "Bu özelliğe erişmek için planınızı yükseltin.",
  containerStyle
}) => {
  const { currentTheme } = useThemeStore();

  const hasAccess = 
    currentPlan === 'signature' || 
    (currentPlan === 'plus' && requiredPlan === 'plus');

  if (hasAccess) {
    return <>{children}</>;
  }

  // Determine required plan badge details
  const isSignatureRequired = requiredPlan === 'signature';
  const planColor = isSignatureRequired ? currentTheme.colors.mascot.start : currentTheme.colors.primary;
  const planLabel = isSignatureRequired ? 'Selfplace Signature' : 'Selfplace Plus';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Blurred background view of children */}
      <View style={styles.contentBlurred} pointerEvents="none">
        {children}
      </View>

      {/* Glassmorphic lock overlay */}
      <BlurView intensity={Platform.OS === 'ios' ? 35 : 85} tint="dark" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['rgba(20, 15, 38, 0.65)', 'rgba(30, 20, 50, 0.85)']}
          style={styles.overlay}
        >
          <View style={[styles.lockIconBox, { backgroundColor: currentTheme.colors.glow, borderColor: currentTheme.colors.cardBorder }]}>
            <Ionicons name="sparkles" size={24} color={planColor} />
          </View>
          
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{title}</Text>
          
          <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: currentTheme.colors.cardBorder }]}>
            <Text style={[styles.badgeText, { color: planColor }]}>{planLabel} Gerekli</Text>
          </View>

          <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>{subtitle}</Text>
          
          <TouchableOpacity 
            style={[styles.upgradeBtn, { backgroundColor: planColor }]}
            onPress={onUpgradePress}
            activeOpacity={0.8}
          >
            <Text style={styles.upgradeBtnText}>Şimdi Yükselt</Text>
          </TouchableOpacity>
        </LinearGradient>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 24,
  },
  contentBlurred: {
    opacity: 0.25,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockIconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  upgradeBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  upgradeBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
