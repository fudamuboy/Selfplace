import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { GradientBackground } from '../components/GradientBackground';
import client from '../api/client';
import useThemeStore from '../store/useThemeStore';

const { width } = Dimensions.get('window');

export default function AstrologyFullScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await client.get('/astrology/weekly');
      setData(res.data.data);
    } catch (err) {
      console.error('[AstrologyFull] Fetch error', err);
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

  if (!data) {
    return (
      <GradientBackground>
        <View style={styles.centerContainer}>
          <Text style={{ color: currentTheme.colors.text.muted }}>Gökyüzü şu an sessiz...</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: currentTheme.colors.primary }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </GradientBackground>
    );
  }

  const { zodiacProfile, activeEvents, aiGuidance } = data;

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text.primary }]}>Haftalık Enerjin</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Section */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.heroSection}>
          <LinearGradient
            colors={[currentTheme.colors.primary, 'transparent']}
            style={styles.heroGlow}
          />
          <Text style={styles.heroIcon}>✨</Text>
          <Text style={[styles.heroSign, { color: currentTheme.colors.text.primary }]}>
            {zodiacProfile?.sign || 'Gökyüzü'}
          </Text>
          <Text style={[styles.heroElement, { color: currentTheme.colors.text.muted }]}>
            {zodiacProfile?.element} Grubu
          </Text>
        </Animated.View>

        {/* AI Synthesis Guidance */}
        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.guidanceContainer}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary }]}>Gökyüzü Fısıltısı</Text>
          <Text style={[styles.guidanceText, { color: currentTheme.colors.text.secondary }]}>
            {aiGuidance}
          </Text>
        </Animated.View>

        {/* Current Sky Events */}
        {activeEvents && activeEvents.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.eventsContainer}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary }]}>Şu Anki Gökyüzü</Text>
            {activeEvents.map((event: any, idx: number) => (
              <View key={idx} style={[styles.eventCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                <View style={styles.eventHeader}>
                  <Ionicons name="moon-outline" size={20} color={currentTheme.colors.primary} />
                  <Text style={[styles.eventTitle, { color: currentTheme.colors.text.primary }]}>{event.event_name}</Text>
                </View>
                <Text style={[styles.eventDesc, { color: currentTheme.colors.text.secondary }]}>{event.description}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Zodiac Profile Reminders */}
        {zodiacProfile && (
          <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.profileContainer}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.primary }]}>İçsel Doğanın Hatırlatıcısı</Text>
            
            <View style={[styles.profileCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.profileCardTitle, { color: currentTheme.colors.text.primary }]}>Yönetici Gezegen</Text>
              <Text style={[styles.profileCardText, { color: currentTheme.colors.text.secondary }]}>{zodiacProfile.ruling_planet}</Text>
            </View>

            <View style={[styles.profileCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.profileCardTitle, { color: currentTheme.colors.text.primary }]}>Temel İhtiyacın</Text>
              <Text style={[styles.profileCardText, { color: currentTheme.colors.text.secondary }]}>{zodiacProfile.core_needs}</Text>
            </View>

            <View style={[styles.profileCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.profileCardTitle, { color: currentTheme.colors.text.primary }]}>Güçlü Yönlerin</Text>
              <Text style={[styles.profileCardText, { color: currentTheme.colors.text.secondary }]}>
                {zodiacProfile.strengths && typeof zodiacProfile.strengths === 'string' 
                  ? JSON.parse(zodiacProfile.strengths).join(' • ') 
                  : (zodiacProfile.strengths || []).join(' • ')}
              </Text>
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
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -20,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    opacity: 0.15,
    transform: [{ scale: 1.5 }],
    filter: 'blur(30px)',
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  heroSign: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  heroElement: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  guidanceContainer: {
    marginBottom: 40,
  },
  guidanceText: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '400',
  },
  eventsContainer: {
    marginBottom: 40,
  },
  eventCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  eventDesc: {
    fontSize: 15,
    lineHeight: 24,
  },
  profileContainer: {
    marginBottom: 20,
  },
  profileCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  profileCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
  },
  profileCardText: {
    fontSize: 15,
    lineHeight: 22,
  }
});
