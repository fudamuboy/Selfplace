import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { Colors } from '../constants/Colors';
import client from '../api/client';

const MOODS = ['Mutlu', 'Sakin', 'Yorgun', 'Üzgün', 'Kaygılı'];

export default function CheckInScreen() {
  const [selectedMood, setSelectedMood] = useState('');
  const [question, setQuestion] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingQuestion, setFetchingQuestion] = useState(true);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const router = useRouter();

  useEffect(() => {
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    setFetchingQuestion(true);
    try {
      const response = await client.get('/check-ins/question');
      setQuestion(response.data.text);
    } catch (error) {
      setQuestion('Bugün kendine nasıl davrandın?'); // Fallback
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
    try {
      await client.post('/check-ins', {
        mood: selectedMood,
        reflection_question: question,
        note: note
      });
      setModal({ visible: true, title: 'Teşekkürler', message: 'Check-in tamamlandı. Kendine zaman ayırdığın için teşekkürler.' });
    } catch (error) {
      setModal({ visible: true, title: 'Hata', message: 'Kaydedilirken bir sorun oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Nasıl Hissediyorsun?</Text>
        
        <View style={styles.moodContainer}>
          {MOODS.map((mood) => (
            <CustomButton
              key={mood}
              title={mood}
              onPress={() => setSelectedMood(mood)}
              variant={selectedMood === mood ? 'primary' : 'outline'}
              style={styles.moodButton}
            />
          ))}
        </View>

        <View style={styles.questionSection}>
          <Text style={styles.sectionLabel}>Günlük Farkındalık</Text>
          {fetchingQuestion ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <Text style={styles.questionText}>{question}</Text>
          )}
          <TextInput
            style={styles.input}
            placeholder="Kısaca not alabilirsin..."
            placeholderTextColor={Colors.text.secondary}
            multiline
            value={note}
            onChangeText={setNote}
          />
        </View>

        <CustomButton 
          title="Tamamla" 
          onPress={handleSubmit} 
          loading={loading}
          style={styles.submitButton}
        />
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
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 40,
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  moodButton: {
    width: '48%',
    marginBottom: 12,
  },
  questionSection: {
    backgroundColor: Colors.card,
    padding: 24,
    borderRadius: 24,
    marginBottom: 40,
  },
  sectionLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  questionText: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    lineHeight: 26,
  },
  input: {
    color: Colors.text.primary,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginBottom: 40,
  },
});
