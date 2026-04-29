import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, Switch, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { CustomButton } from '../components/CustomButton';
import { GradientBackground } from '../components/GradientBackground';
import { MascotBlob } from '../components/MascotBlob';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState(new Date(new Date().setHours(21, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(10);
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { token } = useAuthStore();

  const mascotScale = useSharedValue(1);

  useEffect(() => {
    if (step === 1) {
      mascotScale.value = withRepeat(
        withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }
  }, [step]);

  const animatedMascotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      await AsyncStorage.setItem('userPreferences', JSON.stringify({
        remindersEnabled,
        reminderTime: reminderTime.toISOString(),
        dailyGoal,
      }));
      
      if (token) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Onboarding Error:', error);
      router.replace('/(auth)/login');
    }
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    await handleNext();
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
            <Animated.View style={[styles.mascotWrapper, animatedMascotStyle]}>
              <MascotBlob />
            </Animated.View>
            <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>
              Kendinle küçük anlar yarat
            </Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>
              Her gün birkaç dakika ayırarak kendini daha iyi anlayabilirsin.
            </Text>
            <CustomButton title="Devam Et" onPress={handleNext} style={styles.button} />
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
            <Text style={[styles.title, { color: currentTheme.colors.text.primary, marginBottom: 40 }]}>
              Sana göre şekillensin
            </Text>
            
            <View style={styles.optionRow}>
              <Text style={[styles.optionLabel, { color: currentTheme.colors.text.primary }]}>Günlük hatırlatıcı açık mı?</Text>
              <Switch
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
                trackColor={{ false: '#767577', true: currentTheme.colors.primary }}
                thumbColor={remindersEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            {remindersEnabled && (
              <Pressable 
                style={[styles.timeSelector, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={[styles.timeLabel, { color: currentTheme.colors.text.secondary }]}>Hatırlatma saati</Text>
                <Text style={[styles.timeValue, { color: currentTheme.colors.text.primary }]}>
                  {reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selectedDate) setReminderTime(selectedDate);
                }}
              />
            )}

            <View style={styles.goalSection}>
              <Text style={[styles.goalLabel, { color: currentTheme.colors.text.secondary }]}>
                Günde kaç dakika ayırmak istersin?
              </Text>
              <View style={styles.goalOptions}>
                {[5, 10, 15].map((mins) => (
                  <Pressable
                    key={mins}
                    style={[
                      styles.goalOption,
                      { backgroundColor: currentTheme.colors.card, borderColor: dailyGoal === mins ? currentTheme.colors.primary : currentTheme.colors.cardBorder }
                    ]}
                    onPress={() => setDailyGoal(mins)}
                  >
                    <Text style={[styles.goalOptionText, { color: dailyGoal === mins ? currentTheme.colors.primary : currentTheme.colors.text.primary }]}>
                      {mins} dk
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <CustomButton title="Devam Et" onPress={handleNext} style={styles.button} />
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.stepContainer}>
            <View style={styles.permissionIconContainer}>
              <Text style={styles.permissionIcon}>🔔</Text>
            </View>
            <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>
              Sana nazikçe hatırlatalım
            </Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>
              Sadece istediğin zaman, seni rahatsız etmeden.
            </Text>
            <CustomButton title="Başla" onPress={requestNotificationPermission} style={styles.button} />
          </Animated.View>
        );
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {step < 3 && (
          <Pressable style={styles.skipButton} onPress={finishOnboarding}>
            <Text style={[styles.skipText, { color: currentTheme.colors.text.secondary }]}>Atla</Text>
          </Pressable>
        )}
        {renderStep()}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    padding: 8,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  stepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mascotWrapper: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    paddingHorizontal: 20,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 30,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 20,
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  timeSelector: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  timeLabel: {
    fontSize: 15,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalSection: {
    width: '100%',
    marginBottom: 50,
  },
  goalLabel: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  goalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  goalOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  permissionIcon: {
    fontSize: 40,
  },
});

