import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { MascotBlob } from '../../components/MascotBlob';
import { MascotMood } from '../../utils/mascotThemeEngine';
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
  
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 6;

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
    return isNight ? 'sleepy' : 'neutral';
  };

  const fetchData = async () => {
    try {
      // 1. Check card status
      const cardRes = await client.get(`/cards/interactive?localDate=${getLocalDate()}`);
      if (cardRes.data.alreadySelected) {
        setCardUsedToday(true);
      }

      // 2. Get latest mood for mascot
      const checkInRes = await client.get('/check-ins');
      if (checkInRes.data && checkInRes.data.length > 0) {
        const lastCheckIn = checkInRes.data[0];
        const mappedMood = mapMoodToMascot(lastCheckIn.mood);
        
        // If the last check-in is recent (today), use its mood
        // Otherwise, use 'neutral' to let the time-of-day engine decide the expression
        const checkInDate = new Date(lastCheckIn.created_at).toISOString().split('T')[0];
        if (checkInDate === getLocalDate()) {
          setLatestMood(mappedMood);
        } else {
          setLatestMood('neutral');
        }
        
        // Calculate stress level based on mood keywords
        if (lastCheckIn.mood.toLowerCase().includes('stres') || lastCheckIn.mood.toLowerCase().includes('kaygı')) {
          setStressLevel(0.8);
        } else {
          setStressLevel(0);
        }
      } else {
        setLatestMood('neutral');
      }
    } catch (err) {
      console.error('Home: Error fetching data:', err);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleCardPress = () => {
    if (cardUsedToday) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    router.push('/cards');
  };

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
          />
          <Text style={[styles.mascotText, { color: currentTheme.colors.text.secondary }]}>
            {isNight ? "Huzurlu geceler..." : '"Buradayım, seni dinliyorum."'}
          </Text>
        </TouchableOpacity>

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
            style={cardUsedToday ? { opacity: 0.5, marginBottom: 12 } : { marginBottom: 12 }}
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
});
