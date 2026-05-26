import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Dimensions, SafeAreaView, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/useAuthStore';
import useNotificationStore from '../store/useNotificationStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MascotBlob } from '../components/MascotBlob';
import Svg, { Path } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing,
  withDelay,
  withSequence
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const THEMES = [
  {
    step: 1,
    colors: ['#0F111A', '#1A1625', '#2E1B4B'],
    accent: '#8B7CFF',
    cardBackground: 'rgba(224, 218, 255, 0.94)',
    cardBorder: 'rgba(139, 124, 255, 0.25)',
    textColor: '#1E1B2E',
    subTextColor: '#5A6075',
    mascotColor: 'purple' as const,
    mood: 'neutral' as const,
    title: 'Yolculuğunu sana göre\nşekillendirelim',
    subtitle: 'Küçük tercihlerle Selfplace\ndaha kişisel hissedebilir.',
  },
  {
    step: 2,
    colors: ['#0F111A', '#2D1B2E', '#4A2D3C'],
    accent: '#FFD166',
    cardBackground: 'rgba(255, 245, 215, 0.94)',
    cardBorder: 'rgba(255, 209, 102, 0.25)',
    textColor: '#1E1B2E',
    subTextColor: '#5A6075',
    mascotColor: 'yellow' as const,
    mood: 'happy' as const,
    title: 'Sana nazikçe\nhatırlatalım',
    subtitle: 'Sadece seçtiğin zamanda,\nhuzurunu bozmadan küçük\nbir bildirim.',
  },
  {
    step: 3,
    colors: ['#0F111A', '#0C1621', '#1A2A3A'],
    accent: '#55E6C1',
    cardBackground: 'rgba(215, 255, 240, 0.94)',
    cardBorder: 'rgba(85, 230, 193, 0.25)',
    textColor: '#1E1B2E',
    subTextColor: '#5A6075',
    mascotColor: 'green' as const,
    mood: 'happy' as const,
    title: 'Hazırsın',
    subtitle: 'Bu alan tamamen senin.\nKendine ayıracağın küçük\nbir anla başlayabilirsin.',
  }
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Floating soft particles and stars around the Mascot Blob
function FloatingParticle({ delay, x, y, size, type, color }: { delay: number, x: number, y: number, size: number, type: 'star' | 'circle', color: string }) {
  const floatY = useSharedValue(y);
  const opacity = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(y - 25, { duration: 3500 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.65, { duration: 1800 }),
          withTiming(0.1, { duration: 1800 })
        ),
        -1,
        true
      )
    );
  }, [y, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x,
    top: floatY.value,
    opacity: opacity.value,
    transform: [{ scale: withRepeat(withTiming(1.15, { duration: 2500 }), -1, true) }]
  }));

  if (type === 'star') {
    return (
      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Path d="M12,2L14.8,9.2L22,12L14.8,14.8L12,22L9.2,14.8L2,12L9.2,9.2Z" />
        </Svg>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[animatedStyle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]} />
  );
}

