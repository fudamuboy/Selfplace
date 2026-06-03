import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import client from '../../api/client';
import { CustomModal } from '../../components/CustomModal';
import { CustomButton } from '../../components/CustomButton';
import { Image } from 'expo-image';
import useThemeStore from '../../store/useThemeStore';
import { sanitizeText } from '../../utils/textSanitizer';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H } from '../../constants/Layout';


const MOOD_IMAGES: { [key: string]: any } = {
  'Mutlu': require('../../assets/images/stickers/mutlu.png'),
  'Sakin': require('../../assets/images/stickers/sakin.png'),
  'Yorgun': require('../../assets/images/stickers/yorgun.png'),
  'Üzgün': require('../../assets/images/stickers/uzgun.png'),
  'Kaygılı': require('../../assets/images/stickers/kaygili.png'),
};

interface CheckIn {
  id: number;
  mood: string;
  reflection_question: string;
  note: string;
  created_at: string;
}

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

export default function HistoryScreen() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [advancedAnswers, setAdvancedAnswers] = useState<any[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [patternMessage, setPatternMessage] = useState<string | null>(null);
  const [patternSubtitle, setPatternSubtitle] = useState<string | null>(null);
  const [patternCheckInCount, setPatternCheckInCount] = useState<number>(0);
  const [dailyReflection, setDailyReflection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const { currentTheme } = useThemeStore();
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const [timelineRes, dailyRes, weeklyRes, patternsRes] = await Promise.allSettled([
        client.get('/emotional/timeline'),
        client.get('/reflections/daily'),
        client.get('/insights/weekly'),
        client.get('/insights/patterns')
      ]);

      if (timelineRes.status === 'fulfilled') {
        const mappedList = timelineRes.value.data.map((entry: any) => ({
          ...entry,
          id: entry.id,
          mood: entry.emotion || 'Sakin',
          question_text: entry.prompt || 'Yansıma',
          answer: entry.content,
          type: entry.source_type
        }));
        setAdvancedAnswers(mappedList);
      }

      if (dailyRes.status === 'fulfilled') {
        setDailyReflection(dailyRes.value.data.reflection);
      } else {
        setDailyReflection(null);
      }

      if (weeklyRes.status === 'fulfilled') {
        setInsight(weeklyRes.value.data.insight);
      } else {
        setInsight(null);
      }

      if (patternsRes.status === 'fulfilled') {
        setPatterns(patternsRes.value.data.patterns);
        setPatternMessage(patternsRes.value.data.message);
        setPatternSubtitle(patternsRes.value.data.subtitle);
        setPatternCheckInCount(patternsRes.value.data.checkInCount || 0);
      } else {
        setPatterns([]);
      }

    } catch (error: any) {
      // Handle unexpected errors silently
    }

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Kendinle Yolculuğun</Text>
        
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={[]} // We use ListHeaderComponent for everything to keep it simple and unified
            keyExtractor={() => 'dummy'}
            ListHeaderComponent={
              <View style={styles.headerComponent}>
                {dailyReflection && (
                  <View style={[styles.dailyCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                    <Text style={[styles.dailyTitle, { color: currentTheme.colors.text.secondary }]}>Günlük Küçük Yansıma 🌿</Text>
                    <Text style={[styles.dailyText, { color: currentTheme.colors.text.primary }]}>{sanitizeText(dailyReflection)}</Text>

                  </View>
                )}
                
                {insight && (
                  <View style={[styles.insightCard, { backgroundColor: currentTheme.colors.glow, borderColor: currentTheme.colors.cardBorder, marginTop: 24 }]}>
                    <Text style={[styles.insightTitle, { color: currentTheme.colors.primary }]}>Haftalık İçgörü ✨</Text>
                    <Text style={[styles.insightHook, { color: currentTheme.colors.text.secondary }]}>Bu hafta senin için küçük bir bakış ✨</Text>
                    <Text style={[styles.insightText, { color: currentTheme.colors.text.primary }]}>{sanitizeText(insight)}</Text>
                  </View>
                )}

                <View style={[styles.patternSection, { marginTop: 24 }]}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary, marginBottom: 4 }]}>Fark Ettiklerin</Text>
                  <Text style={[styles.sectionSubtitle, { color: currentTheme.colors.text.secondary, marginBottom: 16 }]}>Küçük tekrarlar bazen kendini daha iyi anlamana yardımcı olabilir.</Text>
                  
                  {patterns.length > 0 ? (
                    patterns.map((pattern, index) => (
                      <View key={index} style={styles.patternItem}>
                        <Text style={[styles.patternLabel, { color: currentTheme.colors.primary }]}>Senin için oluştu ✨</Text>
                        <View style={[styles.patternCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                          <Text style={[styles.patternText, { color: currentTheme.colors.text.primary }]}>{sanitizeText(pattern, 'Paylaşım bulunamadı.')}</Text>

                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.patternCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder, borderStyle: 'dashed' }]}>
                      <Text style={[styles.patternText, { color: currentTheme.colors.text.primary, fontWeight: '600', textAlign: 'center', marginBottom: 4 }]}>
                        {patternMessage || "Biraz daha paylaştıkça burada sana özel küçük farkındalıklar oluşacak ✨"}
                      </Text>
                      <Text style={[styles.patternProgress, { color: currentTheme.colors.text.secondary, textAlign: 'center', marginBottom: 8 }]}>
                        ({patternCheckInCount}/3 küçük paylaşım)
                      </Text>
                      {patternSubtitle && (
                        <Text style={[styles.patternSubtext, { color: currentTheme.colors.text.secondary, textAlign: 'center' }]}>
                          {patternSubtitle}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {advancedAnswers.length > 0 && (
                  <View style={[styles.advancedSection, { marginTop: 32 }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary, marginBottom: 4 }]}>Paylaşımların ✨</Text>
                    <Text style={[styles.sectionSubtitle, { color: currentTheme.colors.text.secondary, marginBottom: 16 }]}>Duygusal yolculuğundan dökülen küçük yansımalar.</Text>
                    
                    <View style={styles.verticalTimeline}>
                      {advancedAnswers.slice(0, 10).map((ans, idx) => (
                        <View key={ans.id || idx} style={styles.timelineItem}>
                          <View style={[styles.timelineDot, { backgroundColor: currentTheme.colors.primary }]} />
                          <View style={[styles.advancedVerticalCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                            <View style={styles.cardTopRow}>
                              <Text style={styles.snippetEmoji}>{MOOD_EMOJIS[ans.mood] || '🤍'}</Text>
                              <View style={[styles.tag, { backgroundColor: currentTheme.colors.glow }]}>
                                <Text style={[styles.tagText, { color: currentTheme.colors.primary }]}>{ans.question_text || 'Günlük Not'}</Text>
                              </View>
                            </View>
                             <Text style={[styles.snippetText, { color: currentTheme.colors.text.primary }]}>“{sanitizeText(ans.answer, 'Paylaşım bulunamadı.')}”</Text>

                            <Text style={[styles.snippetDate, { color: currentTheme.colors.text.secondary }]}>{formatDate(ans.created_at)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    <CustomButton 
                      title="Tüm Geçmişi Gör" 
                      onPress={() => router.push('/history-full')} 
                      style={styles.seeAllButton}
                      textStyle={styles.seeAllButtonText}
                    />
                  </View>
                )}
              </View>
            }
            renderItem={() => null}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: currentTheme.colors.text.primary }]}>Henüz bir yolculuk kaydın yok.</Text>
                <Text style={[styles.emptySubtext, { color: currentTheme.colors.text.secondary }]}>Kendini tanıma yolculuğun küçük adımlarla başlar. Bugünün sorusuna cevap vererek yeni bir sayfa açabilirsin.</Text>
              </View>
            }
          />
        )}
      </View>

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ ...modal, visible: false })}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: PAGE_PADDING_H,
    marginBottom: 20,
  },
  headerComponent: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  patternSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  patternCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  patternText: {
    fontSize: 15,
    lineHeight: 22,
  },
  patternSubtext: {
    fontSize: 13,
    lineHeight: 18,
  },
  patternProgress: {
    fontSize: 12,
    fontWeight: '500',
  },
  patternItem: {
    marginBottom: 16,
  },
  patternLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 8,
  },
  insightHook: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 40,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  dailyCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  dailyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  dailyText: {
    fontSize: 15,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  insightCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 16,
    lineHeight: 24,
  },
  historyCard: {
    borderRadius: 20,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardSticker: {
    width: 32,
    height: 32,
    backgroundColor: 'transparent',
  },
  date: {
    fontSize: 14,
  },
  moodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  note: {
    fontSize: 16,
    lineHeight: 22,
  },
  noNote: {
    fontStyle: 'italic',
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  advancedSection: {
    marginBottom: 8,
  },
  verticalTimeline: {
    marginLeft: 12,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 24,
    paddingVertical: 10,
  },
  timelineItem: {
    marginBottom: 24,
    position: 'relative',
  },
  timelineDot: {
    position: 'absolute',
    left: -32.5,
    top: 24,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    zIndex: 1,
  },
  advancedVerticalCard: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  tag: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    lineHeight: 14,
  },
  snippetText: {
    fontSize: 16,
    lineHeight: 26,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 4,
  },
  snippetEmoji: {
    fontSize: 32,
    marginTop: -4,
  },
  snippetDate: {
    fontSize: 12,
    marginTop: 16,
    opacity: 0.5,
    fontWeight: '500',
  },
  seeAllButton: {
    marginTop: 12,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  seeAllButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
