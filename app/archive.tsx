import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import useThemeStore from '../store/useThemeStore';

interface ArchiveItem {
  id: number;
  date: string;
  themeTitle: string;
  dominantMood: string;
  checkinCount: number;
  journalCount: number;
  reflectionSentence: string;
}

export default function ArchiveScreen() {
  const { data } = useLocalSearchParams();
  const router = useRouter();
  const { currentTheme } = useThemeStore();

  const archiveData: ArchiveItem[] = data ? JSON.parse(data as string) : [];

  const formatDateRange = (dateStr: string) => {
    const end = new Date(dateStr);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleDateString('tr-TR', { month: 'long' });
    const endMonth = end.toLocaleDateString('tr-TR', { month: 'long' });
    
    if (startMonth === endMonth) {
      return `${startDay}–${endDay} ${endMonth}`;
    }
    return `${startDay} ${startMonth} – ${endDay} ${endMonth}`;
  };

  const renderItem = ({ item }: { item: ArchiveItem }) => (
    <View style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
      <Text style={[styles.dateText, { color: currentTheme.colors.text.secondary }]}>
        {formatDateRange(item.date)}
      </Text>
      
      <Text style={[styles.themeTitle, { color: currentTheme.colors.text.primary }]}>
        "{item.themeTitle}"
      </Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="flash" size={14} color="#A78BFA" />
          <Text style={[styles.statText, { color: currentTheme.colors.text.primary }]}>{item.checkinCount} Check-in</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="book" size={14} color="#FB923C" />
          <Text style={[styles.statText, { color: currentTheme.colors.text.primary }]}>{item.journalCount} Yazı</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="heart" size={14} color="#F472B6" />
          <Text style={[styles.statText, { color: currentTheme.colors.text.primary }]}>Baskın Duygu: {item.dominantMood}</Text>
        </View>
      </View>

      <Text style={[styles.reflectionText, { color: currentTheme.colors.text.secondary }]}>
        “{item.reflectionSentence}”
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
            <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Geçmiş Haftalar</Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>Duygusal yolculuğunun arşivi ✨</Text>
          </View>
        </View>

        <FlatList
          data={archiveData}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
});
