import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import useThemeStore from '../store/useThemeStore';
import { useT } from '../i18n';
import client from '../api/client';

interface ArchiveItem {
  id: number;
  date: string;
  themeTitle: string;
  dominantMood: string;
  checkinCount: number;
  journalCount: number;
  reflectionSentence: string;
}

const MOOD_LOCALIZATION: Record<string, { tr: string; en: string }> = {
  Mutlu: { tr: 'Mutlu', en: 'Happy' },
  Happy: { tr: 'Mutlu', en: 'Happy' },
  Üzgün: { tr: 'Üzgün', en: 'Sad' },
  Sad: { tr: 'Üzgün', en: 'Sad' },
  Kızgın: { tr: 'Kızgın', en: 'Angry' },
  Angry: { tr: 'Kızgın', en: 'Angry' },
  Kaygılı: { tr: 'Kaygılı', en: 'Anxious' },
  Anxious: { tr: 'Kaygılı', en: 'Anxious' },
  Yorgun: { tr: 'Yorgun', en: 'Tired' },
  Tired: { tr: 'Yorgun', en: 'Tired' },
  Hassas: { tr: 'Hassas', en: 'Sensitive' },
  Sensitive: { tr: 'Hassas', en: 'Sensitive' },
  Motive: { tr: 'Motive', en: 'Motivated' },
  Motivated: { tr: 'Motive', en: 'Motivated' },
  Sakin: { tr: 'Sakin', en: 'Calm' },
  Calm: { tr: 'Sakin', en: 'Calm' },
};

const THEME_TITLES: Record<string, { tr: string; en: string }> = {
  'Kendine doğru sessiz bir adım': { tr: 'Kendine doğru sessiz bir adım', en: 'A quiet step towards yourself' },
  'A quiet step towards yourself': { tr: 'Kendine doğru sessiz bir adım', en: 'A quiet step towards yourself' },
  'Duygularınla yüzleşmeye başladığın hafta': { tr: 'Duygularınla yüzleşmeye başladığın hafta', en: 'The week you began facing your feelings' },
  'The week you began facing your feelings': { tr: 'Duygularınla yüzleşmeye başladığın hafta', en: 'The week you began facing your feelings' },
  'İçe dönüş ve farkındalık haftası': { tr: 'İçe dönüş ve farkındalık haftası', en: 'A week of turning inward and awareness' },
  'A week of turning inward and awareness': { tr: 'İçe dönüş ve farkındalık haftası', en: 'A week of turning inward and awareness' },
  'Kendi gerçeğinle bağ kurduğun hafta': { tr: 'Kendi gerçeğinle bağ kurduğun hafta', en: 'The week you connected with your own truth' },
  'The week you connected with your own truth': { tr: 'Kendi gerçeğinle bağ kurduğun hafta', en: 'The week you connected with your own truth' },
};

const FALLBACK_REFLECTIONS: Record<string, { tr: string; en: string }> = {
  'Bu hafta kendine karşı dürüst görünüyordun.': { tr: 'Bu hafta kendine karşı dürüst görünüyordun.', en: 'You seemed honest with yourself this week.' },
  'You seemed honest with yourself this week.': { tr: 'Bu hafta kendine karşı dürüst görünüyordun.', en: 'You seemed honest with yourself this week.' },
};

export default function ArchiveScreen() {
  const { data } = useLocalSearchParams();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { t, language } = useT();
  const isEn = language === 'en';

  const [archiveData, setArchiveData] = useState<ArchiveItem[]>(() => {
    if (data) {
      try {
        return JSON.parse(data as string);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchFreshArchive = async () => {
      setLoading(true);
      try {
        const res = await client.get('/insights/journey');
        if (isMounted && res.data?.archive) {
          setArchiveData(res.data.archive);
        }
      } catch (_err) {
        // Fall back to initial parsed data if network fails
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFreshArchive();
    return () => {
      isMounted = false;
    };
  }, [language]);

  const formatDateRange = (dateStr: string) => {
    const end = new Date(dateStr);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { month: 'long' });
    const endMonth = end.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { month: 'long' });
    
    if (startMonth === endMonth) {
      return isEn ? `${startMonth} ${startDay}–${endDay}` : `${startDay}–${endDay} ${endMonth}`;
    }
    return isEn ? `${startMonth} ${startDay} – ${endMonth} ${endDay}` : `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  };

  const getLocalizedMood = (mood: string) => {
    const match = MOOD_LOCALIZATION[mood];
    if (match) {
      return isEn ? match.en : match.tr;
    }
    return mood;
  };

  const getLocalizedTheme = (theme: string) => {
    const match = THEME_TITLES[theme];
    if (match) {
      return isEn ? match.en : match.tr;
    }
    return theme;
  };

  const getLocalizedReflection = (reflection: string) => {
    const match = FALLBACK_REFLECTIONS[reflection];
    if (match) {
      return isEn ? match.en : match.tr;
    }
    return reflection;
  };

  const renderItem = ({ item }: { item: ArchiveItem }) => (
    <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
      <Text style={[styles.dateText, { color: currentTheme.colors.text.secondary }]}>
        {formatDateRange(item.date)}
      </Text>
      
      <Text style={[styles.themeTitle, { color: currentTheme.colors.text.primary }]}>
        &ldquo;{getLocalizedTheme(item.themeTitle)}&rdquo;
      </Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="flash" size={14} color="#A78BFA" />
          <Text style={[styles.statText, { color: currentTheme.colors.text.primary }]}>
            {item.checkinCount} {t('history.checkIn')}
          </Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="book" size={14} color="#FB923C" />
          <Text style={[styles.statText, { color: currentTheme.colors.text.primary }]}>
            {item.journalCount} {t('history.entries')}
          </Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="heart" size={14} color="#F472B6" />
          <Text style={[styles.statText, { color: currentTheme.colors.text.primary }]}>
            {t('history.dominantMood')}: {getLocalizedMood(item.dominantMood)}
          </Text>
        </View>
      </View>

      <Text style={[styles.reflectionText, { color: currentTheme.colors.text.secondary }]}>
        “{getLocalizedReflection(item.reflectionSentence)}”
      </Text>
    </View>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{t('history.pastWeeks')}</Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>{t('history.archiveSubtitle')}</Text>
          </View>
        </View>

        {loading && archiveData.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={currentTheme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={archiveData}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, { borderColor: currentTheme.colors.cardBorder }]}>
                <Ionicons name="calendar-outline" size={48} color={currentTheme.colors.text.muted} />
                <Text style={[styles.emptyText, { color: currentTheme.colors.text.secondary }]}>
                  {t('history.emptyArchive')}
                </Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    opacity: 0.8,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 26,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reflectionText: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
