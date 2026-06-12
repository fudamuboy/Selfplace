import re

with open('app/personality-test/[type].tsx', 'r') as f:
    content = f.read()

new_content = """import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../../components/GradientBackground';
import client from '../../api/client';
import useThemeStore from '../../store/useThemeStore';

const { width } = Dimensions.get('window');

interface Option {
  text: string;
  weights: Record<string, number>;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

interface TestData {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

const INTERSTITIALS = [
  "Cevapların iç dünyandaki bazı sessiz desenleri ortaya çıkarıyor...",
  "Duygusal ritmini yavaş yavaş hissetmeye başlıyoruz...",
  "Kendini ifade etme biçimin eşsiz bir hikaye anlatıyor...",
  "Enerjinin gerçek rengi belirginleşiyor..."
];

export default function PersonalityTestScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  
  const [testData, setTestData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialText, setInterstitialText] = useState("");

  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTest();
  }, [type]);

  const fetchTest = async () => {
    try {
      // Force 'journey' for the new unified test
      const res = await client.get(`/personality/tests/journey`);
      setTestData(res.data.test);
    } catch (err: any) {
      console.error(`[PersonalityTest] Error fetching test:`, err.message || err);
      setTestData(null);
      setTimeout(() => router.back(), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (questionId: string, optionIndex: number, option: Option) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Update local scores for confidence tracking
    const newScores = { ...dimensionScores };
    if (option.weights) {
      for (const [dim, weight] of Object.entries(option.weights)) {
        newScores[dim] = (newScores[dim] || 0) + weight;
      }
    }
    setDimensionScores(newScores);

    const newAnswers = { ...answers, [questionId]: optionIndex };
    setAnswers(newAnswers);

    const nextIndex = currentIndex + 1;
    
    // Adaptive Logic
    const maxScore = Math.max(0, ...Object.values(newScores).map(v => Math.abs(v)));
    
    let shouldEndEarly = false;
    if (nextIndex >= 20 && nextIndex < 35 && maxScore >= 18) {
      shouldEndEarly = true; // Very high confidence
    } else if (nextIndex >= 35 && maxScore >= 12) {
      shouldEndEarly = true; // Normal confidence
    }

    if (shouldEndEarly || nextIndex >= (testData?.questions.length || 0)) {
      submitTest(newAnswers);
      return;
    }

    // Interstitial Logic
    if (nextIndex % 12 === 0) {
      const textIndex = (nextIndex / 12 - 1) % INTERSTITIALS.length;
      setInterstitialText(INTERSTITIALS[textIndex]);
      setShowInterstitial(true);
      setTimeout(() => {
        setShowInterstitial(false);
        setCurrentIndex(nextIndex);
      }, 3000);
    } else {
      setTimeout(() => {
        setCurrentIndex(nextIndex);
      }, 400);
    }
  };

  const submitTest = async (finalAnswers: Record<string, number>) => {
    setSubmitting(true);
    setInterstitialText("Sonuçların sentezleniyor... Bu biraz zaman alabilir.");
    setShowInterstitial(true);
    
    try {
      const res = await client.post(`/personality/tests/journey/submit`, { answers: finalAnswers });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      router.replace({
        pathname: '/personality-result-detail',
        params: { id: res.data.id }
      });
    } catch (err: any) {
      console.error(`[PersonalityTest] Error submitting test answers:`, err.message || err);
      setSubmitting(false);
      setShowInterstitial(false);
      setTimeout(() => router.back(), 1500);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  if (!testData) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <Text style={{ color: currentTheme.colors.text.primary, fontSize: 16, marginBottom: 20, textAlign: 'center', paddingHorizontal: 24 }}>
            Test yüklenemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: currentTheme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFF', fontWeight: '700' }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  if (showInterstitial) {
    return (
      <GradientBackground>
        <Animated.View entering={FadeIn.duration(800)} exiting={FadeOut.duration(800)} style={styles.interstitialContainer}>
          {submitting && <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginBottom: 20 }} />}
          <Text style={[styles.interstitialText, { color: currentTheme.colors.text.primary }]}>
            {interstitialText}
          </Text>
        </Animated.View>
      </GradientBackground>
    );
  }

  const currentQuestion = testData.questions[currentIndex];
  // Calculate dynamic progress (assume max ~40 for visual scale, but cap at 100)
  const progress = Math.min(100, ((currentIndex + 1) / 40) * 100);

  return (
    <GradientBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={submitting}>
          <Text style={[styles.backText, { color: currentTheme.colors.text.muted }]}>İptal</Text>
        </TouchableOpacity>
        
        {/* Progress Bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: currentTheme.colors.cardBorder }]}>
          <Animated.View 
            style={[styles.progressBar, { width: `${progress}%`, backgroundColor: currentTheme.colors.primary }]} 
          />
        </View>
      </View>

      <View style={styles.content}>
        <Animated.View 
          key={`q-${currentIndex}`}
          entering={FadeIn.duration(400)}
          exiting={FadeOut.duration(200)}
          style={styles.questionContainer}
        >
          <Text style={[styles.questionText, { color: currentTheme.colors.text.primary }]}>
            {currentQuestion.text}
          </Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === idx;
              return (
                <TouchableOpacity
                  key={`opt-${idx}`}
                  style={[
                    styles.optionBtn,
                    { 
                      backgroundColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBackground,
                      borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBorder
                    }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectOption(currentQuestion.id, idx, option)}
                  disabled={submitting || answers[currentQuestion.id] !== undefined}
                >
                  <Text style={[
                    styles.optionText,
                    { color: isSelected ? '#FFF' : currentTheme.colors.text.primary }
                  ]}>
                    {option.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interstitialContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  interstitialText: {
    fontSize: 22,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 34,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backBtn: {
    paddingRight: 15,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  questionContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 40,
    lineHeight: 36,
  },
  optionsContainer: {
    gap: 16,
  },
  optionBtn: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  }
});
"""

with open('app/personality-test/[type].tsx', 'w') as f:
    f.write(new_content)
