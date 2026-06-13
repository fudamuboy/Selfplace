import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { MascotBlob } from '../../components/MascotBlob';
import { MascotMood, getMascotMessage, EmotionalContext } from '../../utils/mascotThemeEngine';
import { CustomButton } from '../../components/CustomButton';
import useAuthStore from '../../store/useAuthStore';
import useThemeStore from '../../store/useThemeStore';
import { LinearGradient } from 'expo-linear-gradient';
import { sanitizeText } from '../../utils/textSanitizer';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H } from '../../constants/Layout';
import { Ionicons } from '@expo/vector-icons';
import { getConnections, getDailySync, RelationshipConnection, RelationshipDailySync } from '../../api/relationshipApi';

import client from '../../api/client';
import Animated, { FadeInUp, FadeOutDown, FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const { currentTheme } = useThemeStore();
  const [cardUsedToday, setCardUsedToday] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [latestMood, setLatestMood] = React.useState<MascotMood>('neutral');
  const [stressLevel, setStressLevel] = React.useState(0);
  const [emotionalContext, setEmotionalContext] = React.useState<EmotionalContext>({
    recentMoods: [],
    intensity: 0,
    isDistressed: false
  });
  
  const [activeConnection, setActiveConnection] = React.useState<RelationshipConnection | null>(null);
  const [connectionDailySync, setConnectionDailySync] = React.useState<RelationshipDailySync | null>(null);
  const [isHubDismissed, setIsHubDismissed] = React.useState(false);
  const [mascotMessage, setMascotMessage] = React.useState('');

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    // Auto hide after 4 seconds
    const timer = setTimeout(() => setShowToast(false), 4000);
    return () => clearTimeout(timer);
  };
  


  const getLocalDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const mapMoodToMascot = (mood: string): MascotMood => {
    const m = mood.toLowerCase();
    if (m.includes('mutlu') || m.includes('iyi') || m.includes('happy')) return 'happy';
    if (m.includes('sakin') || m.includes('huzurlu') || m.includes('calm')) return 'calm';
    if (m.includes('üzgün') || m.includes('kötü') || m.includes('sad')) return 'sad';
    if (m.includes('yorgun') || m.includes('bitkin') || m.includes('tired')) return 'tired';
    if (m.includes('düşünceli') || m.includes('reflective')) return 'reflective';
    if (m.includes('heyecanlı') || m.includes('excited')) return 'excited';
    
    const h = new Date().getHours();
    if (h >= 22 || h < 5) return 'sleepy';
    return 'neutral';
  };

  const [astrologyData, setAstrologyData] = React.useState<{
    events?: any[];
    zodiacGuidance?: any;
    userZodiac?: string | null;
    zodiacSign?: string | null;
    preview_text: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      // Load dismissal state
      const dismissed = await AsyncStorage.getItem('relationship_onboarding_dismissed');
      setIsHubDismissed(dismissed === 'true');

      // 1. Check card status
      const cardRes = await client.get(`/cards/interactive?localDate=${getLocalDate()}`);
      setCardUsedToday(!!cardRes.data.alreadySelected);

      // 2. Get latest mood and emotional history for mascot
      const checkInRes = await client.get('/check-ins');
      let currentContext = { recentMoods: [] as string[], intensity: 0, isDistressed: false };
      if (checkInRes.data && checkInRes.data.length > 0) {
        const lastCheckIn = checkInRes.data[0];
        const mappedMood = mapMoodToMascot(lastCheckIn.mood);
        
        const checkInDate = new Date(lastCheckIn.created_at).toISOString().split('T')[0];
        if (checkInDate === getLocalDate()) {
          setLatestMood(mappedMood);
        } else {
          setLatestMood('neutral');
        }
        
        // Calculate emotional context from last 24h
        const now = new Date();
        const last24h = checkInRes.data.filter((ci: any) => {
          const ciDate = new Date(ci.created_at);
          return (now.getTime() - ciDate.getTime()) < 24 * 60 * 60 * 1000;
        });

        const recentMoods = last24h.map((ci: any) => ci.mood.toLowerCase());
        const negativeKeywords = ['anxious', 'sad', 'exhausted', 'tired', 'upset', 'angry', 'kaygılı', 'üzgün', 'yorgun', 'kızgın', 'stres'];
        const isDistressed = recentMoods.some((m: string) => negativeKeywords.some(kw => m.includes(kw)));
        
        currentContext = {
          recentMoods,
          intensity: last24h.length / 5, // Normalize 0-1
          isDistressed
        };
        setEmotionalContext(currentContext);

        // Calculate stress level
        if (lastCheckIn.mood.toLowerCase().includes('stres') || lastCheckIn.mood.toLowerCase().includes('kaygı')) {
          setStressLevel(0.8);
        } else {
          setStressLevel(0);
        }
      } else {
        setLatestMood('neutral');
        setEmotionalContext(currentContext);
      }

      // Generate stable mascot message on focus load
      const msg = getMascotMessage(new Date().getHours(), currentContext);
      setMascotMessage(msg);

      // 3. Fetch Astrology Data
      const astroRes = await client.get('/astrology/home');
      setAstrologyData(astroRes.data.data);

      // 4. Fetch Relationship connection & daily sync details
      try {
        const conns = await getConnections();
        const activeConn = conns.find(c => c.status === 'active');
        if (activeConn) {
          setActiveConnection(activeConn);
          try {
            const syncData = await getDailySync(activeConn.id);
            setConnectionDailySync(syncData);
          } catch (_) {
            setConnectionDailySync(null);
          }
        } else {
          setActiveConnection(null);
          setConnectionDailySync(null);
        }
      } catch (_) {
        setActiveConnection(null);
        setConnectionDailySync(null);
      }

    } catch (err: any) {
      if (err.response?.status !== 401) {
        console.warn('Home: Data fetch error');
      }
    }
  };

  const token = useAuthStore(state => state.token);

  // Use useFocusEffect to refresh state every time user returns to Home
  // This ensures the card button locks instantly after returning from the selection screen
  const { useFocusEffect } = require('expo-router');
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchData();
      }
    }, [token])
  );

  const handleCardPress = () => {
    if (cardUsedToday) {
      triggerToast(`Bugün kart hakkını kullandın ✨\nYarın tekrar bir kart seçebilirsin.`);
      return;
    }
    router.push('/cards');
  };

  const handleDismissHub = async () => {
    setIsHubDismissed(true);
    await AsyncStorage.setItem('relationship_onboarding_dismissed', 'true');
    triggerToast("Bu alanı profil ayarlarından dilediğin zaman açabilirsin. 🌿");
  };


  const renderRelationshipHub = () => {
    if (activeConnection) {
      return (
        <Animated.View entering={FadeInUp.delay(100)} style={styles.hubSection}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push(`/connection-detail?id=${activeConnection.id}`)}
            style={[styles.hubCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
          >
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.05)', 'rgba(167, 139, 250, 0.05)']}
              style={styles.hubGradient}
            >
              <View style={styles.hubHeaderRow}>
                <View style={[styles.avatarCircle, { backgroundColor: currentTheme.colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {(activeConnection.partnerAlias || activeConnection.partner.username).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={[styles.partnerNameText, { color: currentTheme.colors.text.primary }]}>
                      {activeConnection.partnerAlias || activeConnection.partner.username}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                      <Text style={[styles.typeBadgeText, { color: currentTheme.colors.text.secondary }]}>
                        {activeConnection.connectionType === 'partner' ? '💞 Partner' : activeConnection.connectionType === 'family' ? '🌿 Aile' : activeConnection.connectionType === 'best_friend' ? '🌟 Arkadaş' : '🤍 Yakın Kişi'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.hubStatusText, { color: currentTheme.colors.text.secondary }]} numberOfLines={2}>
                    {connectionDailySync 
                      ? `Bugün ilişkinizde ${connectionDailySync.emotional_weather.toLowerCase()} bir ritim hissediliyor 🌿` 
                      : "Birlikte keşif alanınız aktif ✨"}
                  </Text>
                </View>
              </View>

              <View style={styles.shortcutDivider} />

              <View style={styles.shortcutsRow}>
                <TouchableOpacity 
                  style={styles.shortcutBtn}
                  onPress={() => router.push(`/connection-rituals?id=${activeConnection.id}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubbles-outline" size={15} color={currentTheme.colors.primary} />
                  <Text style={[styles.shortcutBtnText, { color: currentTheme.colors.text.secondary }]}>Ritüel</Text>
                </TouchableOpacity>

                <View style={styles.shortcutSeparator} />

                <TouchableOpacity 
                  style={styles.shortcutBtn}
                  onPress={() => router.push(`/connection-timeline?id=${activeConnection.id}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trail-sign-outline" size={15} color={currentTheme.colors.primary} />
                  <Text style={[styles.shortcutBtnText, { color: currentTheme.colors.text.secondary }]}>Zaman Tüneli</Text>
                </TouchableOpacity>

                <View style={styles.shortcutSeparator} />

                <TouchableOpacity 
                  style={styles.shortcutBtn}
                  onPress={() => router.push(`/connection-detail?id=${activeConnection.id}`)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sparkles-outline" size={15} color={currentTheme.colors.primary} />
                  <Text style={[styles.shortcutBtnText, { color: currentTheme.colors.text.secondary }]}>Uyum</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    if (isHubDismissed) {
      return null;
    }

    return (
      <Animated.View entering={FadeInUp.delay(100)} style={styles.hubSectionCompact}>
        <View style={[styles.hubCardCompact, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <LinearGradient
            colors={['rgba(236, 72, 153, 0.02)', 'rgba(167, 139, 250, 0.01)']}
            style={styles.hubGradientCompact}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.compactRow}>
              <View style={[styles.compactIconBg, { backgroundColor: 'rgba(236, 72, 153, 0.03)' }]}>
                <Ionicons name="heart-outline" size={14} color="#EC4899" style={{ opacity: 0.8 }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.compactText, { color: currentTheme.colors.text.secondary }]}>
                  <Text style={{ fontWeight: '600', color: currentTheme.colors.text.primary }}>💞 Birlikte Alan Aç </Text>
                  · Partner ekleyerek ortak ritüeller keşfet.
                </Text>
              </View>
              <View style={styles.compactActionsContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/connections')}
                  style={[styles.compactCtaBtn, { borderColor: currentTheme.colors.primary + '22' }]}
                >
                  <Text style={[styles.compactCtaText, { color: currentTheme.colors.primary }]}>Aç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDismissHub}
                  style={styles.compactDismissBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={14} color={currentTheme.colors.text.muted} />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    );
  };

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContent}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: currentTheme.colors.text.primary }]}>Merhaba {user?.username},</Text>
          <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>Bugün kendin için bir şeyler yapmaya ne dersin?</Text>
        </View>

        <TouchableOpacity 
          style={styles.mascotContainer} 
          onPress={() => router.push('/ai-chat')}
          activeOpacity={0.8}
        >
          <MascotBlob 
            mood={latestMood} 
            stressLevel={stressLevel}
            emotionalContext={emotionalContext}
          />
          <Text style={[styles.mascotText, { color: currentTheme.colors.text.secondary }]}>
            &quot;{mascotMessage || getMascotMessage(new Date().getHours(), emotionalContext)}&quot;
          </Text>
        </TouchableOpacity>

        {/* Relationship Hub Spotlight */}
        {renderRelationshipHub()}

        <View style={styles.actions}>
          <CustomButton 
            title="Günlük Check-in Yap" 
            onPress={() => router.push('/check-in')}
            variant="primary"
          />
          <CustomButton 
            title={cardUsedToday ? "Bugünkü Kartını Çektin ✨" : "Bir Davet Kartı Çek"} 
            onPress={handleCardPress}
            variant="secondary"
            disabled={cardUsedToday}
            style={[{ marginBottom: 12 }, cardUsedToday && { opacity: 0.4 }]}
          />
          <TouchableOpacity 
            onPress={() => router.push('/ai-chat')}
            style={[styles.aiButton, { borderColor: currentTheme.colors.primary + '44' }]}
          >
            <LinearGradient
              colors={['rgba(167, 139, 250, 0.15)', 'rgba(109, 40, 217, 0.05)']}
              style={styles.aiButtonGradient}
            >
              <Text style={[styles.aiButtonText, { color: currentTheme.colors.text.primary }]}>
                Duygusal Rehberinle Konuş ✨
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Dynamic Daily Astrology Preview */}
        {astrologyData ? (
          <Animated.View entering={FadeInDown.delay(300).springify().damping(18).stiffness(90)} style={styles.energySection}>
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => router.push('/astrology-full')}
              style={[styles.energyCard, { borderColor: 'rgba(167, 139, 250, 0.2)' }]}
            >
              <LinearGradient
                colors={['rgba(109, 40, 217, 0.15)', 'rgba(30, 27, 75, 0.4)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />
              <View style={styles.energyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.energyTitle, { color: currentTheme.colors.text.primary, fontSize: 16 }]}>✨ Bugünün Enerjisi</Text>
                </View>
              </View>
              
              <Text style={[styles.eventMessage, { color: currentTheme.colors.text.primary, marginTop: 4, lineHeight: 24, fontSize: 15, fontWeight: '400' }]} numberOfLines={3}>
                {astrologyData.preview_text}
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                {(astrologyData as any).generatedAt && (new Date().getTime() - new Date((astrologyData as any).generatedAt).getTime()) < 12 * 60 * 60 * 1000 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A78BFA', shadowColor: '#A78BFA', shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
                    <Text style={{ fontSize: 12, color: '#A78BFA', fontWeight: '500', letterSpacing: 0.5 }}>Taze</Text>
                  </View>
                ) : <View />}
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Gökyüzüne Git →</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          /* Fallback empty state protection */
          <Animated.View entering={FadeInDown.delay(300)} style={styles.energySection}>
            <TouchableOpacity 
              activeOpacity={0.85}
              onPress={() => router.push('/astrology-full')}
              style={[styles.energyCard, { borderColor: 'rgba(167, 139, 250, 0.1)' }]}
            >
              <LinearGradient
                colors={['rgba(109, 40, 217, 0.05)', 'rgba(30, 27, 75, 0.2)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 24 }]}
              />
              <Text style={[styles.energyTitle, { color: currentTheme.colors.text.primary, fontSize: 16, marginBottom: 8 }]}>✨ Bugünün Enerjisi</Text>
              <Text style={{ color: currentTheme.colors.text.secondary, fontStyle: 'italic', fontSize: 14 }}>
                Bugün zihninin içinde hafif bir hareket olabilir. Yıldızlara göz at...
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {showToast && (
          <Animated.View 
            entering={FadeInUp} 
            exiting={FadeOutDown}
            style={[styles.toast, { backgroundColor: currentTheme.colors.primary + 'EE' }]}
          >
            <Text style={styles.toastText}>
              {toastMessage}
            </Text>
          </Animated.View>
        )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
  },
  innerContent: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    padding: PAGE_PADDING_H,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  mascotContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  mascotText: {
    fontStyle: 'italic',
    marginTop: 20,
    fontSize: 16,
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: 20,
    gap: 12,
  },
  aiButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  aiButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 20,
  },
  energySection: {
    marginBottom: 32,
    width: '100%',
  },
  energyCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  energyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  energyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  energySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  energySymbol: {
    fontSize: 20,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventSymbol: {
    fontSize: 24,
    marginRight: 16,
  },
  eventMessage: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  energyActionText: {
    fontSize: 14,
  },
  hubSection: {
    marginBottom: 24,
    width: '100%',
  },
  hubCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hubGradient: {
    padding: 18,
  },
  hubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  hubIconBg: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  hubSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  hubFooter: {
    marginTop: 12,
    alignItems: 'flex-end',
  },
  hubCta: {
    fontSize: 13,
    fontWeight: '700',
  },
  hubSectionCompact: {
    marginBottom: 16,
    width: '100%',
  },
  hubCardCompact: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hubGradientCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactText: {
    fontSize: 11,
    lineHeight: 15,
  },
  compactActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactCtaBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  compactCtaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  compactDismissBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  partnerNameText: {
    fontSize: 16,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  hubStatusText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  shortcutDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  shortcutsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  shortcutBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutSeparator: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});
