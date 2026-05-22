import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
} from 'react-native-reanimated';
import client from '../api/client';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { GradientBackground } from '../components/GradientBackground';
import { MascotBlob } from '../components/MascotBlob';
import { getMascotMessage } from '../utils/mascotThemeEngine';
import useThemeStore from '../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MOODS = [
  { id: 'happy', emoji: '😊', label: 'Mutlu' },
  { id: 'upset', emoji: '😔', label: 'Üzgün' },
  { id: 'angry', emoji: '😡', label: 'Kızgın' },
  { id: 'anxious', emoji: '😰', label: 'Kaygılı' },
  { id: 'tired', emoji: '😴', label: 'Yorgun' },
  { id: 'sensitive', emoji: '🥹', label: 'Hassas' },
  { id: 'motivated', emoji: '✨', label: 'Motive' },
  { id: 'calm', emoji: '🤍', label: 'Sakin' },
];

const QUESTIONS_MAP: Record<string, any[]> = {
  happy: [
    { id: 'happy_q1', text: 'Bugün seni ne mutlu etti?', type: 'text' },
    { id: 'happy_q2', text: 'Bu anı tekrar yaşamak ister misin?', type: 'text' },
    { id: 'happy_q3', text: 'Bu duygu kimle bağlantılıydı?', type: 'text' },
  ],
  anxious: [
    { id: 'anxious_q1', text: 'Seni ne kaygılandırdı?', type: 'text' },
    { id: 'anxious_q2', text: 'Bu duygu bugün kaç kez geldi?', type: 'text' },
    { id: 'anxious_q3', text: 'Bunun sebebi ne olabilir?', type: 'text' },
  ],
  upset: [
    { id: 'upset_q1', text: 'Bugün seni ne üzdü?', type: 'text' },
    { id: 'upset_q2', text: 'Bu duygu şu an nerede hissediliyor?', type: 'text' },
    { id: 'upset_q3', text: 'Kendine nasıl bir destek verebilirsin?', type: 'text' },
  ],
  angry: [
    { id: 'angry_q1', text: 'Seni ne kızdırdı?', type: 'text' },
    { id: 'angry_q2', text: 'Bu öfke sana ne söylemek istiyor?', type: 'text' },
    { id: 'angry_q3', text: 'Sakinleşmek için neye ihtiyacın var?', type: 'text' },
  ],
  tired: [
    { id: 'tired_q1', text: 'Bugün seni en çok ne yordu?', type: 'text' },
    { id: 'tired_q2', text: 'Bedeninin hangi bölgesi dinlenmek istiyor?', type: 'text' },
    { id: 'tired_q3', text: 'Kendine 5 dakika mola verebilir misin?', type: 'text' },
  ],
  sensitive: [
    { id: 'sensitive_q1', text: 'Bugün seni ne hassaslaştırdı?', type: 'text' },
    { id: 'sensitive_q2', text: 'Bu duyguya biraz alan açmak ister misin?', type: 'text' },
    { id: 'sensitive_q3', text: 'Şu an sana ne iyi gelirdi?', type: 'text' },
  ],
  motivated: [
    { id: 'motivated_q1', text: 'Seni ne motive etti?', type: 'text' },
    { id: 'motivated_q2', text: 'Bu enerjiyi nasıl koruyabilirsin?', type: 'text' },
    { id: 'motivated_q3', text: 'Bir sonraki küçük adımın ne olacak?', type: 'text' },
  ],
  calm: [
    { id: 'calm_q1', text: 'Bu sakinliği neye borçlusun?', type: 'text' },
    { id: 'calm_q2', text: 'Şu anki sessizliği nasıl tarif edersin?', type: 'text' },
    { id: 'calm_q3', text: 'Bu huzuru içine çekmek ister misin?', type: 'text' },
  ],
};

const DEFAULT_QUESTIONS = [
  { id: 'grateful', text: 'Bugün neye minnettarsın?', type: 'text' },
  { id: 'other', text: 'Paylaşmak istediğin başka bir şey var mı?', type: 'text' },
];

// ─── Stable Mascot Area ───────────────────────────────────────────────────────
// Lifted OUTSIDE CheckInScreen so it is never recreated on parent re-renders.
// React.memo ensures it only re-renders when mood or message text actually change.
const MascotArea = memo(function MascotArea({
  mood,
  message,
  textColor,
}: {
  mood: string;
  message: string;
  textColor: string;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(200)} style={styles.mascotArea}>
      {/* MascotBlob stays mounted permanently; mood prop drives config */}
      <MascotBlob mood={mood as any} scale={0.6} />
      <Text style={[styles.mascotText, { color: textColor }]}>
        "{message}"
      </Text>
    </Animated.View>
  );
});

