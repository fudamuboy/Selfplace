import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, Easing, withDelay } from 'react-native-reanimated';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import useThemeStore from '../store/useThemeStore';

const { width } = Dimensions.get('window');

interface TestResult {
  id: number;
  test_type: 'color' | 'mbti';
  result_data: any;
  created_at: string;
}

// Custom Animated Progress Bar
const AnimatedProgressBar = ({ color, percentage, delay, label, icon }: { color: string, percentage: number, delay: number, label: string, icon: string }) => {
  const { currentTheme } = useThemeStore();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(percentage, { duration: 1000, easing: Easing.out(Easing.exp) }));
  }, [percentage, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`
  }));

  return (
    <View style={styles.barWrapper}>
      <View style={styles.barLabelContainer}>
        <Text style={[styles.barLabel, { color: currentTheme.colors.text.primary }]}>
          {icon} {label}
        </Text>
        <Text style={[styles.barPercentageText, { color: color }]}>
          %{percentage}
        </Text>
      </View>
      <View style={[styles.barContainer, { backgroundColor: currentTheme.colors.background[0] }]}>
        <Animated.View style={[styles.barFill, { backgroundColor: color }, animatedStyle]} />
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
      console.log('[ResultDetail] Failed to load result');
      setTimeout(() => router.back(), 2000);
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

  if (!result || result.test_type !== 'color') {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <Text style={{ color: currentTheme.colors.text.muted }}>Sonuç bulunamadı.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: currentTheme.colors.primary }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  const { result_data } = result;
  // If it's an old test without percentages, fake them or show legacy mode
  const percentages = result_data.percentages || {
    red: result_data.dominantColor === 'red' ? 60 : 10,
    blue: result_data.dominantColor === 'blue' ? 60 : 10,
    green: result_data.dominantColor === 'green' ? 60 : 10,
    yellow: result_data.dominantColor === 'yellow' ? 60 : 10,
  };

  const gradientColors = result_data.gradient || [result_data.colorHex, currentTheme.colors.background[1]];

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/personality-results')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.heroSection}>
          <LinearGradient
            colors={gradientColors}
            style={styles.heroGlow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroContent}>
            <Text style={[styles.heroSubtitle, { color: currentTheme.colors.text.muted }]}>DOMİNANT RENK</Text>
            <Text style={[styles.heroTitle, { color: result_data.colorHex }]}>{result_data.title}</Text>
            <Text style={[styles.heroDesc, { color: currentTheme.colors.text.primary }]}>{result_data.description}</Text>
          </View>
        </Animated.View>

        {/* Color Distribution */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary }]}>Renk Dağılımı</Text>
          
          <AnimatedProgressBar color="#EF4444" percentage={percentages.red} delay={300} label="Kırmızı (Liderlik)" icon="🔴" />
          <AnimatedProgressBar color="#F59E0B" percentage={percentages.yellow} delay={500} label="Sarı (Enerji)" icon="🟡" />
          <AnimatedProgressBar color="#10B981" percentage={percentages.green} delay={700} label="Yeşil (Uyum)" icon="🟢" />
          <AnimatedProgressBar color="#3B82F6" percentage={percentages.blue} delay={900} label="Mavi (Analiz)" icon="🔵" />
        </Animated.View>

        {/* Detailed Insights (Only for new tests) */}
        {result_data.strengths && (
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.insightsGrid}>
            <View style={[styles.insightCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.insightTitle, { color: currentTheme.colors.text.primary }]}>Güçlü Yönler</Text>
              {result_data.strengths.map((s: string, i: number) => (
                <Text key={i} style={[styles.bullet, { color: currentTheme.colors.text.secondary }]}>• {s}</Text>
              ))}
            </View>

            <View style={[styles.insightCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.insightTitle, { color: currentTheme.colors.text.primary }]}>Zayıf Yönler</Text>
              {result_data.weaknesses.map((s: string, i: number) => (
                <Text key={i} style={[styles.bullet, { color: currentTheme.colors.text.secondary }]}>• {s}</Text>
              ))}
            </View>

            <View style={[styles.insightFullCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.insightTitle, { color: currentTheme.colors.text.primary }]}>İlişki Tarzı</Text>
              <Text style={[styles.insightText, { color: currentTheme.colors.text.secondary }]}>{result_data.relationship}</Text>
            </View>

            <View style={[styles.insightFullCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.insightTitle, { color: currentTheme.colors.text.primary }]}>İletişim Şekli</Text>
              <Text style={[styles.insightText, { color: currentTheme.colors.text.secondary }]}>{result_data.communication}</Text>
            </View>

            <View style={[styles.insightFullCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.insightTitle, { color: currentTheme.colors.text.primary }]}>Stres Altında</Text>
              <Text style={[styles.insightText, { color: currentTheme.colors.text.secondary }]}>{result_data.stressBehavior}</Text>
            </View>

            <View style={[styles.insightFullCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.insightTitle, { color: currentTheme.colors.text.primary }]}>Motivasyon</Text>
              <Text style={[styles.insightText, { color: currentTheme.colors.text.secondary }]}>{result_data.motivation}</Text>
            </View>
          </Animated.View>
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
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
    paddingVertical: 20,
  },
  heroGlow: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
    filter: 'blur(40px)', // Only works on web, but on native we rely on opacity
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  barWrapper: {
    marginBottom: 20,
  },
  barLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  barPercentageText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  barContainer: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  insightCard: {
    width: (width - 40 - 16) / 2,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  insightFullCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
  }
});
