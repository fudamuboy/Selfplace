import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, Dimensions, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MascotBlob } from '../components/MascotBlob';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSpring,
  Easing,
  interpolate,
  withSequence
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const THEMES = [
  {
    step: 1,
    colors: ['#0F0F1A', '#1C1F3A', '#8B7CFF'],
    mascotColor: 'purple' as const,
    mood: 'calm' as const,
    title: 'Yolculuğunu sana göre şekillendirelim',
    subtitle: 'Küçük tercihlerle Selfplace daha kişisel hissedebilir.',
    buttonGlow: '#8B7CFF',
  },
  {
    step: 2,
    colors: ['#0F0F1A', '#2D2200', '#FFD166'],
    mascotColor: 'yellow' as const,
    mood: 'happy' as const,
    title: 'Sana nazikçe hatırlatalım',
    subtitle: 'Sadece seçtiğin zamanda, huzurunu bozmadan küçük bir bildirim.',
    buttonGlow: '#FFD166',
  },
  {
    step: 3,
    colors: ['#0F0F1A', '#062E25', '#55E6C1'],
    mascotColor: 'green' as const,
    mood: 'happy' as const,
    title: 'Hazırsın',
    subtitle: 'Bu alan tamamen senin. Kendine ayıracağın küçük bir anla başlayabilirsin.',
    buttonGlow: '#55E6C1',
  }
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PostAuthOnboardingScreen() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { setPostAuthOnboardingCompleted } = useAuthStore();

  // Personalization State
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(21, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10); // 5, 10, 15

  // Animations
  const mascotScale = useSharedValue(1);
  const floatAnim = useSharedValue(0);
  const fadeAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const buttonPressScale = useSharedValue(1);

  useEffect(() => {
    mascotScale.value = withRepeat(
      withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    floatAnim.value = withRepeat(
      withTiming(-10, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const handleNext = async () => {
    buttonPressScale.value = withSequence(withTiming(0.95, { duration: 100 }), withTiming(1, { duration: 100 }));
    
    if (step < 3) {
      fadeAnim.value = withTiming(0, { duration: 300 });
      slideAnim.value = withTiming(-20, { duration: 300 });
      
      setTimeout(() => {
        setStep(prev => prev + 1);
        slideAnim.value = 20;
        fadeAnim.value = withTiming(1, { duration: 400 });
        slideAnim.value = withTiming(0, { duration: 400 });
      }, 300);

      if (step === 2 && remindersEnabled) {
        await Notifications.requestPermissionsAsync();
      }
    } else {
      await AsyncStorage.setItem('remindersEnabled', remindersEnabled ? 'true' : 'false');
      await AsyncStorage.setItem('reminderTime', reminderTime.toISOString());
      await AsyncStorage.setItem('dailyGoal', dailyGoal.toString());
      await setPostAuthOnboardingCompleted(true);
      router.replace('/(tabs)');
    }
  };

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

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

  const renderCTAButton = (title: string) => (
    <AnimatedPressable 
      onPress={handleNext}
      onPressIn={() => { buttonPressScale.value = withTiming(0.97, { duration: 100 }); }}
      onPressOut={() => { buttonPressScale.value = withTiming(1, { duration: 100 }); }}
      style={[styles.ctaButton, buttonStyle, { shadowColor: currentThemeData.buttonGlow }]}
    >
      <LinearGradient
        colors={[currentThemeData.buttonGlow, currentThemeData.colors[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.ctaGradient}
      >
        <Text style={styles.ctaText}>{title}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );

  return (
    <LinearGradient colors={currentThemeData.colors} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* TOP: TEXT SECTION */}
        <Animated.View style={[styles.topSection, contentStyle]}>
          <Text style={styles.title}>{currentThemeData.title}</Text>
          <Text style={styles.subtitle}>{currentThemeData.subtitle}</Text>
        </Animated.View>

        {/* MIDDLE: MASCOT AREA */}
        <View style={styles.mascotContainer}>
          <View style={[styles.glowBackground, { backgroundColor: currentThemeData.buttonGlow }]} />
          
          {step === 2 && (
            <Animated.View style={[styles.topIcon, floatingStyle]}>
              <View style={styles.iconGlow}>
                <Ionicons name="notifications" size={32} color="#FFF" />
              </View>
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View style={[styles.topIcon, floatingStyle]}>
              <View style={styles.iconGlow}>
                <Ionicons name="heart" size={32} color="#FFF" />
              </View>
            </Animated.View>
          )}

          <Animated.View style={mascotStyle}>
            <MascotBlob mood={currentThemeData.mood} color={currentThemeData.mascotColor} />
          </Animated.View>
        </View>

        {/* BOTTOM: INTERACTION AREA */}
        <Animated.View style={[styles.bottomSection, contentStyle]}>
          <View style={styles.glassCard}>
            {step === 1 && (
              <>
                <View style={styles.controlRow}>
                  <View>
                    <Text style={styles.cardLabel}>Günlük Hatırlatıcı</Text>
                    <Text style={styles.cardSubLabel}>Kendine ayıracağın o vakti sana hatırlatalım.</Text>
                  </View>
                  <Switch 
                    value={remindersEnabled} 
                    onValueChange={setRemindersEnabled}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: currentThemeData.buttonGlow }}
                    thumbColor="#FFF"
                  />
                </View>

                {remindersEnabled && (
                  <TouchableOpacity 
                    style={[styles.timeBtn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color="#FFF" />
                    <Text style={styles.timeBtnText}>
                      {reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.divider} />

                <Text style={[styles.cardLabel, { marginBottom: 12 }]}>Günlük Hedefin</Text>
                <View style={styles.goalRow}>
                  {[5, 10, 15].map(val => (
                    <TouchableOpacity 
                      key={val}
                      onPress={() => setDailyGoal(val)}
                      style={[
                        styles.goalItem,
                        dailyGoal === val && { backgroundColor: currentThemeData.buttonGlow }
                      ]}
                    >
                      <Text style={[styles.goalText, dailyGoal === val && { color: '#000' }]}>{val} dk</Text>
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
                  onValueChange={setRemindersEnabled}
                  trackColor={{ false: 'rgba(255,255,255,0.1)', true: currentThemeData.buttonGlow }}
                  thumbColor="#FFF"
                />
              </View>
            )}

            {step === 3 && (
              <View style={styles.welcomeRow}>
                <View style={styles.welcomeIconCircle}>
                   <Ionicons name="sparkles" size={20} color={currentThemeData.buttonGlow} />
                </View>
                <Text style={styles.welcomeText}>Selfplace'e hoş geldin, seni burada görmek çok güzel.</Text>
              </View>
            )}
          </View>

          {renderCTAButton(step === 3 ? "Uygulamaya Gir" : step === 2 ? "İzin Ver ve Devam Et" : "Devam Et")}

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
                  { backgroundColor: i === step ? '#FFF' : 'rgba(255,255,255,0.2)' },
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
              if (date) setReminderTime(date);
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
    paddingHorizontal: 24,
  },
  topSection: {
    marginTop: height * 0.05,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  mascotContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBackground: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.15,
  },
  topIcon: {
    position: 'absolute',
    top: 40,
    zIndex: 10,
  },
  iconGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  bottomSection: {
    marginBottom: 40,
    marginTop: 20,
  },
  glassCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFF',
  },
  cardSubLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    maxWidth: width * 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 20,
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  timeBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalItem: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  goalText: {
    color: '#FFF',
    fontWeight: '600',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  welcomeText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 22,
  },
  ctaButton: {
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  skipBtn: {
    alignItems: 'center',
    marginTop: 20,
    padding: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    fontWeight: '500',
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



