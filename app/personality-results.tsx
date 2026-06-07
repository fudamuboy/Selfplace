import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import useThemeStore from '../store/useThemeStore';

interface TestResult {
  id: number;
  test_type: 'color' | 'mbti';
  result_data: any;
  created_at: string;
}

export default function PersonalityResultsScreen() {
  const { resultId } = useLocalSearchParams<{ resultId?: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  
  const [history, setHistory] = useState<{ color: TestResult[], mbti: TestResult[] }>({ color: [], mbti: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await client.get('/personality/history');
      if (res.data && res.data.success !== false) {
        setHistory({
          color: res.data.color || [],
          mbti: res.data.mbti || []
        });
      } else {
        setHistory({ color: [], mbti: [] });
      }
    } catch (_err) {
      // Silently catch the error to prevent Expo red screens or aggressive alerts
      console.log('[Personality Results] Soft failure on history fetch');
      setHistory({ color: [], mbti: [] });
    } finally {
      setLoading(false);
    }
  };

  const renderColorResult = (result: TestResult, isLatest: boolean) => {
    const { dominantColor, title, description, percentages } = result.result_data;
    const colorHex = result.result_data.colorHex || result.result_data.color || '#3B82F6';
    const date = new Date(result.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <TouchableOpacity 
        key={result.id} 
        activeOpacity={0.8}
        onPress={() => router.push({ pathname: '/personality-result-detail', params: { id: result.id } })}
        style={[styles.resultCard, { backgroundColor: currentTheme.colors.card, borderColor: isLatest ? colorHex : currentTheme.colors.cardBorder }]}
      >
        {isLatest && <Text style={[styles.latestBadge, { color: colorHex }]}>EN YENİ</Text>}
        <View style={styles.cardHeader}>
          <View style={[styles.colorDot, { backgroundColor: colorHex }]} />
          <View>
            <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary }]}>{title}</Text>
            <Text style={[styles.cardDate, { color: currentTheme.colors.text.muted }]}>{date}</Text>
          </View>
        </View>
        
        {percentages && (
          <View style={{ flexDirection: 'row', gap: 4, height: 6, width: '100%', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
            <View style={{ flex: percentages.red, backgroundColor: '#EF4444' }} />
            <View style={{ flex: percentages.yellow, backgroundColor: '#F59E0B' }} />
            <View style={{ flex: percentages.green, backgroundColor: '#10B981' }} />
            <View style={{ flex: percentages.blue, backgroundColor: '#3B82F6' }} />
          </View>
        )}

        <Text style={[styles.cardDescription, { color: currentTheme.colors.text.secondary }]}>{description}</Text>
      </TouchableOpacity>
    );
  };

  const renderMBTIResult = (result: TestResult, isLatest: boolean) => {
    const { type, title, subtitle, description } = result.result_data;
    const date = new Date(result.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <View key={result.id} style={[styles.resultCard, { backgroundColor: currentTheme.colors.card, borderColor: isLatest ? currentTheme.colors.primary : currentTheme.colors.cardBorder }]}>
        {isLatest && <Text style={[styles.latestBadge, { color: currentTheme.colors.primary }]}>EN YENİ</Text>}
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: currentTheme.colors.glow }]}>
            <Text style={[styles.typeText, { color: currentTheme.colors.primary }]}>{type}</Text>
          </View>
          <View>
            <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary }]}>{title}</Text>
            <Text style={[styles.cardDate, { color: currentTheme.colors.text.muted }]}>{subtitle} • {date}</Text>
          </View>
        </View>
        <Text style={[styles.cardDescription, { color: currentTheme.colors.text.secondary }]}>{description}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  const hasNoResults = history.color.length === 0 && history.mbti.length === 0;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Duygusal Evrim</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>
          İç dünyandaki değişimler ve ruhunun zaman içindeki yansımaları.
        </Text>

        {hasNoResults ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: currentTheme.colors.text.muted }]}>
              Kendini keşfetme yolculuğun henüz yeni başlıyor 🌿
            </Text>
          </View>
        ) : (
          <>
            {history.color.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary }]}>Ruhunun Renkleri</Text>
                {history.color.map((res, index) => renderColorResult(res, index === 0))}
              </View>
            )}

            {history.mbti.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary }]}>İçsel Pusulan (Kişilik)</Text>
                {history.mbti.map((res, index) => renderMBTIResult(res, index === 0))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 40,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  resultCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  latestBadge: {
    position: 'absolute',
    top: 16,
    right: 20,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 60, // space for badge
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 16,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 16,
  },
  typeText: {
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 22,
  }
});
