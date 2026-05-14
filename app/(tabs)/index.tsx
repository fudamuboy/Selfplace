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
import client from '../../api/client';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const { currentTheme } = useThemeStore();
  const [cardUsedToday, setCardUsedToday] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const [latestMood, setLatestMood] = React.useState<MascotMood>('neutral');
  const [stressLevel, setStressLevel] = React.useState(0);
  const [emotionalContext, setEmotionalContext] = React.useState<EmotionalContext>({
    recentMoods: [],
    intensity: 0,
    isDistressed: false
  });
  


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
    events: any[],
    zodiacGuidance: any,
    userZodiac: string | null
  } | null>(null);

  const fetchData = async () => {
    try {
      // 1. Check card status
      const cardRes = await client.get(`/cards/interactive?localDate=${getLocalDate()}`);
      setCardUsedToday(!!cardRes.data.alreadySelected);

      // 2. Get latest mood and emotional history for mascot
      const checkInRes = await client.get('/check-ins');
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
        
        setEmotionalContext({
          recentMoods,
          intensity: last24h.length / 5, // Normalize 0-1
          isDistressed
        });

        // Calculate stress level
        if (lastCheckIn.mood.toLowerCase().includes('stres') || lastCheckIn.mood.toLowerCase().includes('kaygı')) {
          setStressLevel(0.8);
        } else {
          setStressLevel(0);
        }
      } else {
        setLatestMood('neutral');
        setEmotionalContext({ recentMoods: [], intensity: 0, isDistressed: false });
      }

      // 3. Fetch Astrology Data
      const astroRes = await client.get('/astrology/current');
      setAstrologyData(astroRes.data);

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
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    router.push('/cards');
  };

  const getPriorityInsights = () => {
    if (!astrologyData) return [];
    
    const candidates: { symbol: string, message: string, priority: number }[] = [];
    
    // Priority 1: Major Collective Events (Moon, Solstice)
    astrologyData.events.forEach(e => {
      if (e.event_type === 'moon' || e.event_type === 'solstice') {
        candidates.push({ symbol: e.symbol || '🌙', message: e.message_tr, priority: 1 });
      }
    });
    
    // Priority 2: Zodiac Monthly Guidance
    if (astrologyData.zodiacGuidance) {
      candidates.push({ 
        symbol: '✨', 
        message: astrologyData.zodiacGuidance.guidance_tr, 
        priority: 2 
      });
    }
    
    // Priority 3: Seasonal / Cultural Insights
    astrologyData.events.forEach(e => {
      if (e.event_type !== 'moon' && e.event_type !== 'solstice') {
        candidates.push({ symbol: e.symbol || '🌿', message: e.message_tr, priority: 3 });
      }
    });
    
    // Sort by priority and remove duplicates by message content
    const sorted = candidates.sort((a, b) => a.priority - b.priority);
    const unique = Array.from(new Map(sorted.map(item => [item.message, item])).values());
    
    return unique.slice(0, 2);
  };

  const activeInsights = getPriorityInsights();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
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
            "{getMascotMessage(new Date().getHours(), emotionalContext)}"
          </Text>
        </TouchableOpacity>

        {/* Energy Guidance Section */}
        {activeInsights.length > 0 && (
          <Animated.View entering={FadeInUp.delay(200)} style={styles.energySection}>
            <View style={[styles.energyCard, { backgroundColor: currentTheme.colors.glow, borderColor: currentTheme.colors.cardBorder }]}>
              <View style={styles.energyHeader}>
                <Text style={[styles.energyTitle, { color: currentTheme.colors.text.primary }]}>Günün Enerjisi</Text>
                <Text style={styles.energySymbol}>✨</Text>
              </View>
              
              {activeInsights.map((insight, idx) => (
                <View key={idx} style={[styles.eventRow, idx > 0 && { marginTop: 16 }]}>
                  <Text style={styles.eventSymbol}>{insight.symbol}</Text>
                  <Text 
                    style={[styles.eventMessage, { color: currentTheme.colors.text.primary }]}
                    numberOfLines={2}
                  >
                    {insight.message}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

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

        {showToast && (
          <Animated.View 
            entering={FadeInUp} 
            exiting={FadeOutDown}
            style={[styles.toast, { backgroundColor: currentTheme.colors.primary + 'EE' }]}
          >
            <Text style={styles.toastText}>
              Bugün kart hakkını kullandın ✨{"\n"}
              Yarın tekrar bir kart seçebilirsin.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
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
});