// ─── Isolated Reflection Form ─────────────────────────────────────────────────
// All text input state lives here. Typing never propagates up to the mascot.
const ReflectionForm = memo(function ReflectionForm({
  questions,
  onSubmit,
  onBack,
  onCancel,
  loading,
  theme,
}: {
  questions: any[];
  onSubmit: (answers: Record<string, string>) => void;
  onBack: () => void;
  onCancel: () => void;
  loading: boolean;
  theme: any;
}) {
  // Local state — changes here NEVER reach MascotArea
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const updateAnswer = useCallback((id: string, text: string) => {
    setAnswers(prev => ({ ...prev, [id]: text }));
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(answers);
  }, [answers, onSubmit]);

  return (
    <Animated.View entering={FadeInDown} style={styles.questionsSection}>
      <View style={styles.questionHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.secondary} />
        </Pressable>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, marginBottom: 0 }]}>
          Biraz Daha Anlat...
        </Text>
      </View>

      {questions.map((q, idx) => (
        <Animated.View
          key={q.id}
          entering={FadeInDown.delay(idx * 100)}
          style={[styles.questionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        >
          <Text style={[styles.questionText, { color: theme.colors.text.primary }]}>{q.text}</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.text.primary, backgroundColor: theme.colors.background }]}
            placeholder="Buraya yazabilirsin..."
            placeholderTextColor={theme.colors.text.secondary}
            multiline
            value={answers[q.id] || ''}
            onChangeText={(t) => updateAnswer(q.id, t)}
          />
        </Animated.View>
      ))}

      <View style={styles.actions}>
        <CustomButton title="Tamamla" onPress={handleSubmit} loading={loading} style={styles.submitButton} />
        <Pressable onPress={onCancel} style={styles.laterButton}>
          <Text style={[styles.laterText, { color: theme.colors.text.secondary }]}>Vazgeç</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CheckInScreen() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0); // 0: Mood, 1: Questions
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const router = useRouter();
  const { currentTheme } = useThemeStore();

  const activeQuestions = useMemo(
    () => selectedMood ? [...QUESTIONS_MAP[selectedMood], ...DEFAULT_QUESTIONS] : DEFAULT_QUESTIONS,
    [selectedMood]
  );

  // Stable mascot message — only recomputes when selectedMood changes
  const mascotMessage = useMemo(() => {
    if (!selectedMood) return getMascotMessage();
    const label = MOODS.find(m => m.id === selectedMood)?.label;
    return `Anlıyorum... ${label} bir gün mü?`;
  }, [selectedMood]);

  const handleMoodSelect = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMood(id);
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentStep(1);
    }, 400);
  }, []);

  const handleSubmit = useCallback(async (answers: Record<string, string>) => {
    setLoading(true);
    try {
      const formattedAnswers = activeQuestions.map(q => ({
        question: q.text,
        answer: answers[q.id] || '',
      }));

      const payload = {
        emotion: MOODS.find(m => m.id === selectedMood)?.label || selectedMood || 'Sakin',
        answers: formattedAnswers,
        created_at: new Date(),
      };

      await client.post('/check-ins/advanced', payload);
      setModal({ visible: true, title: 'Teşekkürler', message: 'Paylaştığın her şey burada güvende. Kendine vakit ayırdığın için teşekkürler.' });
    } catch (error: any) {
      if (!error?.isSessionExpiry) {
        setModal({ visible: true, title: 'Hata', message: 'Kaydedilirken bir sorun oluştu.' });
      }
    } finally {
      setLoading(false);
    }
  }, [activeQuestions, selectedMood]);

  const handleBack = useCallback(() => {
    setCurrentStep(0);
  }, []);

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.topHeader}>
          <Pressable onPress={() => router.back()} style={styles.topBackButton}>
            <Ionicons name="arrow-back" size={26} color={currentTheme.colors.text.secondary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* MascotArea is always mounted, never remounts on text input changes */}
          <MascotArea
            mood={selectedMood || 'neutral'}
            message={mascotMessage}
            textColor={currentTheme.colors.text.secondary}
          />

          {currentStep === 0 ? (
            <Animated.View entering={FadeInDown} exiting={FadeOut} style={styles.moodSection}>
              <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary }]}>Duygunu Seç</Text>
              <View style={styles.moodGrid}>
                {MOODS.map((mood) => {
                  const isSelected = selectedMood === mood.id;
                  return (
                    <Pressable
                      key={mood.id}
                      onPress={() => handleMoodSelect(mood.id)}
                      style={[
                        styles.moodCard,
                        {
                          backgroundColor: currentTheme.colors.card,
                          borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBorder,
                          shadowColor: isSelected ? currentTheme.colors.primary : 'transparent',
                        },
                        isSelected && styles.selectedMoodCard,
                      ]}
                    >
                      <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                      <Text style={[styles.moodLabel, { color: isSelected ? currentTheme.colors.primary : currentTheme.colors.text.primary }]}>
                        {mood.label}
                      </Text>
                      {isSelected && (
                        <Animated.View entering={FadeIn} style={[styles.glow, { backgroundColor: currentTheme.colors.primary }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          ) : (
            // ReflectionForm owns all text input state — typing is fully isolated
            <ReflectionForm
              questions={activeQuestions}
              onSubmit={handleSubmit}
              onBack={handleBack}
              onCancel={() => router.back()}
              loading={loading}
              theme={currentTheme}
            />
          )}
        </ScrollView>

        <CustomModal
          visible={modal.visible}
          title={modal.title}
          message={modal.message}
          onClose={() => {
            setModal({ ...modal, visible: false });
            if (modal.title === 'Teşekkürler') router.back();
          }}
        />
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    zIndex: 10,
  },
  topBackButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  container: { padding: 24, paddingBottom: 60, paddingTop: 10 },
  mascotArea: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  mascotText: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: -10,
    paddingHorizontal: 40,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  moodSection: {
    flex: 1,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  moodCard: {
    width: (width - 48 - 12) / 2,
    height: 100,
    borderRadius: 24,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedMoodCard: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  glow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.1,
    zIndex: -1,
  },
  questionsSection: {
    flex: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  questionCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  actions: {
    marginTop: 20,
    gap: 16,
  },
  submitButton: {
    borderRadius: 30,
    height: 60,
  },
  laterButton: {
    alignItems: 'center',
    padding: 8,
  },
  laterText: {
    fontSize: 16,
  },
});
