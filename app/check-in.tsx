import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, interpolate, withTiming } from 'react-native-reanimated';
import client from '../api/client';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { GradientBackground } from '../components/GradientBackground';
import useThemeStore from '../store/useThemeStore';

const MOOD_DATA = [
  { id: 'Mutlu', label: 'Mutlu', image: require('../assets/images/stickers/mutlu.png') },
  { id: 'Sakin', label: 'Sakin', image: require('../assets/images/stickers/sakin.png') },
  { id: 'Yorgun', label: 'Yorgun', image: require('../assets/images/stickers/yorgun.png') },
  { id: 'Üzgün', label: 'Üzgün', image: require('../assets/images/stickers/uzgun.png') },
  { id: 'Kaygılı', label: 'Kaygılı', image: require('../assets/images/stickers/kaygili.png') },
];

function MoodCard({ mood, isSelected, onSelect, theme }: { mood: any, isSelected: boolean, onSelect: () => void, theme: any }) {
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

  const handlePressIn = () => {
    scale.value = 0.94;
  };

  const handlePressOut = () => {
    scale.value = 1;
  };

  const handleSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handleSelect}
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
}

export default function CheckInScreen() {
  const [selectedMood, setSelectedMood] = useState('');
  const [question, setQuestion] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingQuestion, setFetchingQuestion] = useState(true);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const [placeholder, setPlaceholder] = useState('');
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const submitScale = useSharedValue(1);
  const modalOpacity = useSharedValue(0);

  const PLACEHOLDERS = [
    'Bugün içinden geçen küçük bir şey...',
    'Aklında kalan bir duygu, düşünce ya da an...',
    'Kısaca kendine not bırakabilirsin.',
  ];

  useEffect(() => {
    fetchQuestion();
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  }, []);

  const fetchQuestion = async () => {
    setFetchingQuestion(true);
    try {
      const response = await client.get('/check-ins/question');
      setQuestion(response.data.text);
    } catch (error) {
      setQuestion('Bugün seni en çok ne etkiledi?');
    } finally {
      setFetchingQuestion(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood) {
      setModal({ visible: true, title: 'Hata', message: 'Lütfen bir mod seçin.' });
      return;
    }

    setLoading(true);
    submitScale.value = withSpring(0.95, { damping: 10, stiffness: 100 });

    try {
      await client.post('/check-ins', {
        mood: selectedMood,
        reflection_question: question,
        note: note
      });
      
      // Artificial delay for emotional satisfaction
      setTimeout(() => {
        submitScale.value = withSpring(1);
        setModal({ visible: true, title: 'Teşekkürler', message: 'Check-in tamamlandı. Kendine zaman ayırdığın için teşekkürler.' });
        modalOpacity.value = withTiming(1, { duration: 500 });
      }, 800);
      
    } catch (error) {
      setModal({ visible: true, title: 'Hata', message: 'Kaydedilirken bir sorun oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <Animated.ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        style={{ transform: [{ scale: submitScale }] }}
      >
        <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Bugün nasıl hissediyorsun?</Text>
        
        <View style={styles.dailyQuestionCard}>
          <Text style={[styles.dailyQuestionText, { color: currentTheme.colors.text.secondary }]}>Bugün kendine nasıl yaklaştığını fark edebilirsin.</Text>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.row}>
            {MOOD_DATA.slice(0, 3).map((mood) => (
              <MoodCard
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
              <MoodCard
                key={mood.id}
                mood={mood}
                isSelected={selectedMood === mood.id}
                onSelect={() => setSelectedMood(mood.id)}
                theme={currentTheme}
              />
            ))}
          </View>
        </View>

        <View style={styles.questionSection}>
          <Text style={[styles.sectionLabel, { color: currentTheme.colors.text.primary }]}>{question || "İstersen birkaç kelime bırak"}</Text>
          <View style={[styles.inputContainer, { backgroundColor: currentTheme.colors.input.background, borderColor: currentTheme.colors.input.border }]}>
            <TextInput
              style={[styles.input, { color: currentTheme.colors.input.text }]}
              placeholder={placeholder}
              placeholderTextColor={currentTheme.colors.input.placeholder}
              multiline
              value={note}
              onChangeText={setNote}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <CustomButton
            title="Tamamla"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
          <Pressable onPress={() => router.back()} style={styles.laterButton}>
            <Text style={[styles.laterText, { color: currentTheme.colors.text.secondary }]}>Daha sonra</Text>
          </Pressable>
        </View>
      </Animated.ScrollView>

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal({ ...modal, visible: false });
          if (modal.title === 'Teşekkürler') router.back();
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  gridContainer: {
    gap: 16,
    marginBottom: 48,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  moodCardWrapper: {
    width: 100,
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
    width: 70,
    height: 70,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  moodLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  questionSection: {
    marginBottom: 40,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    borderRadius: 24,
    padding: 20,
    minHeight: 140,
    borderWidth: 1,
  },
  input: {
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  actions: {
    gap: 20,
  },
  submitButton: {
    borderRadius: 24,
    height: 60,
  },
  laterButton: {
    alignItems: 'center',
    padding: 8,
  },
  laterText: {
    fontSize: 16,
  },
  dailyQuestionCard: {
    paddingHorizontal: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  dailyQuestionText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});
