import re

with open('app/personality-result-detail.tsx', 'r') as f:
    content = f.read()

new_content = """import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, useAnimatedStyle, useSharedValue, withTiming, Easing, withDelay } from 'react-native-reanimated';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import useThemeStore from '../store/useThemeStore';

const { width } = Dimensions.get('window');

interface TestResult {
  id: number;
  test_type: string;
  result_data: {
    archetype_name: string;
    dominant_color: string;
    description: string;
    relationship_style: string;
    strengths: string[];
    blind_spots: string[];
    communication_energy: string;
    scores: Record<string, number>;
  };
  created_at: string;
}

// Radar or Bar representation for Dimension
const DimensionBar = ({ label, score, color, delay }: { label: string, score: number, color: string, delay: number }) => {
  const { currentTheme } = useThemeStore();
  const progress = useSharedValue(0);

  useEffect(() => {
    // Score is roughly -10 to 10, normalize to 0-100%
    const normalized = Math.max(0, Math.min(100, (score + 10) * 5));
    progress.value = withDelay(delay, withTiming(normalized, { duration: 1000, easing: Easing.out(Easing.exp) }));
  }, [score, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`
  }));

  return (
    <View style={styles.dimensionWrapper}>
      <Text style={[styles.dimensionLabel, { color: currentTheme.colors.text.primary }]}>{label}</Text>
      <View style={[styles.dimensionTrack, { backgroundColor: currentTheme.colors.cardBackground }]}>
        <Animated.View style={[styles.dimensionFill, { backgroundColor: color }, animatedStyle]} />
      </View>
    </View>
  );
};

export default function PersonalityResultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResult();
  }, [id]);

  const fetchResult = async () => {
    try {
      const res = await client.get(`/personality/history/${id}`);
      setResult(res.data.result);
    } catch (err) {
      console.error('[PersonalityResult] Error:', err);
    } finally {
      setLoading(false);
    }
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

  if (!result || !result.result_data.archetype_name) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <Text style={{ color: currentTheme.colors.text.primary }}>Sonuç bulunamadı.</Text>
        </View>
      </GradientBackground>
    );
  }

  const {
    archetype_name,
    dominant_color,
    description,
    relationship_style,
    strengths,
    blind_spots,
    communication_energy,
    scores
  } = result.result_data;

  const accentColor = dominant_color || currentTheme.colors.primary;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/account')} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Hero Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.heroSection}>
          <LinearGradient
            colors={[accentColor, currentTheme.colors.background[0]]}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.heroContent}>
            <Text style={[styles.title, { color: '#FFF' }]}>{archetype_name}</Text>
            <Text style={[styles.description, { color: 'rgba(255,255,255,0.9)' }]}>
              {description}
            </Text>
          </View>
        </Animated.View>

        {/* Dynamic Dimensions */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={[styles.card, { backgroundColor: currentTheme.colors.cardBackground, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary }]}>Duygusal Enerji Boyutların</Text>
          <View style={styles.dimensionsList}>
            <DimensionBar label="Sosyal Enerji" score={scores.social_energy || 0} color={accentColor} delay={300} />
            <DimensionBar label="Duygusal İfade" score={scores.emotional_expression || 0} color={accentColor} delay={400} />
            <DimensionBar label="Bağlanma İhtiyacı" score={scores.attachment || 0} color={accentColor} delay={500} />
            <DimensionBar label="İçsel Ritim" score={scores.energy_rhythm || 0} color={accentColor} delay={600} />
            <DimensionBar label="Merak ve Keşif" score={scores.curiosity || 0} color={accentColor} delay={700} />
          </View>
        </Animated.View>

        {/* Strengths & Blind Spots */}
        <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.splitRow}>
          <View style={[styles.splitCard, { backgroundColor: currentTheme.colors.cardBackground, borderColor: currentTheme.colors.cardBorder }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(74, 222, 128, 0.15)' }]}>
              <Ionicons name="leaf" size={24} color="#4ade80" />
            </View>
            <Text style={[styles.splitTitle, { color: currentTheme.colors.text.primary }]}>Güçlü Yönlerin</Text>
            {strengths?.map((s, i) => (
              <Text key={i} style={[styles.bulletPoint, { color: currentTheme.colors.text.secondary }]}>• {s}</Text>
            ))}
          </View>

          <View style={[styles.splitCard, { backgroundColor: currentTheme.colors.cardBackground, borderColor: currentTheme.colors.cardBorder }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(248, 113, 113, 0.15)' }]}>
              <Ionicons name="eye-off" size={24} color="#f87171" />
            </View>
            <Text style={[styles.splitTitle, { color: currentTheme.colors.text.primary }]}>Görünmez Alanlar</Text>
            {blind_spots?.map((s, i) => (
              <Text key={i} style={[styles.bulletPoint, { color: currentTheme.colors.text.secondary }]}>• {s}</Text>
            ))}
          </View>
        </Animated.View>

        {/* Relational Style */}
        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={[styles.card, { backgroundColor: currentTheme.colors.cardBackground, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary }]}>İlişki ve İletişim Tarzın</Text>
          <Text style={[styles.cardText, { color: currentTheme.colors.text.secondary, marginBottom: 12 }]}>
            <Text style={{ fontWeight: '700', color: currentTheme.colors.text.primary }}>Bağlanma: </Text>
            {relationship_style}
          </Text>
          <Text style={[styles.cardText, { color: currentTheme.colors.text.secondary }]}>
            <Text style={{ fontWeight: '700', color: currentTheme.colors.text.primary }}>İletişim: </Text>
            {communication_energy}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeIn.duration(800).delay(800)} style={{ alignItems: 'center', marginVertical: 30 }}>
          <Text style={{ color: currentTheme.colors.text.muted, fontSize: 13, fontStyle: 'italic' }}>
            Duygusal kimliğin zamanla evrilir. Tekrar keşfetmekten çekinme.
          </Text>
        </Animated.View>

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
  scrollContainer: {
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  closeBtn: {
    padding: 8,
  },
  heroSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.8,
  },
  heroContent: {
    padding: 30,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 24,
  },
  dimensionsList: {
    gap: 16,
  },
  dimensionWrapper: {
    width: '100%',
  },
  dimensionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  dimensionTrack: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  dimensionFill: {
    height: '100%',
    borderRadius: 4,
  },
  splitRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 16,
  },
  splitCard: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  splitTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  }
});
"""

with open('app/personality-result-detail.tsx', 'w') as f:
    f.write(new_content)
