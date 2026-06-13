import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState, AppStateStatus } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../../components/GradientBackground';
import client from '../../api/client';
import usePersonalitySessionStore from '../../store/usePersonalitySessionStore';
import useThemeStore from '../../store/useThemeStore';
import { logger } from '../../utils/logger';

interface Option {
  text: string;
  weights: Record<string, number>;
}

const INTERSTITIALS = [
  "Cevapların iç dünyandaki bazı sessiz desenleri ortaya çıkarıyor...",
  "Duygusal ritmini yavaş yavaş hissetmeye başlıyoruz...",
  "Kendini ifade etme biçimin eşsiz bir hikaye anlatıyor...",
  "Enerjinin gerçek rengi belirginleşiyor..."
];

export default function PersonalityTestScreen() {
  useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { currentTheme } = useThemeStore();
  
  const { 
    isActive, questions, currentIndex, answers, dimensionScores, sessionFingerprint, queueHash,
    renderedQuestionIds, renderedSemanticTags, consecutiveSkipCount,
    startSession, answerQuestion, nextQuestion, endSession,
    markQuestionAsRendered, incrementSkipCount, rebuildQueue
  } = usePersonalitySessionStore();
  
  const currentQuestion = questions[currentIndex];
  const lastCheckedIndexRef = useRef<number>(-1);
  
  const [loading, setLoading] = useState(!isActive);
  const [submitting, setSubmitting] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialText, setInterstitialText] = useState("");
  const [duplicateAlert, setDuplicateAlert] = useState<string | null>(null);
  const [criticalRecovery, setCriticalRecovery] = useState(false);

  // Reset lastCheckedIndexRef when isActive session state changes
  useEffect(() => {
    lastCheckedIndexRef.current = -1;
  }, [isActive]);

  const submitTest = useCallback(async (finalAnswers: Record<string, number>) => {
    setSubmitting(true);
    setInterstitialText("Sonuçların sentezleniyor... Bu biraz zaman alabilir.");
    setShowInterstitial(true);
    
    console.log('[DEBUG-SUBMIT] Submitting test answers. Fingerprint:', sessionFingerprint);
    
    try {
      const res = await client.post(`/personality/tests/journey/submit`, { answers: finalAnswers });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      endSession();
      router.replace({
        pathname: '/personality-result-detail',
        params: { id: res.data.id }
      });
    } catch (err: any) {
      logger.error(`[PersonalityTest] Error submitting test answers`, err);
      setSubmitting(false);
      setShowInterstitial(false);
      setTimeout(() => router.back(), 1500);
    }
  }, [endSession, router, sessionFingerprint]);

  // Helper log function to output complete queue status
  const logRuntimeQueueState = useCallback((context: string) => {
    if (!isActive || questions.length === 0) return;
    const currentHash = questions.map(q => q.id).join('-');
    console.log(`[DEBUG-QUEUE] Context: ${context} | Fingerprint: ${sessionFingerprint} | Index: ${currentIndex} | Hash: ${currentHash}`);
    console.log(`[DEBUG-QUEUE-IDS]`, questions.map(q => q.id));

    if (queueHash && currentHash !== queueHash) {
      logger.error(`[QUEUE MUTATION DETECTED] EXPECTED HASH: ${queueHash} | CURRENT HASH: ${currentHash}`);
    }
  }, [isActive, questions, sessionFingerprint, queueHash, currentIndex]);

  // 1. Log on every render and check queue hash integrity
  useEffect(() => {
    logRuntimeQueueState('render');
  });

  const fetchTest = useCallback(async () => {
    try {
      const res = await client.get(`/personality/tests/journey`);
      if (res.data && res.data.test && res.data.test.questions) {
        console.log('[DEBUG-FETCH] Received test from backend. Fingerprint:', res.data.test.sessionFingerprint);
        startSession(res.data.test.questions, res.data.test.sessionFingerprint || 'legacy-none');
      } else {
        throw new Error('Invalid test data');
      }
    } catch (err: any) {
      logger.error(`[PersonalityTest] Error fetching test`, err);
      setTimeout(() => router.back(), 2000);
    } finally {
      setLoading(false);
    }
  }, [startSession, router]);

  // 2. Lock down useEffect to disable all automatic refetch systems
  useEffect(() => {
    if (!isActive) {
      console.log('[DEBUG-SESSION] No active session. Fetching test...');
      fetchTest();
    } else {
      console.log('[DEBUG-SESSION] Session already active. Fingerprint:', sessionFingerprint, 'Questions count:', questions.length);
      setLoading(false);
    }
  }, [isActive, fetchTest, sessionFingerprint, questions.length]);

  // 3. Navigation focus listeners
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[DEBUG-FOCUS] Screen focused. Fingerprint:', sessionFingerprint, 'Current Index:', currentIndex);
      logRuntimeQueueState('focus');
    });
    return unsubscribe;
  }, [navigation, sessionFingerprint, currentIndex, logRuntimeQueueState]);

  // 4. AppState listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('[DEBUG-APPSTATE] AppState changed to:', nextAppState, 'Fingerprint:', sessionFingerprint);
      logRuntimeQueueState(`appstate-${nextAppState}`);
    });
    return () => {
      subscription.remove();
    };
  }, [sessionFingerprint, logRuntimeQueueState]);

  // 5. Runtime Render Registry & Self-Healing Protection
  useEffect(() => {
    if (!isActive || questions.length === 0) return;

    // Remaining Queue Validator & Graceful End
    const isOutOfQuestions = currentIndex >= questions.length;
    if (isOutOfQuestions) {
      console.log('[DEBUG-QUEUE] No remaining questions left in the queue. Gracefully auto-submitting existing answers...');
      submitTest(answers);
      return;
    }

    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    // A. ID Duplicate Protection
    const isIdRendered = renderedQuestionIds.includes(currentQ.id);

    // B. Semantic Overlap Protection
    let overlapCount = 0;
    const overlappingTags: string[] = [];
    if (currentQ.semanticTags) {
      currentQ.semanticTags.forEach(tag => {
        if (renderedSemanticTags.includes(tag)) {
          overlapCount++;
          overlappingTags.push(tag);
        }
      });
    }

    // Determine if we need to skip
    let shouldSkip = false;
    let skipReason = "";

    if (isIdRendered) {
      shouldSkip = true;
      skipReason = `Question ID "${currentQ.id}" already rendered earlier in session.`;
    } else if (overlapCount >= 2) {
      shouldSkip = true;
      skipReason = `Shares ${overlapCount} semantic tags [${overlappingTags.join(', ')}] with rendered questions.`;
    }

    // Check if we are in infinite skip protection (consecutiveSkipCount >= 5)
    if (consecutiveSkipCount >= 5) {
      logger.error('[CRITICAL RECOVERY MODE] Infinite skip loop detected (skips >= 5). Freezing navigation, rebuilding clean queue...');
      setCriticalRecovery(true);
      
      // Perform recovery rebuild: purge duplicate/rendered IDs from remaining queue
      rebuildQueue();
      
      setTimeout(() => {
        setCriticalRecovery(false);
      }, 1500); // show recovery loader briefly for visual transition
      return;
    }

    // Gate duplicate check using useRef index tracker
    if (lastCheckedIndexRef.current === currentIndex) {
      return; // Already processed this question index, skip redundant checks/updates
    }

    if (shouldSkip) {
      console.warn(`[SKIP DETECTED] id: ${currentQ.id}, dimension: ${currentQ.dimension}, type: ${currentQ.type}, reason: ${skipReason}`);
      setDuplicateAlert(skipReason);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Increment skip count and move to next question immediately
      incrementSkipCount();
      nextQuestion();
    } else {
      // Clear alert, mark as successfully rendered
      setDuplicateAlert(null);
      lastCheckedIndexRef.current = currentIndex;
      markQuestionAsRendered(currentQ.id, currentQ.semanticTags);
    }
  }, [
    currentIndex,
    questions,
    isActive,
    answers,
    consecutiveSkipCount,
    renderedQuestionIds,
    renderedSemanticTags,
    incrementSkipCount,
    nextQuestion,
    markQuestionAsRendered,
    rebuildQueue,
    submitTest
  ]);



  const handleSelectOption = async (questionId: string, optionIndex: number, option: Option) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // 1. Commit answer to Zustand session store securely
    answerQuestion(questionId, optionIndex, option.weights || {});

    console.log(`[DEBUG-ANSWER] Answered: ${questionId} with index ${optionIndex}. Next index: ${currentIndex + 1}`);
    logRuntimeQueueState('answer');

    // 2. Predict adaptive behavior
    const nIdx = currentIndex + 1;
    const currentMaxScore = Math.max(0, ...Object.values(dimensionScores).map(v => Math.abs(v)));
    
    let shouldEndEarly = false;
    if (nIdx >= 20 && nIdx < 35 && currentMaxScore >= 18) {
      shouldEndEarly = true; // Very high confidence
    } else if (nIdx >= 35 && currentMaxScore >= 12) {
      shouldEndEarly = true; // Normal confidence
    }

    // 3. Next step execution
    if (shouldEndEarly || nIdx >= questions.length) {
      const finalAnswers = { ...answers, [questionId]: optionIndex };
      submitTest(finalAnswers);
      return;
    }

    if (nIdx % 12 === 0) {
      const textIndex = (nIdx / 12 - 1) % INTERSTITIALS.length;
      setInterstitialText(INTERSTITIALS[textIndex]);
      setShowInterstitial(true);
      setTimeout(() => {
        setShowInterstitial(false);
        nextQuestion();
      }, 3000);
    } else {
      setTimeout(() => {
        nextQuestion();
      }, 400);
    }
  };


  if (criticalRecovery || !currentQuestion) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginBottom: 20 }} />
          <Text style={{ color: currentTheme.colors.text.primary, fontSize: 18, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40 }}>
            Yolculuk Yapılandırılıyor... ✨
          </Text>
          <Text style={{ color: currentTheme.colors.text.secondary, fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 40 }}>
            Uyumlu duygusal rota yeniden hesaplanıyor.
          </Text>
        </View>
      </GradientBackground>
    );
  }

  if (loading) {
    return (

      <GradientBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  if ((!isActive || questions.length === 0)) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <Text style={{ color: currentTheme.colors.text.primary, fontSize: 16, marginBottom: 20, textAlign: 'center', paddingHorizontal: 24 }}>
            Test yüklenemedi. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: currentTheme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 }}
            onPress={() => { endSession(); router.back(); }}
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

  // Calculate dynamic progress (assume max ~40 for visual scale, but cap at 100)
  const progress = Math.min(100, ((currentIndex + 1) / 40) * 100);

  return (
    <GradientBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { endSession(); router.back(); }} style={styles.backBtn} disabled={submitting}>
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
                      backgroundColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.card,
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
  },
  devOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    zIndex: 9999,
  },
  devOverlayText: {
    color: '#00FF66',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 14,
  }
});
