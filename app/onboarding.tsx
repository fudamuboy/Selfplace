import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing,
  withDelay,
  withSpring,
  interpolate
} from 'react-native-reanimated';
import { CustomButton } from '../components/CustomButton';
import { GradientBackground } from '../components/GradientBackground';
import { MascotBlob } from '../components/MascotBlob';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import { CONTENT_MAX_WIDTH, isTablet } from '../constants/Layout';
import { useT } from '../i18n';

const OnboardingMoodCard = ({ mood, isSelected, onSelect, theme }: { mood: any, isSelected: boolean, onSelect: () => void, theme: any }) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 300 });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isSelected ? 1.05 : scale.value) }],
      backgroundColor: isSelected ? theme.colors.glow : 'transparent',
      borderColor: withSpring(isSelected ? theme.colors.primary : theme.colors.cardBorder),
      borderWidth: 1.5,
      shadowColor: theme.colors.primary,
      shadowOpacity: interpolate(glowOpacity.value, [0, 1], [0, 0.2]),
      shadowRadius: 15,
      elevation: interpolate(glowOpacity.value, [0, 1], [0, 5]),
    };
  });

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSelect();
      }}
      style={styles.moodCardWrapper}
    >
      <Animated.View style={[styles.moodCard, animatedStyle]}>
        <Image 
          source={mood.image} 
          style={styles.sticker} 
          contentFit="contain"
          transition={200}
        />
        <Text style={[
          styles.moodLabel, 
          { color: isSelected ? theme.colors.text.primary : theme.colors.text.secondary },
          isSelected && { fontWeight: '700' }
        ]}>{mood.label}</Text>
      </Animated.View>
    </Pressable>
  );
};

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { setOnboardingCompleted } = useAuthStore();
  const { t, language } = useT();
  const isEn = language === 'en';

  const ONBOARDING_GOALS = [
    { id: 'Self-understanding', label: t('goals.selfUnderstandingTitle'), subtitle: t('goals.selfUnderstandingSub') },
    { id: 'Relationship growth', label: t('goals.relationshipGrowthTitle'), subtitle: t('goals.relationshipGrowthSub') },
    { id: 'Emotional balance', label: t('goals.emotionalBalanceTitle'), subtitle: t('goals.emotionalBalanceSub') },
    { id: 'Stress reduction', label: t('goals.stressReductionTitle'), subtitle: t('goals.stressReductionSub') },
    { id: 'Personal development', label: t('goals.personalDevelopmentTitle'), subtitle: t('goals.personalDevelopmentSub') }
  ];

  const MOOD_DATA = [
    { id: 'Mutlu', label: isEn ? 'Happy' : 'Mutlu', image: require('../assets/images/stickers/mutlu.png'), response: isEn ? 'Your light brightens everything.' : 'Işığın her yeri aydınlatıyor.' },
    { id: 'Sakin', label: isEn ? 'Calm' : 'Sakin', image: require('../assets/images/stickers/sakin.png'), response: isEn ? 'Enjoy the quiet peace.' : 'Huzurun tadını çıkar.' },
    { id: 'Yorgun', label: isEn ? 'Tired' : 'Yorgun', image: require('../assets/images/stickers/yorgun.png'), response: isEn ? 'Resting is your fundamental right.' : 'Dinlenmek en büyük hakkın.' },
    { id: 'Üzgün', label: isEn ? 'Sad' : 'Üzgün', image: require('../assets/images/stickers/uzgun.png'), response: isEn ? 'You are not alone in this feeling.' : 'Bu hisle yalnız değilsin.' },
    { id: 'Kaygılı', label: isEn ? 'Anxious' : 'Kaygılı', image: require('../assets/images/stickers/kaygili.png'), response: isEn ? 'Slow down, this will pass.' : 'Yavaşla, her şey geçecek.' },
  ];

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('onboardingGoals', JSON.stringify(selectedGoals));
      await setOnboardingCompleted(true);
      router.replace('/(auth)/register');
    } catch (error) {
      console.error('Failed to finish onboarding:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.mascotWrapper}>
              <MascotBlob mood="calm" />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>
                {t('onboarding.welcomeTitle')}
              </Text>
              <Text style={[styles.subtitleText, { color: currentTheme.colors.text.secondary }]}>
                {t('onboarding.welcomeSubtitle')}
              </Text>
            </View>

            <View style={styles.buttonWrapper}>
              <CustomButton 
                title={t('onboarding.getStarted')} 
                onPress={() => setStep(2)} 
                style={styles.button}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <Animated.View entering={FadeIn.duration(1000)} style={styles.stepContainer}>
            <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>
              {t('checkIn.moodQuestion')}
            </Text>
            
            <View style={styles.gridContainer}>
              <View style={styles.row}>
                {MOOD_DATA.slice(0, 3).map((mood) => (
                  <OnboardingMoodCard
                    key={mood.id}
                    mood={mood}
                    isSelected={selectedMood === mood.id}
                    onSelect={() => setSelectedMood(mood.id)}
                    theme={currentTheme}
                  />
                ))}
              </View>
              <View style={[styles.row, { paddingHorizontal: 40 }]}>
                {MOOD_DATA.slice(3).map((mood) => (
                  <OnboardingMoodCard
                    key={mood.id}
                    mood={mood}
                    isSelected={selectedMood === mood.id}
                    onSelect={() => setSelectedMood(mood.id)}
                    theme={currentTheme}
                  />
                ))}
              </View>
            </View>

            {selectedMood && (
              <Animated.Text entering={FadeIn} style={[styles.moodResponse, { color: currentTheme.colors.primary }]}>
                {MOOD_DATA.find(m => m.id === selectedMood)?.response}
              </Animated.Text>
            )}

            <View style={[styles.buttonWrapper, { marginTop: 40 }]}>
              <CustomButton 
                title={t('common.next')} 
                onPress={() => setStep(3)} 
                style={styles.button}
                disabled={!selectedMood}
              />
            </View>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View entering={FadeIn.duration(1000)} style={styles.stepContainer}>
            <Text style={[styles.title, { color: currentTheme.colors.text.primary, marginBottom: 12 }]}>
              {t('onboarding.goalsTitle')}
            </Text>
            <Text style={[styles.subtitleText, { color: currentTheme.colors.text.secondary, marginBottom: 24, textAlign: 'center' }]}>
              {t('onboarding.goalsSubtitle')}
            </Text>

            <View style={styles.goalsContainer}>
              {ONBOARDING_GOALS.map((goal) => {
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (isSelected) {
                        setSelectedGoals(prev => prev.filter(id => id !== goal.id));
                      } else {
                        setSelectedGoals(prev => [...prev, goal.id]);
                      }
                    }}
                    style={[
                      styles.goalCard,
                      {
                        backgroundColor: isSelected ? currentTheme.colors.glow : currentTheme.colors.card,
                        borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBorder,
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.goalTextWrapper}>
                      <Text style={[styles.goalLabel, { color: currentTheme.colors.text.primary }]}>
                        {goal.label}
                      </Text>
                      <Text style={[styles.goalSubtitle, { color: currentTheme.colors.text.secondary }]}>
                        {goal.subtitle}
                      </Text>
                    </View>
                    <View style={[
                      styles.goalCheckbox,
                      {
                        borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.text.muted,
                        backgroundColor: isSelected ? currentTheme.colors.primary : 'transparent',
                      }
                    ]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.buttonWrapper, { marginTop: 32 }]}>
              <CustomButton
                title={t('common.next')}
                onPress={() => setStep(4)}
                style={styles.button}
                disabled={selectedGoals.length === 0}
              />
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View entering={FadeIn.duration(1000)} style={styles.stepContainer}>
            <View style={styles.finalMascot}>
              <MascotBlob mood="happy" />
            </View>
            <View style={styles.finalTextContainer}>
              <Text style={[styles.finalText, { color: currentTheme.colors.text.primary }]}>
                {isEn ? "This space is yours." : "Bu alan senin."}
              </Text>
              <Text style={[styles.finalText, { color: currentTheme.colors.text.primary }]}>
                {isEn ? "No pressure." : "Zorunda değilsin."}
              </Text>
              <Text style={[styles.finalText, { color: currentTheme.colors.text.primary }]}>
                {isEn ? "Just be yourself." : "Sadece kendin ol."}
              </Text>
            </View>

            <View style={styles.finalActions}>
              <CustomButton 
                title={t('onboarding.getStarted')} 
                onPress={handleFinish} 
                style={styles.button}
              />
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.innerContent}>
          {renderStep()}
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContent: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignItems: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    width: '100%',
  },
  mascotWrapper: {
    marginBottom: 40,
  },
  textContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softText: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 60,
  },
  button: {
    width: '100%',
    height: 60,
    borderRadius: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 48,
  },
  gridContainer: {
    gap: 16,
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  moodCardWrapper: {
    width: isTablet ? 120 : 100,
    aspectRatio: 0.85,
  },
  moodCard: {
    flex: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  sticker: {
    width: 65,
    height: 65,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  moodLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  moodResponse: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
    height: 24,
  },
  finalMascot: {
    marginBottom: 40,
    transform: [{ scale: 0.8 }],
  },
  finalTextContainer: {
    marginBottom: 60,
    alignItems: 'center',
  },
  finalText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  finalActions: {
    width: '100%',
    gap: 20,
  },
  goalsContainer: {
    width: '100%',
    gap: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    width: '100%',
  },
  goalTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'left',
  },
  goalSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'left',
  },
  goalCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

