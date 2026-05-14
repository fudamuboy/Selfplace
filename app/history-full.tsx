import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { sanitizeText } from '../utils/textSanitizer';


const MOOD_EMOJIS: { [key: string]: string } = {
  'Mutlu': '😊',
  'Üzgün': '😔',
  'Kızgın': '😡',
  'Kaygılı': '😰',
  'Yorgun': '😴',
  'Hassas': '🥹',
  'Motive': '✨',
  'Sakin': '🤍',
};

export default function HistoryFull() {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const { currentTheme } = useThemeStore();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterResults();
  }, [selectedMood, data]);

  const fetchData = async () => {
    try {
      const response = await client.get('/emotional/timeline');
      
      const mappedList = response.data.map((entry: any) => ({
        ...entry,
        id: entry.id,
        mood: entry.emotion || 'Sakin',
        question_text: entry.prompt || 'Yansıma',
        answer: entry.content,
        type: entry.source_type
      }));

      setData(mappedList);
      setFilteredData(mappedList);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let results = data;
    if (selectedMood) {
      results = results.filter(item => item.mood === selectedMood);
    }
    setFilteredData(results);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.emoji}>{MOOD_EMOJIS[item.mood] || '🤍'}</Text>
        <Text style={[styles.date, { color: currentTheme.colors.text.secondary }]}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={[styles.question, { color: currentTheme.colors.primary }]}>{item.question_text || 'Yansıma'}</Text>
      <Text style={[styles.answer, { color: currentTheme.colors.text.primary }]}>“{sanitizeText(item.answer, 'Paylaşım bulunamadı.')}”</Text>

    </View>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text.primary} />
          </Pressable>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Duygusal Arşiv</Text>
        </View>

        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodScroll}>
            <Pressable 
              onPress={() => setSelectedMood(null)}
              style={[
                styles.moodFilter, 
                { backgroundColor: currentTheme.colors.card, borderColor: !selectedMood ? currentTheme.colors.primary : currentTheme.colors.cardBorder }
              ]}
            >
              <Text style={[styles.moodFilterText, { color: !selectedMood ? currentTheme.colors.primary : currentTheme.colors.text.primary }]}>Tümü</Text>
            </Pressable>
            {Object.keys(MOOD_EMOJIS).map((mood) => (
              <Pressable 
                key={mood}
                onPress={() => setSelectedMood(selectedMood === mood ? null : mood)}
                style={[
                  styles.moodFilter, 
                  { backgroundColor: currentTheme.colors.card, borderColor: selectedMood === mood ? currentTheme.colors.primary : currentTheme.colors.cardBorder }
                ]}
              >
                <Text style={styles.moodFilterEmoji}>{MOOD_EMOJIS[mood]}</Text>
                <Text style={[styles.moodFilterText, { color: selectedMood === mood ? currentTheme.colors.primary : currentTheme.colors.text.primary }]}>{mood}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="sparkles-outline" size={60} color={currentTheme.colors.text.secondary} />
                <Text style={[styles.emptyText, { color: currentTheme.colors.text.primary }]}>Burada henüz bir iz yok ✨</Text>
                <Text style={[styles.emptySubtext, { color: currentTheme.colors.text.secondary }]}>Duygusal yolculuğun burada zamanla oluşacak.</Text>
              </View>
            }
          />
        )}
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterSection: {
    marginBottom: 20,
  },
  moodScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },
  moodFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  moodFilterEmoji: {
    fontSize: 16,
  },
  moodFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 24,
  },
  date: {
    fontSize: 13,
  },
  question: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  answer: {
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
