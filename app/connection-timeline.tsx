import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { getTimeline, RelationshipTimelineEvent } from '../api/relationshipApi';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';
import { logger } from '../utils/logger';
import { NetworkErrorState } from '../components/NetworkErrorState';

import { useT } from '../i18n';

export default function ConnectionTimelineScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const connectionId = parseInt(id || '0', 10);

  const { currentTheme } = useThemeStore();
  const { t, language } = useT();
  const isEn = language === 'en';

  const [timeline, setTimeline] = useState<RelationshipTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnectionTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTimeline(connectionId);
      setTimeline(data);
    } catch (err: any) {
      if (err.message !== 'SESSION_EXPIRED' && !err.isSessionExpiry) {
        setError(err.message || (isEn ? 'An error occurred while loading the time tunnel.' : 'Zaman tüneli yüklenirken bir hata oluştu.'));
      }
      logger.error('[ConnectionTimeline] Fetch error', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (connectionId) {
      fetchConnectionTimeline();
    }
  }, [connectionId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConnectionTimeline();
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created': return 'heart';
      case 'weather_change': return 'cloud-sunny';
      case 'ritual_done': return 'sparkles';
      default: return 'bookmark';
    }
  };

  const getEventIconColor = (type: string) => {
    switch (type) {
      case 'created': return '#F472B6';
      case 'weather_change': return '#60A5FA';
      case 'ritual_done': return '#FBBF24';
      default: return currentTheme.colors.primary;
    }
  };

  if (loading && !refreshing) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{isEn ? 'Time Tunnel' : 'Zaman Tüneli'}</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
          }
        >
          <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>
            {isEn ? 'Follow your emotional harmony growth and milestones here in a calm flow.' : 'Duygusal uyumunuzun gelişimini ve kilometre taşlarını buradan sakin bir akışla izleyin.'}
          </Text>

          {error && timeline.length === 0 ? (
            <NetworkErrorState message={error} onRetry={fetchConnectionTimeline} />
          ) : timeline.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: currentTheme.colors.cardBorder }]}>
              <Ionicons name="trail-sign-outline" size={40} color={currentTheme.colors.text.muted} />
              <Text style={[styles.emptyText, { color: currentTheme.colors.text.muted }]}>
                {isEn ? 'No milestones recorded in your time tunnel yet. Complete daily rituals to add your first milestones.' : 'Zaman tünelinde henüz kayıtlı bir kilometre taşı bulunmuyor. Günlük ritüelleri tamamlayarak ilk taşları ekleyebilirsiniz.'}
              </Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {/* Timeline spine line */}
              <View style={[styles.timelineLine, { backgroundColor: currentTheme.colors.cardBorder }]} />

              {timeline.map((event, index) => {
                const iconName = getEventIcon(event.event_type);
                const iconColor = getEventIconColor(event.event_type);

                const translateWeatherDesc = (desc: string) => {
                  if (!isEn) return desc;
                  return (desc || '')
                    .replace('Yeni atmosfer:', 'New atmosphere:')
                    .replace('Hafif Yoğun', 'Mildly Intense')
                    .replace('Durgun', 'Calm')
                    .replace('Hassas', 'Sensitive')
                    .replace('Güneşli', 'Sunny')
                    .replace('Bulutlu', 'Cloudy')
                    .replace('Yumuşak', 'Gentle');
                };

                const EVENT_LABELS: Record<string, { titleEn: string; descEn: string; titleTr: string; descTr: string }> = {
                  'created': {
                    titleEn: 'First Connection Established 🌿',
                    descEn: 'Your journey of emotional alignment on Selfplace has begun.',
                    titleTr: 'İlk Bağlantı Kuruldu 🌿',
                    descTr: 'Selfplace üzerinde duygusal uyum yolculuğunuz başladı.'
                  },
                  'weather_change': {
                    titleEn: 'Emotional Weather Updated 🌤️',
                    descEn: translateWeatherDesc(event.description_tr || ''),
                    titleTr: event.title_tr || 'Duygusal Hava Değişti 🌤️',
                    descTr: event.description_tr || ''
                  },
                  'ritual_done': {
                    titleEn: 'Shared Ritual Completed ✨',
                    descEn: 'You completed a ritual together. A beautiful bond.',
                    titleTr: 'Ortak Ritüel Tamamlandı ✨',
                    descTr: 'Birlikte bir ritüeli tamamladınız. Güzel bir bağ.'
                  },
                  'garden_level_up': {
                    titleEn: 'Relationship Garden Leveled Up 🌱',
                    descEn: 'Your shared garden has grown to a new level.',
                    titleTr: 'Bahçe Seviyesi Yükseldi 🌱',
                    descTr: 'Birlikte büyüttüğünüz bahçe yeni bir seviyeye ulaştı.'
                  },
                  'level_up': {
                    titleEn: 'Relationship Level Milestone 🎉',
                    descEn: 'Your connection has reached a new depth.',
                    titleTr: 'İlişki Seviyesi Yükseldi 🎉',
                    descTr: 'Bağlantınız yeni bir derinliğe ulaştı.'
                  },
                };
                const label = EVENT_LABELS[event.event_type];
                const title = isEn ? (label?.titleEn || event.title_tr) : (label?.titleTr || event.title_tr);
                const description = isEn ? (label?.descEn || event.description_tr) : (label?.descTr || event.description_tr);

                return (
                  <View key={event.id} style={styles.eventRow}>
                    
                    {/* Timeline Node Point */}
                    <View style={styles.nodeWrapper}>
                      <View style={[styles.nodeCircle, { backgroundColor: currentTheme.colors.card, borderColor: iconColor }]}>
                        <Ionicons name={iconName as any} size={14} color={iconColor} />
                      </View>
                    </View>

                    {/* Timeline Card */}
                    <View style={[styles.eventCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                      <Text style={[styles.eventTitle, { color: currentTheme.colors.text.primary }]}>
                        {title}
                      </Text>
                      {description && (
                        <Text style={[styles.eventDesc, { color: currentTheme.colors.text.secondary }]}>
                          {description}
                        </Text>
                      )}
                      <Text style={[styles.eventDate, { color: currentTheme.colors.text.muted }]}>
                        {new Date(event.created_at).toLocaleDateString(isEn ? 'en-US' : 'tr-TR')} · {new Date(event.created_at).toLocaleTimeString(isEn ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>

                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAGE_PADDING_H,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 60,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
    opacity: 0.8,
  },
  emptyBox: {
    padding: 30,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 8,
  },
  timelineLine: {
    position: 'absolute',
    left: 20,
    top: 10,
    bottom: 10,
    width: 2,
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  nodeWrapper: {
    width: 42,
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  eventCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginLeft: 10,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  eventDesc: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  eventDate: {
    fontSize: 11,
    marginTop: 10,
    fontStyle: 'italic',
  },
});
