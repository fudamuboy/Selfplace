import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, ScrollView, Animated, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import client from '../../api/client';
import { CustomModal } from '../../components/CustomModal';
import { CustomButton } from '../../components/CustomButton';
import useThemeStore from '../../store/useThemeStore';
import { sanitizeText } from '../../utils/textSanitizer';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H } from '../../constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { EmotionalStoryModal, StorySlide } from '../../components/EmotionalStoryModal';
import { logger } from '../../utils/logger';
import { useNetworkStore } from '../../store/useNetworkStore';
import { NetworkErrorState } from '../../components/NetworkErrorState';

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
  
  interface WeeklyInsightData {
    insight: string;
    depthLevel: 'NEW' | 'LIGHT' | 'GROWING' | 'DEEP' | 'IMMERSIVE';
    rhythm?: string | null;
    comfortPattern?: string | null;
    thoughtFocus?: string | null;
    questions?: { q: string; a: string }[];
    shifts?: string | null;
    relationshipSynthesis?: string | null;
  }

  interface JourneyData {
    stats: {
      checkinCount: number;
      cardsCount: number;
      journalCount: number;
    };
    progressionText: string;
    archive: any[];
    hasArchive: boolean;
  }

  const [weeklyData, setWeeklyData] = useState<WeeklyInsightData | null>(null);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [storyVisible, setStoryVisible] = useState(false);

  const [patterns, setPatterns] = useState<string[]>([]);
  const [patternMessage, setPatternMessage] = useState<string | null>(null);
  const [patternSubtitle, setPatternSubtitle] = useState<string | null>(null);
  const [patternCheckInCount, setPatternCheckInCount] = useState<number>(0);
  const [dailyReflection, setDailyReflection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const { currentTheme } = useThemeStore();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = useNetworkStore.getState().subscribeToRefresh(() => {
      fetchData(true);
    });
    return unsubscribe;
  }, []);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // Phase 2 (Immediate): Load timeline / reflections
      const [timelineRes, dailyRes] = await Promise.allSettled([
        client.get('/emotional/timeline'),
        client.get('/reflections/daily')
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
      } else {
        logger.error('[History] Fetch timeline failed', timelineRes.reason);
      }

      if (dailyRes.status === 'fulfilled') {
        setDailyReflection(dailyRes.value.data.reflection);
      } else {
        setDailyReflection(null);
        logger.error('[History] Fetch daily reflection failed', dailyRes.reason);
      }

      // If both Stage 2 calls fail, register the error message
      if (timelineRes.status === 'rejected' && dailyRes.status === 'rejected') {
        const errObj = timelineRes.reason || dailyRes.reason;
        if (errObj?.message !== 'SESSION_EXPIRED' && !errObj?.isSessionExpiry) {
          setError(errObj?.message || 'Veriler yüklenirken bir bağlantı hatası oluştu.');
        }
      }

      // Phase 3 (Delayed Background, 1000ms): Load insights, patterns, journey
      setTimeout(async () => {
        try {
          const [weeklyRes, patternsRes, journeyRes] = await Promise.allSettled([
            client.get('/insights/weekly'),
            client.get('/insights/patterns'),
            client.get('/insights/journey')
          ]);

          if (journeyRes.status === 'fulfilled') {
            setJourneyData(journeyRes.value.data);
          } else {
            logger.error('[History] Fetch journey failed', journeyRes.reason);
          }

          if (weeklyRes.status === 'fulfilled') {
            const data = weeklyRes.value.data;
            if (data) {
              setWeeklyData({
                insight: data.insight || (typeof data === 'string' ? data : ''),
                depthLevel: data.depthLevel || 'NEW',
                rhythm: data.rhythm || null,
                comfortPattern: data.comfortPattern || null,
                thoughtFocus: data.thoughtFocus || null,
                questions: data.questions || [],
                shifts: data.shifts || null,
                relationshipSynthesis: data.relationshipSynthesis || null
              });
            } else {
              setWeeklyData(null);
            }
          } else {
            setWeeklyData(null);
            logger.error('[History] Fetch weekly insights failed', weeklyRes.reason);
          }

          if (patternsRes.status === 'fulfilled') {
            setPatterns(patternsRes.value.data.patterns);
            setPatternMessage(patternsRes.value.data.message);
            setPatternSubtitle(patternsRes.value.data.subtitle);
            setPatternCheckInCount(patternsRes.value.data.checkInCount || 0);
          } else {
            setPatterns([]);
            logger.error('[History] Fetch patterns failed', patternsRes.reason);
          }
        } catch (innerErr) {
          logger.error('[History] Background staged loading failed', innerErr);
        }
      }, 1000);

    } catch (_error: any) {
      logger.error('History fetch error', _error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
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

  const isCardUnlocked = (cardIndex: number, level: string) => {
    if (cardIndex === 0) return true;
    if (level === 'NEW') return false;
    if (level === 'LIGHT') return cardIndex <= 1;
    if (level === 'GROWING') return cardIndex <= 3;
    return true;
  };

  const buildEmotionalStory = (): StorySlide[] => {
    const slides: StorySlide[] = [];
    const level = weeklyData?.depthLevel || 'NEW';
    const hasWeekly = !!weeklyData;

    // Slide 1: Senin Haftan (Overview / Progression)
    slides.push({
      id: 's1',
      title: 'Senin Haftan',
      label: 'Genel Bir Bakış 🌤️',
      bodyText: journeyData?.progressionText || 'Kendini tanıma yolculuğunda yeni bir haftaya başlıyorsun.',
      footerText: 'Kendini keşfetme yolculuğun devam ediyor 🤍',
      icon: 'sparkles',
      iconColor: '#FBBF24',
      gradient: ['rgba(30, 27, 75, 0.98)', 'rgba(49, 46, 129, 0.98)', 'rgba(15, 17, 26, 1)']
    });

    // Slide 2: Duygusal Ritim
    slides.push({
      id: 's2',
      title: 'Duygusal Ritmin',
      label: 'Ruh Halindeki Değişimler 🌊',
      bodyText: hasWeekly && weeklyData?.rhythm 
        ? weeklyData.rhythm 
        : 'Bu günlerde paylaştıklarınla duygusal ritmin şekilleniyor. Dalgalanmaları yargısızca fark et.',
      footerText: 'Duygularının ritmini dinle 🌿',
      icon: 'heart',
      iconColor: '#EF4444',
      gradient: ['rgba(76, 29, 149, 0.98)', 'rgba(59, 7, 100, 0.98)', 'rgba(15, 17, 26, 1)']
    });

    // Slide 3: Öne Çıkan Anlar / Yansımalar
    slides.push({
      id: 's3',
      title: 'İçsel Yansımalar',
      label: 'Unutulmaz Hisler ✨',
      bodyText: hasWeekly && weeklyData?.thoughtFocus 
        ? weeklyData.thoughtFocus 
        : `Bu hafta ${journeyData?.stats?.journalCount || 0} yazı yazdın. Kendine mola vermenin, sessiz anların değerini fark ettiğin anlar öne çıktı.`,
      footerText: 'Her küçük an iz bırakır 🤍',
      icon: 'star',
      iconColor: '#FBBF24',
      gradient: ['rgba(30, 27, 75, 0.98)', 'rgba(74, 4, 78, 0.98)', 'rgba(15, 17, 26, 1)']
    });

    // Slide 4: Sonraki Hafta İçin
    slides.push({
      id: 's4',
      title: 'Sonraki Hafta İçin',
      label: 'Niyetlerin & Odakların 🌅',
      bodyText: hasWeekly && weeklyData?.shifts 
        ? weeklyData.shifts 
        : 'Gelecek haftaya başlarken kendine daha şefkatli davranmayı niyet edebilirsin. Adımların aceleye gelmesin.',
      footerText: 'Yeni bir güne, yeni bir haftaya hazır ol 🤍',
      icon: 'sunny',
      iconColor: '#F97316',
      gradient: ['rgba(2, 44, 34, 0.98)', 'rgba(6, 78, 59, 0.98)', 'rgba(15, 17, 26, 1)']
    });

    return slides;
  };

  const dynamicStorySlides = buildEmotionalStory();

  const handleShowAllStories = () => {
    setStoryVisible(true);
  };

  const handleStoryCardPress = (idx: number, unlocked: boolean) => {
    if (!unlocked) {
      setModal({
        visible: true,
        title: 'Uykuda Olan Bir Hikaye... 🌙',
        message: 'Bu hikaye kartı henüz duygusal olarak uykuda. Kendine zaman ayırıp iç dünyanı paylaştıkça ve zihnindeki düşünceleri döktükçe, buradaki anlar kendiliğinden uyanacak... ✨'
      });
      return;
    }
    setStoryVisible(true);
  };

  const renderStoryCarousel = () => {
    const level = weeklyData?.depthLevel || 'NEW';
    const isImmersive = level === 'IMMERSIVE';

    return (
      <View style={styles.storySection}>
        <View style={styles.storySectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary, marginBottom: 0 }]}>
              Bu Haftanın Hikayesi
            </Text>
            <TouchableOpacity onPress={() => setModal({
              visible: true,
              title: 'Haftalık Hikayeler 📖',
              message: 'Haftalık paylaşımlarından süzülen 5 farklı yansıma hikayesi. Tıklayarak tam ekran okuyabilirsin.'
            })}>
              <Ionicons name="information-circle-outline" size={16} color={currentTheme.colors.text.secondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => handleShowAllStories()}>
            <Text style={[styles.seeAllStoriesLink, { color: currentTheme.colors.primary }]}>Tümünü Gör &gt;</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyCarousel}>
          {dynamicStorySlides.map((card, idx) => {
            const unlocked = isCardUnlocked(idx, level);
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                style={[
                  isImmersive ? styles.immersiveStoryCard : styles.storyCard,
                  { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder },
                  !unlocked && { opacity: 0.45, borderStyle: 'dashed' }
                ]}
                onPress={() => handleStoryCardPress(idx, unlocked)}
              >
                <View style={styles.storyCardHeader}>
                  <View style={[styles.storyCardBubble, { backgroundColor: currentTheme.colors.secondary }]}>
                    <Text style={[styles.storyCardBubbleText, { color: currentTheme.colors.primary }]}>{idx + 1}</Text>
                  </View>
                  {!unlocked && (
                    <Ionicons name="moon-outline" size={12} color={currentTheme.colors.text.muted} style={{ opacity: 0.6 }} />
                  )}
                </View>
                <View style={styles.storyCardCenter}>
                  <Ionicons 
                    name={card.icon as any} 
                    size={28} 
                    color={unlocked ? currentTheme.colors.primary : currentTheme.colors.text.muted} 
                  />
                </View>
                <View style={styles.storyCardFooter}>
                  <Text style={[styles.storyCardTitle, { color: currentTheme.colors.text.primary }]} numberOfLines={1}>{card.title}</Text>
                  <Text style={[styles.storyCardDesc, { color: currentTheme.colors.text.secondary }]} numberOfLines={1}>{card.label.replace(/ \S+$/, '')}</Text>
                </View>
                <View style={[styles.storyCardProgressBar, { backgroundColor: unlocked ? currentTheme.colors.primary : 'rgba(255,255,255,0.08)' }]} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderWeeklyJourneyStats = () => {
    const checkinCount = journeyData?.stats?.checkinCount || 0;
    const cardsCount = journeyData?.stats?.cardsCount || 0;
    const journalCount = journeyData?.stats?.journalCount || 0;
    const level = weeklyData?.depthLevel || 'NEW';
    const isImmersive = level === 'IMMERSIVE';

    const encouragementMessage = journeyData?.progressionText || 'Kendini tanıma yolculuğunda yeni bir haftaya başlıyorsun.';

    return (
      <View style={[
        isImmersive ? styles.immersiveJourneyStatsCard : styles.journeyStatsCard,
        { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder, marginTop: 24 }
      ]}>
        <Text style={[styles.journeyStatsTitle, { color: isImmersive ? '#E2E8F0' : currentTheme.colors.primary }]}>Haftalık Yolculuğun ✨</Text>
        <Text style={[styles.journeyStatsSubtitle, { color: currentTheme.colors.text.secondary }]}>Her küçük adım, seni daha iyi anlamana yardımcı oluyor.</Text>

        <View style={styles.journeyStatsRow}>
          <View style={styles.journeyStatCol}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(167, 139, 250, 0.12)' }]}>
              <Ionicons name="flash" size={20} color="#A78BFA" />
            </View>
            <Text style={[styles.statCount, { color: currentTheme.colors.text.primary }]}>{checkinCount}</Text>
            <Text style={[styles.statLabel, { color: currentTheme.colors.text.secondary }]}>Check-in{"\n"}Bu hafta</Text>
          </View>

          <View style={styles.journeyStatCol}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(244, 114, 182, 0.12)' }]}>
              <Ionicons name="heart" size={20} color="#F472B6" />
            </View>
            <Text style={[styles.statCount, { color: currentTheme.colors.text.primary }]}>{cardsCount}</Text>
            <Text style={[styles.statLabel, { color: currentTheme.colors.text.secondary }]}>Duygu Farkındalığı{"\n"}Anı</Text>
          </View>

          <View style={styles.journeyStatCol}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(251, 146, 60, 0.12)' }]}>
              <Ionicons name="book" size={20} color="#FB923C" />
            </View>
            <Text style={[styles.statCount, { color: currentTheme.colors.text.primary }]}>{journalCount}</Text>
            <Text style={[styles.statLabel, { color: currentTheme.colors.text.secondary }]}>Yazı / Günlük{"\n"}Bu hafta</Text>
          </View>
        </View>

        <View style={[styles.encouragementBanner, { backgroundColor: isImmersive ? 'rgba(255,255,255,0.02)' : currentTheme.colors.glow }]}>
          <Ionicons name="heart-circle" size={22} color="#F472B6" style={styles.encouragementIcon} />
          <Text style={[styles.encouragementText, { color: currentTheme.colors.text.primary }]}>
            {encouragementMessage}
          </Text>
        </View>
      </View>
    );
  };

  const renderWeeklyInsightsList = () => {
    const level = weeklyData?.depthLevel || 'NEW';
    const isImmersive = level === 'IMMERSIVE';
    const hasWeekly = !!weeklyData;

    let sakinText = 'Akşam saatlerinde daha sakin hissediyorsun.';
    let ruhText = 'Bu hafta dengeli ve içe dönük anların çoğalmış.';
    let hatirlatmaText = 'Kendine karşı nazik olmayı unutma. Sen yeterince iyisin. 🤍';

    if (hasWeekly && weeklyData) {
      if (weeklyData.comfortPattern) sakinText = weeklyData.comfortPattern;
      if (weeklyData.rhythm) ruhText = weeklyData.rhythm;
      if (weeklyData.insight) hatirlatmaText = weeklyData.insight.length > 70 ? weeklyData.insight.slice(0, 70) + '...' : weeklyData.insight;
    }

    return (
      <View style={[styles.patternSection, { marginTop: 24 }]}>
        <View style={styles.storySectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary, marginBottom: 0 }]}>Bu Haftanın İçgörüleri</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsCarousel}>
          <View style={[
            isImmersive ? styles.immersiveInsightCardItem : styles.insightCardItem,
            { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }
          ]}>
            <View style={[styles.insightCardIconWrapper, { backgroundColor: 'rgba(167, 139, 250, 0.12)' }]}>
              <Ionicons name="moon" size={18} color="#A78BFA" />
            </View>
            <Text style={[styles.insightCardTitle, { color: currentTheme.colors.text.secondary }]}>En Sakin Zamanın</Text>
            <Text numberOfLines={4} ellipsizeMode="tail" style={[styles.insightCardBody, { color: currentTheme.colors.text.primary }]}>{sakinText}</Text>
          </View>

          {level !== 'NEW' ? (
            <View style={[
              isImmersive ? styles.immersiveInsightCardItem : styles.insightCardItem,
              { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }
            ]}>
              <View style={[styles.insightCardIconWrapper, { backgroundColor: 'rgba(52, 211, 153, 0.12)' }]}>
                <Ionicons name="leaf" size={18} color="#34D399" />
              </View>
              <Text style={[styles.insightCardTitle, { color: currentTheme.colors.text.secondary }]}>Ruh Halin</Text>
              <Text numberOfLines={4} ellipsizeMode="tail" style={[styles.insightCardBody, { color: currentTheme.colors.text.primary }]}>{ruhText}</Text>
            </View>
          ) : (
            <View style={[
              isImmersive ? styles.immersiveInsightCardItem : styles.insightCardItem,
              styles.insightCardItemLocked,
              { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }
            ]}>
              <Ionicons name="moon-outline" size={18} color={currentTheme.colors.text.muted} style={{ marginBottom: 6, opacity: 0.6 }} />
              <Text style={[styles.insightCardTitle, { color: currentTheme.colors.text.muted }]}>Uykudaki Ritim 🌊</Text>
              <Text numberOfLines={4} ellipsizeMode="tail" style={[styles.insightCardBody, { color: currentTheme.colors.text.muted, fontSize: 13 }]}>Duygularını paylaştıkça bu ritim kendiliğinden uyanacak...</Text>
            </View>
          )}

          {level !== 'NEW' && level !== 'LIGHT' ? (
            <View style={[
              isImmersive ? styles.immersiveInsightCardItem : styles.insightCardItem,
              { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }
            ]}>
              <View style={[styles.insightCardIconWrapper, { backgroundColor: 'rgba(251, 146, 60, 0.12)' }]}>
                <Ionicons name="star" size={18} color="#FB923C" />
              </View>
              <Text style={[styles.insightCardTitle, { color: currentTheme.colors.text.secondary }]}>Minik Hatırlatma</Text>
              <Text numberOfLines={4} ellipsizeMode="tail" style={[styles.insightCardBody, { color: currentTheme.colors.text.primary }]}>{hatirlatmaText}</Text>
            </View>
          ) : (
            <View style={[
              isImmersive ? styles.immersiveInsightCardItem : styles.insightCardItem,
              styles.insightCardItemLocked,
              { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }
            ]}>
              <Ionicons name="sparkles-outline" size={18} color={currentTheme.colors.text.muted} style={{ marginBottom: 6, opacity: 0.6 }} />
              <Text style={[styles.insightCardTitle, { color: currentTheme.colors.text.muted }]}>Sessiz Yansıma ✨</Text>
              <Text numberOfLines={4} ellipsizeMode="tail" style={[styles.insightCardBody, { color: currentTheme.colors.text.muted, fontSize: 13 }]}>Kendinle kurduğun bağ derinleştikçe bu fısıltı belirecek...</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[
              isImmersive ? styles.immersiveInsightCardItem : styles.insightCardItem,
              styles.insightCardItemMore,
              { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }
            ]}
            onPress={() => router.push('/check-in')}
          >
            <Ionicons name="add" size={24} color={currentTheme.colors.primary} />
            <Text style={[styles.insightCardItemMoreText, { color: currentTheme.colors.text.primary }]}>Keşfetmek için paylaşmaya devam et ✨</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderWeeklyQuestionsList = () => {
    const level = weeklyData?.depthLevel || 'NEW';
    const isImmersive = level === 'IMMERSIVE';
    const qList = weeklyData?.questions || [];

    if (level === 'NEW' || level === 'LIGHT') {
      return (
        <View style={{ marginTop: 24, paddingBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary }]}>Haftanın Soruları & Yansımaları</Text>
          <View style={[styles.questionsPlaceholderCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
            <Ionicons name="cloudy-outline" size={24} color={currentTheme.colors.text.muted} style={{ marginBottom: 8, opacity: 0.6 }} />
            <Text style={[styles.placeholderCardTitle, { color: currentTheme.colors.text.primary }]}>Yansımalar Henüz Uykuda... 🌿</Text>
            <Text style={[styles.placeholderCardSubtitle, { color: currentTheme.colors.text.secondary }]}>
              Kendinle kurduğun bağ ve paylaşımların derinleştikçe, bu alandaki sorular ve yansımalar kendiliğinden belirecek.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={{ marginTop: 24, paddingBottom: 12 }}>
        <View style={styles.storySectionHeader}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary, marginBottom: 0 }]}>Haftanın Soruları & Yansımaları</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.questionsCarousel}>
          {qList.length > 0 ? (
            qList.map((qItem, idx) => (
              <View key={idx} style={[
                isImmersive ? styles.immersiveQCardItem : styles.qCardItem,
                { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }
              ]}>
                <View style={styles.qCardHeader}>
                  <View style={[styles.qCardBubble, { backgroundColor: currentTheme.colors.glow }]}>
                    <Text style={[styles.qCardBubbleText, { color: currentTheme.colors.primary }]}>{idx + 1}</Text>
                  </View>
                  <Text style={[styles.qCardQuestion, { color: currentTheme.colors.text.primary }]} numberOfLines={2}>{qItem.q}</Text>
                </View>
                <Text style={[styles.qCardAnswer, { color: currentTheme.colors.text.secondary }]} numberOfLines={4}>“{sanitizeText(qItem.a)}”</Text>
              </View>
            ))
          ) : (
            <View style={[styles.qCardItem, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder, borderStyle: 'dashed', justifyContent: 'center' }]}>
              <Text style={[styles.qCardAnswer, { color: currentTheme.colors.text.muted, textAlign: 'center' }]}>Bu hafta soru oluşturmak için yeterli paylaşım yapılmadı 🌿</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: currentTheme.colors.text.primary, paddingHorizontal: 0, marginBottom: 0 }]}>Kendinle Yolculuğun</Text>
            <Text style={[styles.subtitleText, { color: currentTheme.colors.text.secondary }]}>Kendini keşfet, anlamlandır ve ilerle ✨</Text>
          </View>
          <TouchableOpacity 
            style={[styles.historyButton, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
            onPress={() => {
              if (journeyData?.hasArchive) {
                router.push({
                  pathname: '/archive',
                  params: { data: JSON.stringify(journeyData.archive) }
                });
              } else {
                setModal({
                  visible: true,
                  title: 'Geçmiş Haftalar 🗓️',
                  message: 'Henüz geçmiş haftaların oluşmaya başlamadı.\n\nBurada zamanla:\n- duyguların,\n- düşüncelerin,\n- gelişimin\nbirikmeye başlayacak.'
                });
              }
            }}
          >
            <Ionicons name="calendar-outline" size={16} color={currentTheme.colors.primary} />
            <Text style={[styles.historyButtonText, { color: currentTheme.colors.text.primary }]}>Geçmiş Haftalar</Text>
          </TouchableOpacity>
        </View>
        
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 40 }} />
        ) : error && advancedAnswers.length === 0 && dailyReflection === null && weeklyData === null ? (
          <NetworkErrorState message={error} onRetry={() => fetchData(false)} />
        ) : (
          <FlatList
            data={[]} // We use ListHeaderComponent for everything to keep it simple and unified
            keyExtractor={() => 'dummy'}
            ListHeaderComponent={
              <View style={styles.headerComponent}>
                {renderStoryCarousel()}

                {dailyReflection && (
                  <View style={[styles.dailyCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                    <View style={styles.dailyCardLayout}>
                      <View style={[styles.dailyIconContainer, { backgroundColor: currentTheme.colors.glow }]}>
                        <Ionicons name="sunny-outline" size={24} color={currentTheme.colors.primary} />
                      </View>
                      <View style={styles.dailyTextContainer}>
                        <Text style={[styles.dailyTitle, { color: currentTheme.colors.text.secondary }]}>Günlük Küçük Yansıma 🌿</Text>
                        <Text style={[styles.dailyText, { color: currentTheme.colors.text.primary }]}>{sanitizeText(dailyReflection)}</Text>
                      </View>
                      <View style={styles.leafSilhouetteContainer}>
                        <Ionicons name="leaf-outline" size={48} color="rgba(255,255,255,0.03)" />
                      </View>
                    </View>
                  </View>
                )}

                {renderWeeklyJourneyStats()}

                <View style={[styles.quoteCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                  <Ionicons name={"chatbubble-ellipses-outline" as any} size={16} color={currentTheme.colors.primary} style={styles.quoteIcon} />
                  <Text style={[styles.quoteText, { color: currentTheme.colors.text.secondary }]}>
                    Küçük yansımalar, büyük değişimlerin başlangıcıdır.
                  </Text>
                  <Ionicons name="sparkles-outline" size={14} color={currentTheme.colors.accent} style={styles.quoteSparkle} />
                </View>

                {renderWeeklyInsightsList()}

                {renderWeeklyQuestionsList()}

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
                <Text style={[styles.emptyText, { color: currentTheme.colors.text.primary }]}>Henüz geçmiş haftaların oluşmaya başlamadı.</Text>
                <Text style={[styles.emptySubtext, { color: currentTheme.colors.text.secondary }]}>Burada zamanla:{'\n'}- duyguların,{'\n'}- düşüncelerin,{'\n'}- gelişimin{'\n'}birikmeye başlayacak.</Text>
              </View>
            }
          />
        )}
      </View>

      <EmotionalStoryModal
        visible={storyVisible}
        slides={dynamicStorySlides}
        onClose={() => setStoryVisible(false)}
      />

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
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAGE_PADDING_H,
    marginBottom: 16,
    marginTop: 10,
  },
  subtitleText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  historyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  storySection: {
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  storySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  seeAllStoriesLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  storyCarousel: {
    paddingHorizontal: 16,
    gap: 12,
  },
  storyCard: {
    width: 110,
    height: 160,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  immersiveStoryCard: {
    width: 110,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  storyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyCardBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCardBubbleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  storyCardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  storyCardFooter: {
    marginBottom: 4,
  },
  storyCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  storyCardDesc: {
    fontSize: 9,
    fontWeight: '500',
  },
  storyCardProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  dailyCardLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  dailyIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dailyTextContainer: {
    flex: 1,
    zIndex: 2,
  },
  leafSilhouetteContainer: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.8,
  },
  journeyStatsCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  immersiveJourneyStatsCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  journeyStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  journeyStatsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  journeyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  journeyStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  encouragementBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  encouragementIcon: {
    marginRight: 2,
  },
  encouragementText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  quoteCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    position: 'relative',
  },
  quoteIcon: {
    marginRight: 10,
    opacity: 0.7,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
  },
  quoteSparkle: {
    marginLeft: 6,
    opacity: 0.8,
  },
  insightsCarousel: {
    paddingHorizontal: 16,
    gap: 12,
  },
  insightCardItem: {
    width: 160,
    minHeight: 220,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  immersiveInsightCardItem: {
    width: 160,
    minHeight: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 20,
    justifyContent: 'space-between',
  },
  insightCardIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  insightCardBody: {
    fontSize: 16,
    lineHeight: 24,
    flexShrink: 1,
    marginTop: 'auto',
    fontWeight: '500',
  },
  insightCardItemLocked: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  insightCardItemMore: {
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  insightCardItemMoreText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  questionsPlaceholderCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  placeholderCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  placeholderCardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  questionsCarousel: {
    paddingHorizontal: 16,
    gap: 12,
  },
  qCardItem: {
    width: 200,
    height: 150,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  immersiveQCardItem: {
    width: 200,
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    justifyContent: 'space-between',
  },
  qCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  qCardBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  qCardBubbleText: {
    fontSize: 10,
    fontWeight: '800',
  },
  qCardQuestion: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  qCardAnswer: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  storyModalContainer: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    position: 'relative',
  },
  storyProgressRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    zIndex: 10,
  },
  storyProgressBarSegment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  storyProgressBarFill: {
    height: '100%',
    width: 0,
  },
  storyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    zIndex: 10,
  },
  storyCloseButton: {
    padding: 8,
  },
  storySlideContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  storySlideInner: {
    alignItems: 'center',
    paddingHorizontal: 10,
    width: '100%',
  },
  storySlideIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  storySlideTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  storySlideLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  storySlideBodyText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#E2E8F0',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  storySlideFooterContainer: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 16,
    width: '80%',
    alignItems: 'center',
  },
  storySlideFooterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  storyTouchRow: {
    position: 'absolute',
    top: 100,
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 1,
  },
  storyTouchZoneLeft: {
    width: '30%',
    height: '100%',
  },
  storyTouchZoneRight: {
    width: '70%',
    height: '100%',
  },
});
