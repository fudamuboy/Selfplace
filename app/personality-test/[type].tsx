import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../../components/GradientBackground';
import client from '../../api/client';
import useThemeStore from '../../store/useThemeStore';


interface Option {
  text: string;
  value: string;
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

export default function PersonalityTestScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  
  const [testData, setTestData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTest(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [type]);

  const fetchTest = async () => {
    try {
      const res = await client.get(`/personality/tests/${type}`);
      setTestData(res.data.test);
    } catch (err: any) {
      console.error(`[PersonalityTest] Error fetching test of type "${type}":`, err.message || err);
      // Show a soft fallback if backend fails (e.g. 404 during deployment)
      setTestData(null);
      // We could use a toast here, but returning quietly is safer than crashing
      setTimeout(() => router.back(), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = async (questionId: string, value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (testData && currentIndex < testData.questions.length - 1) {
      // Small delay for UX feeling
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 400);
    } else {
      submitTest(newAnswers);
    }
  };

  const submitTest = async (finalAnswers: Record<string, string>) => {
    setSubmitting(true);
    try {
      const res = await client.post(`/personality/tests/${type}/submit`, { answers: finalAnswers });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (type === 'color') {
        router.replace({
          pathname: '/personality-result-detail',
          params: { id: res.data.id }
        });
      } else {
        router.replace({
          pathname: '/personality-results',
          params: { resultId: res.data.id }
        });
      }
    } catch (err: any) {
      console.error(`[PersonalityTest] Error submitting test answers:`, err.message || err);
      // Soft failure, return to previous screen gracefully
      setSubmitting(false);
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

  const currentQuestion = testData.questions[currentIndex];
  const progress = ((currentIndex + 1) / testData.questions.length) * 100;

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
        <Text style={[styles.progressText, { color: currentTheme.colors.text.muted }]}>
          {currentIndex + 1} / {testData.questions.length}
        </Text>
      </View>

      <View style={styles.content}>
        {submitting ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.submittingContainer}>
            <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            <Text style={[styles.submittingText, { color: currentTheme.colors.text.primary }]}>
              Yanıtların derinleşiyor...
            </Text>
          </Animated.View>
        ) : (
          <Animated.View 
            key={currentIndex}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(200)}
            style={styles.questionContainer}
          >
            <Text style={[styles.questionText, { color: currentTheme.colors.text.primary }]}>
              {currentQuestion.text}
            </Text>
            
            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, idx) => {
                const isSelected = answers[currentQuestion.id] === option.value;
                const isColorTest = testData.id === 'color';
                
                let borderColor = isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBorder;
                let textColor = isSelected ? currentTheme.colors.primary : currentTheme.colors.text.secondary;
                let shadowColor = 'transparent';

                if (isColorTest && isSelected) {
                  if (option.value === 'red') { borderColor = '#EF4444'; textColor = '#EF4444'; shadowColor = '#EF4444'; }
                  if (option.value === 'blue') { borderColor = '#3B82F6'; textColor = '#3B82F6'; shadowColor = '#3B82F6'; }
                  if (option.value === 'green') { borderColor = '#10B981'; textColor = '#10B981'; shadowColor = '#10B981'; }
                  if (option.value === 'yellow') { borderColor = '#F59E0B'; textColor = '#F59E0B'; shadowColor = '#F59E0B'; }
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => handleSelectOption(currentQuestion.id, option.value)}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: currentTheme.colors.card,
                        borderColor: borderColor,
                        shadowColor: shadowColor,
                        shadowOpacity: isSelected && isColorTest ? 0.3 : 0,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: isSelected && isColorTest ? 8 : 0
                      }
                    ]}
                  >
                    <Text style={[styles.optionText, { color: textColor }]}>
                      {option.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  backText: {
    fontSize: 15,
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    marginHorizontal: 16,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 24,
    lineHeight: 34,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  submittingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submittingText: {
    marginTop: 20,
    fontSize: 18,
    fontStyle: 'italic',
  }
});
