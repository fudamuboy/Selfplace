import re

with open('app/personality-results.tsx', 'r') as f:
    content = f.read()

new_content = """import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import useThemeStore from '../store/useThemeStore';

interface TestResult {
  id: number;
  test_type: string;
  result_data: any;
  created_at: string;
}

export default function PersonalityResultsScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  
  const [history, setHistory] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await client.get('/personality/history');
      if (res.data && res.data.success !== false) {
        // We only care about the new 'journey' tests for the evolution timeline
        setHistory(res.data.journey || []);
      } else {
        setHistory([]);
      }
    } catch (_err) {
      console.log('[Personality Results] Soft failure on history fetch');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeDiff = (currentDateStr: string, index: number) => {
    if (index >= history.length - 1) return null; // no previous test
    
    // We compare with the NEXT item in the array (which is chronologically the PREVIOUS test, since it's sorted DESC)
    const prevDateStr = history[index + 1].created_at;
    const current = new Date(currentDateStr).getTime();
    const previous = new Date(prevDateStr).getTime();
    
    const diffTime = Math.abs(current - previous);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) return `${diffDays} Gün Önce → Şimdi`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} Hafta Önce → Şimdi`;
    return `${Math.floor(diffDays / 30)} Ay Önce → Şimdi`;
  };

  const renderEvolutionCard = (result: TestResult, index: number) => {
    const { archetype_name, color_family, dominant_shift } = result.result_data;
    const date = new Date(result.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const colorHex = color_family?.hex || result.result_data.dominant_color || currentTheme.colors.primary;
    const timeFrameStr = calculateTimeDiff(result.created_at, index);
    const isLatest = index === 0;

    return (
      <Animated.View key={result.id} entering={FadeInUp.delay(index * 150).duration(500)} style={styles.cardWrapper}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/personality-result-detail', params: { id: result.id } })}
          style={[styles.resultCard, { backgroundColor: currentTheme.colors.cardBackground, borderColor: currentTheme.colors.cardBorder }]}
        >
          {isLatest && <View style={[styles.latestGlow, { backgroundColor: colorHex }]} />}
          
          <View style={styles.cardHeader}>
            <View style={[styles.colorDot, { backgroundColor: colorHex, shadowColor: colorHex }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary }]}>{archetype_name}</Text>
              <Text style={[styles.cardDate, { color: currentTheme.colors.text.muted }]}>{date}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.text.muted} />
          </View>
        </TouchableOpacity>

        {/* If this test has a drift reflection, render the Evrim Kartı attached below it */}
        {dominant_shift && timeFrameStr && (
          <View style={[styles.driftCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: currentTheme.colors.cardBorder }]}>
            <Text style={[styles.timeFrameText, { color: currentTheme.colors.text.secondary }]}>
              {timeFrameStr}
            </Text>
            <Text style={[styles.driftText, { color: currentTheme.colors.text.primary }]}>
              {color_family?.symbol || '✨'} {dominant_shift}
            </Text>
          </View>
        )}
      </Animated.View>
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

  const hasNoResults = history.length === 0;

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
          <Animated.View entering={FadeInDown.duration(800)} style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color={currentTheme.colors.text.muted} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: currentTheme.colors.text.secondary }]}>
              Henüz yeterince içsel iz oluşmadı 🌿
            </Text>
            <Text style={[styles.emptySubText, { color: currentTheme.colors.text.muted }]}>
              Zamanla ruhunun değişen ritmini burada görebileceksin.
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.timelineContainer}>
            {/* Connection Line */}
            {history.length > 1 && (
              <View style={[styles.timelineLine, { backgroundColor: currentTheme.colors.cardBorder }]} />
            )}
            
            {history.map((res, index) => renderEvolutionCard(res, index))}
          </View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 40 },
  emptyContainer: { marginTop: 60, alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 18, fontWeight: '500', textAlign: 'center', marginBottom: 8 },
  emptySubText: { fontSize: 15, lineHeight: 24, textAlign: 'center' },
  
  timelineContainer: { position: 'relative' },
  timelineLine: {
    position: 'absolute',
    left: 28,
    top: 40,
    bottom: 40,
    width: 2,
    zIndex: 0,
  },
  cardWrapper: {
    marginBottom: 24,
    zIndex: 1,
  },
  resultCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  latestGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 16,
    marginLeft: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardDate: { fontSize: 13 },
  
  driftCard: {
    marginLeft: 40,
    marginRight: 10,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  timeFrameText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  driftText: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 24,
  }
});
"""

with open('app/personality-results.tsx', 'w') as f:
    f.write(new_content)