export default function PostAuthOnboardingScreen() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { setPostAuthOnboardingCompleted } = useAuthStore();

  const { 
    remindersEnabled, 
    reminderTime, 
    loadConfig,
    toggleReminders: storeToggleReminders,
    setReminderTime: storeSetReminderTime
  } = useNotificationStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10); // 5, 10, 15

  // Animations
  const floatAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const buttonPressScale = useSharedValue(1);

  useEffect(() => {
    floatAnim.value = withRepeat(
      withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [floatAnim]);

  const handleNext = async () => {
    if (step < 3) {
      fadeAnim.value = withTiming(0, { duration: 350 });
      slideAnim.value = withTiming(-20, { duration: 350 });
      
      setTimeout(() => {
        setStep(prev => prev + 1);
        slideAnim.value = 20;
        fadeAnim.value = withTiming(1, { duration: 450 });
        slideAnim.value = withTiming(0, { duration: 450 });
      }, 350);

      if (step === 2 && remindersEnabled) {
        await storeToggleReminders(true);
      }
    } else {
      await AsyncStorage.setItem('dailyGoal', dailyGoal.toString());
      await setPostAuthOnboardingCompleted(true);
      router.replace('/(tabs)');
    }
  };

  const floatingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPressScale.value }],
  }));

  const currentThemeData = THEMES[step - 1];

  return (
    <LinearGradient 
      colors={currentThemeData.colors as [string, string, ...string[]]} 
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        
        {/* TOP: TEXT SECTION */}
        <Animated.View style={[styles.topSection, contentStyle]}>
          <Text style={styles.title}>{currentThemeData.title}</Text>
          <Text style={styles.subtitle}>{currentThemeData.subtitle}</Text>
        </Animated.View>

        {/* MIDDLE: MASCOT AREA WITH GLOW AND SOFT FLOATING PARTICLES */}
        <View style={styles.mascotContainer}>
          <View style={[styles.glowBackground, { backgroundColor: currentThemeData.accent }]} />
          
          {/* Dynamically colored sparkles & dots floating around the mascot */}
          <FloatingParticle type="star" x={width * 0.16} y={height * 0.08} size={15} delay={100} color={currentThemeData.accent} />
          <FloatingParticle type="circle" x={width * 0.26} y={height * 0.04} size={6} delay={500} color={currentThemeData.accent} />
          <FloatingParticle type="star" x={width * 0.76} y={height * 0.05} size={13} delay={300} color={currentThemeData.accent} />
          <FloatingParticle type="circle" x={width * 0.8} y={height * 0.14} size={8} delay={800} color={currentThemeData.accent} />
          <FloatingParticle type="star" x={width * 0.22} y={height * 0.18} size={11} delay={600} color={currentThemeData.accent} />
          <FloatingParticle type="circle" x={width * 0.72} y={height * 0.22} size={5} delay={200} color={currentThemeData.accent} />

          <Animated.View style={[styles.topIcon, floatingStyle]}>
            {step === 1 && <View style={styles.messyLines}><Ionicons name="infinite" size={40} color={currentThemeData.accent} opacity={0.3} /></View>}
            {step === 2 && <Ionicons name="notifications-outline" size={32} color={currentThemeData.accent} />}
            {step === 3 && <Ionicons name="heart-outline" size={32} color={currentThemeData.accent} />}
          </Animated.View>

          <MascotBlob mood={currentThemeData.mood} color={currentThemeData.mascotColor} />
        </View>

        {/* BOTTOM: INTERACTION AREA */}
        <Animated.View style={[styles.bottomSection, contentStyle]}>
          <View style={[
            styles.glassCard, 
            { 
              backgroundColor: currentThemeData.cardBackground, 
              borderColor: currentThemeData.cardBorder 
            }
          ]}>
            {step === 1 && (
              <>
                <View style={styles.controlRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.cardLabel, { color: currentThemeData.textColor }]}>Günlük Hatırlatıcı</Text>
                    <Text style={[styles.cardSubLabel, { color: currentThemeData.subTextColor }]}>Kendine ayıracağın o vakti sana hatırlatalım.</Text>
                  </View>
                  <Switch 
                    value={remindersEnabled} 
                    onValueChange={(val) => { storeToggleReminders(val); }}
                    trackColor={{ false: 'rgba(0,0,0,0.1)', true: currentThemeData.accent }}
                    thumbColor="#FFF"
                    ios_backgroundColor="rgba(0,0,0,0.08)"
                  />
                </View>

                <View style={styles.divider} />

                <Text style={[styles.cardLabel, { color: currentThemeData.textColor, marginBottom: 12 }]}>Günlük Hedefin</Text>
                <Text style={[styles.cardSubLabel, { color: currentThemeData.subTextColor, marginBottom: 16 }]}>Günde kaç dakika kendine ayırmak istersin?</Text>
                
                <View style={styles.goalRow}>
                  {[5, 10, 15].map(val => (
                    <TouchableOpacity 
                      key={val}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDailyGoal(val);
                      }}
                      style={[
                        styles.goalItem,
                        dailyGoal === val 
                          ? { backgroundColor: currentThemeData.accent, borderColor: currentThemeData.accent }
                          : { backgroundColor: 'rgba(0, 0, 0, 0.04)', borderColor: 'rgba(0, 0, 0, 0.08)' }
                      ]}
                    >
                      <Text style={[
                        styles.goalText, 
                        dailyGoal === val ? { color: '#FFF', fontWeight: '700' } : { color: '#4B5563' }
                      ]}>{val} dk</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {step === 2 && (
              <View style={styles.controlRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.cardLabel, { color: currentThemeData.textColor }]}>Bildirim İzni</Text>
                  <Text style={[styles.cardSubLabel, { color: currentThemeData.subTextColor }]}>Zihnini dinlendirme vaktin geldiğinde sana fısıldayalım.</Text>
                </View>
                <Switch 
                  value={remindersEnabled} 
                  onValueChange={(val) => { storeToggleReminders(val); }}
                  trackColor={{ false: 'rgba(0,0,0,0.1)', true: currentThemeData.accent }}
                  thumbColor="#FFF"
                  ios_backgroundColor="rgba(0,0,0,0.08)"
                />
              </View>
            )}

            {step === 3 && (
              <View style={styles.welcomeRow}>
                <View style={[styles.welcomeIconCircle, { backgroundColor: 'rgba(85, 230, 193, 0.15)' }]}>
                   <Ionicons name="heart" size={22} color={currentThemeData.accent} />
                </View>
                <Text style={[styles.welcomeText, { color: currentThemeData.textColor }]}>
                  Selfplace&apos;e hoş geldin, seni burada görmek çok güzel.
                </Text>
              </View>
            )}
          </View>

          {/* Premium dark CTA capsule button matching design reference */}
          <AnimatedPressable 
            onPress={handleNext}
            onPressIn={() => { buttonPressScale.value = withTiming(0.97, { duration: 100 }); }}
            onPressOut={() => { buttonPressScale.value = withTiming(1, { duration: 100 }); }}
            style={[styles.ctaButton, buttonStyle]}
          >
            <Text style={styles.ctaText}>
              {step === 3 ? "Uygulamaya Gir" : step === 2 ? "İzin Ver ve Devam Et" : "Devam Et"}
            </Text>
          </AnimatedPressable>

          {step === 2 && (
            <TouchableOpacity onPress={() => handleNext()} style={styles.skipBtn}>
              <Text style={styles.skipText}>Şimdi Değil</Text>
            </TouchableOpacity>
          )}

          {/* Progress dots reflecting active step accent colors */}
          <View style={styles.dotsRow}>
            {[1, 2, 3].map(i => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  { backgroundColor: i === step ? currentThemeData.accent : '#2A2F45' },
                  i === step && { width: 18 }
                ]} 
              />
            ))}
          </View>
        </Animated.View>

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (date) storeSetReminderTime(date);
            }}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topSection: {
    marginTop: height * 0.06,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A6BB',
    textAlign: 'center',
    lineHeight: 22,
  },
  mascotContainer: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
  },
  glowBackground: {
    position: 'absolute',
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.275,
    opacity: 0.08,
  },
  topIcon: {
    position: 'absolute',
    top: height * 0.015,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messyLines: {
    opacity: 0.3,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: height * 0.035,
  },
  glassCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.2,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubLabel: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: '500',
  },
  divider: {
    height: 1.2,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 18,
  },
  goalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalItem: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  goalText: {
    fontSize: 14,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  ctaButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#11121C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  skipBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  }
});
