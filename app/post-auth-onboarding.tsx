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
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const THEMES = [
  {
    step: 1,
    colors: ['#0F111A', '#1A1625', '#2E1B4B'],
    accent: '#8B7CFF',
    mascotColor: 'purple' as const,
    mood: 'neutral' as const,
    title: 'Yolculuğunu sana göre\nşekillendirelim',
    subtitle: 'Küçük tercihlerle Selfplace\ndaha kişisel hissedebilir.',
  },
  {
    step: 2,
    colors: ['#0F111A', '#2D1B2E', '#4A2D3C'],
    accent: '#FFD166',
    mascotColor: 'yellow' as const,
    mood: 'happy' as const,
    title: 'Sana nazikçe\nhatırlatalım',
    subtitle: 'Sadece seçtiğin zamanda,\nhuzurunu bozmadan küçük\nbir bildirim.',
  },
  {
    step: 3,
    colors: ['#0F111A', '#0C1621', '#1A2A3A'],
    accent: '#55E6C1',
    mascotColor: 'green' as const,
    mood: 'happy' as const,
    title: 'Hazırsın',
    subtitle: 'Bu alan tamamen senin.\nKendine ayıracağın küçük\nbir anla başlayabilirsin.',
  }
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    floatAnim.value = withRepeat(
      withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const handleNext = async () => {
    if (step < 3) {
      fadeAnim.value = withTiming(0, { duration: 400 });
      slideAnim.value = withTiming(-20, { duration: 400 });
      
      setTimeout(() => {
        setStep(prev => prev + 1);
        slideAnim.value = 20;
        fadeAnim.value = withTiming(1, { duration: 500 });
        slideAnim.value = withTiming(0, { duration: 500 });
      }, 400);

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

        {/* MIDDLE: MASCOT AREA */}
        <View style={styles.mascotContainer}>
          <View style={[styles.glowBackground, { backgroundColor: currentThemeData.accent }]} />
          
          <Animated.View style={[styles.topIcon, floatingStyle]}>
            {step === 1 && <View style={styles.messyLines}><Ionicons name="infinite" size={40} color={currentThemeData.accent} opacity={0.3} /></View>}
            {step === 2 && <Ionicons name="notifications-outline" size={32} color={currentThemeData.accent} />}
            {step === 3 && <Ionicons name="heart-outline" size={32} color={currentThemeData.accent} />}
          </Animated.View>

          <MascotBlob mood={currentThemeData.mood} color={currentThemeData.mascotColor} />
        </View>

        {/* BOTTOM: INTERACTION AREA */}
        <Animated.View style={[styles.bottomSection, contentStyle]}>
          <View style={[styles.glassCard, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
            {step === 1 && (
              <>
                <View style={styles.controlRow}>
                  <View>
                    <Text style={styles.cardLabel}>Günlük Hatırlatıcı</Text>
                    <Text style={styles.cardSubLabel}>Kendine ayıracağın o vakti sana hatırlatalım.</Text>
                  </View>
                  <Switch 
                    value={remindersEnabled} 
                    onValueChange={(val) => { storeToggleReminders(val); }}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: currentThemeData.accent }}
                    thumbColor="#FFF"
                    ios_backgroundColor="rgba(255,255,255,0.1)"
                  />
                </View>

                <View style={styles.divider} />

                <Text style={[styles.cardLabel, { marginBottom: 12 }]}>Günlük Hedefin</Text>
                <Text style={[styles.cardSubLabel, { marginBottom: 16 }]}>Günde kaç dakika kendine ayırmak istersin?</Text>
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
                        dailyGoal === val && { backgroundColor: currentThemeData.accent, borderColor: currentThemeData.accent }
                      ]}
                    >
                      <Text style={[styles.goalText, dailyGoal === val && { color: '#0F111A' }]}>{val} dk</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {step === 2 && (
              <View style={styles.controlRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardLabel}>Bildirim İzni</Text>
                  <Text style={styles.cardSubLabel}>Zihnini dinlendirme vaktin geldiğinde sana fısıldayalım.</Text>
                </View>
                <Switch 
                  value={remindersEnabled} 
                  onValueChange={(val) => { storeToggleReminders(val); }}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: currentThemeData.accent }}
                  thumbColor="#FFF"
                  ios_backgroundColor="rgba(255,255,255,0.1)"
                />
              </View>
            )}

            {step === 3 && (
              <View style={styles.welcomeRow}>
                <View style={[styles.welcomeIconCircle, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                   <Ionicons name="heart" size={20} color={currentThemeData.accent} />
                </View>
                <Text style={styles.welcomeText}>Selfplace&apos;e hoş geldin, seni burada görmek çok güzel.</Text>
              </View>
            )}
          </View>

          <AnimatedPressable 
            onPress={handleNext}
            onPressIn={() => { buttonPressScale.value = withTiming(0.97, { duration: 100 }); }}
            onPressOut={() => { buttonPressScale.value = withTiming(1, { duration: 100 }); }}
            style={[styles.ctaButton, buttonStyle, { backgroundColor: step === 1 ? '#FFF' : '#1A1625' }]}
          >
            <Text style={[styles.ctaText, { color: step === 1 ? '#0F111A' : '#FFF' }]}>
              {step === 3 ? "Uygulamaya Gir" : step === 2 ? "İzin Ver ve Devam Et" : "Devam Et"}
            </Text>
          </AnimatedPressable>

          {step === 2 && (
            <TouchableOpacity onPress={() => handleNext()} style={styles.skipBtn}>
              <Text style={styles.skipText}>Şimdi Değil</Text>
            </TouchableOpacity>
          )}

          <View style={styles.dotsRow}>
            {[1, 2, 3].map(i => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  { backgroundColor: i === step ? currentThemeData.accent : 'rgba(255,255,255,0.1)' },
                  i === step && { width: 16 }
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
    marginTop: height * 0.07, // Slightly reduced to give more air below
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16, // Increased breathing space
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)', // Slightly more muted for air
    textAlign: 'center',
    lineHeight: 24, // Increased line height for breathability
  },
  mascotContainer: {
    flex: 1.2, // Give more room to mascot area
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20, // Separation from text and cards
  },
  glowBackground: {
    position: 'absolute',
    width: width * 0.6, // Reduced from 0.8
    height: width * 0.6,
    borderRadius: width * 0.3,
    opacity: 0.08, // More subtle
  },
  topIcon: {
    position: 'absolute',
    top: height * 0.02, // Lowered slightly
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messyLines: {
    opacity: 0.3,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: height * 0.05, // Dynamic bottom padding
  },
  glassCard: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24, // Increased spacing
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cardSubLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
    maxWidth: width * 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 20,
  },
  goalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  goalItem: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  goalText: {
    color: '#FFF',
    fontWeight: '600',
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 22,
  },
  ctaButton: {
    height: 60,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
  },
  skipBtn: {
    alignItems: 'center',
    marginTop: 16,
  },
  skipText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 15,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  }
});



