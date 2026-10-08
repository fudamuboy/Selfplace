import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { sanitizeText } from '../utils/textSanitizer';
import { logger } from '../utils/logger';
import { NetworkErrorState } from '../components/NetworkErrorState';


import { useT } from '../i18n';

const MOODS_CONFIG = [
  { id: 'Mutlu', emoji: '😊', labelTr: 'Mutlu', labelEn: 'Happy' },
  { id: 'Üzgün', emoji: '😔', labelTr: 'Üzgün', labelEn: 'Sad' },
  { id: 'Kızgın', emoji: '😡', labelTr: 'Kızgın', labelEn: 'Angry' },
  { id: 'Kaygılı', emoji: '😰', labelTr: 'Kaygılı', labelEn: 'Anxious' },
  { id: 'Yorgun', emoji: '😴', labelTr: 'Yorgun', labelEn: 'Tired' },
  { id: 'Hassas', emoji: '🥹', labelTr: 'Hassas', labelEn: 'Sensitive' },
  { id: 'Motive', emoji: '✨', labelTr: 'Motive', labelEn: 'Motivated' },
  { id: 'Sakin', emoji: '🤍', labelTr: 'Sakin', labelEn: 'Calm' },
];

// The API localizes emotion labels in English mode (and legacy rows may hold English labels),
// so map any variant back to the canonical id used for emoji and filtering.
const toCanonicalMood = (emotion?: string): string => {
  if (!emotion) return 'Sakin';
  const e = emotion.toLowerCase();
  return MOODS_CONFIG.find(m => m.labelTr.toLowerCase() === e || m.labelEn.toLowerCase() === e)?.id || emotion;
};

export default function HistoryFull() {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const { currentTheme } = useThemeStore();
  const router = useRouter();
  const { t, language } = useT();
  const isEn = language === 'en';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterResults();
  }, [selectedMood, data]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/emotional/timeline');
      
      const mappedList = response.data.map((entry: any) => ({
        ...entry,
        id: entry.id,
        mood: toCanonicalMood(entry.emotion),
        question_text: entry.prompt || (isEn ? 'Reflection' : 'Yansıma'),
        answer: entry.content,
        type: entry.source_type
      }));
  
      setData(mappedList);
      setFilteredData(mappedList);
    } catch (_err: any) {
      if (_err.message !== 'SESSION_EXPIRED' && !_err.isSessionExpiry) {
        setError(_err.message || (isEn ? 'Error loading history.' : 'Geçmiş yüklenirken bir hata oluştu.'));
      }
      logger.error('History fetch error', _err);
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
    return date.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: any }) => {
    const moodConfig = MOODS_CONFIG.find(m => m.id === item.mood);
    const emoji = moodConfig ? moodConfig.emoji : '🤍';

    return (
      <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.date, { color: currentTheme.colors.text.secondary }]}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={[styles.question, { color: currentTheme.colors.primary }]}>{item.question_text || (isEn ? 'Reflection' : 'Yansıma')}</Text>
        <Text style={[styles.answer, { color: currentTheme.colors.text.primary }]}>“{sanitizeText(item.answer, isEn ? 'No content found.' : 'Paylaşım bulunamadı.')}”</Text>
      </View>
    );
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text.primary} />
          </Pressable>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{isEn ? 'Emotional Archive' : 'Duygusal Arşiv'}</Text>
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
              <Text style={[styles.moodFilterText, { color: !selectedMood ? currentTheme.colors.primary : currentTheme.colors.text.primary }]}>{isEn ? 'All' : 'Tümü'}</Text>
            </Pressable>
            {MOODS_CONFIG.map((m) => (
              <Pressable 
                key={m.id}
                onPress={() => setSelectedMood(selectedMood === m.id ? null : m.id)}
                style={[
                  styles.moodFilter, 
                  { backgroundColor: currentTheme.colors.card, borderColor: selectedMood === m.id ? currentTheme.colors.primary : currentTheme.colors.cardBorder }
                ]}
              >
                <Text style={styles.moodFilterEmoji}>{m.emoji}</Text>
                <Text style={[styles.moodFilterText, { color: selectedMood === m.id ? currentTheme.colors.primary : currentTheme.colors.text.primary }]}>{isEn ? m.labelEn : m.labelTr}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 40 }} />
        ) : error && data.length === 0 ? (
          <NetworkErrorState message={error} onRetry={fetchData} />
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="sparkles-outline" size={60} color={currentTheme.colors.text.secondary} />
                <Text style={[styles.emptyText, { color: currentTheme.colors.text.primary }]}>{isEn ? 'No entries here yet ✨' : 'Burada henüz bir iz yok ✨'}</Text>
                <Text style={[styles.emptySubtext, { color: currentTheme.colors.text.secondary }]}>{isEn ? 'Your emotional journey will unfold here over time.' : 'Duygusal yolculuğun burada zamanla oluşacak.'}</Text>
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
