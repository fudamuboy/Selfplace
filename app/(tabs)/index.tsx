import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { MascotBlob } from '../../components/MascotBlob';
import { CustomButton } from '../../components/CustomButton';
import useAuthStore from '../../store/useAuthStore';
import useThemeStore from '../../store/useThemeStore';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const { currentTheme } = useThemeStore();

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: currentTheme.colors.text.primary }]}>Merhaba {user?.username},</Text>
          <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>Bugün kendin için bir şeyler yapmaya ne dersin?</Text>
        </View>

        <View style={styles.mascotContainer}>
          <MascotBlob mood="neutral" />
          <Text style={[styles.mascotText, { color: currentTheme.colors.text.secondary }]}>"Buradayım, seni dinliyorum."</Text>
        </View>

        <View style={styles.actions}>
          <CustomButton 
            title="Günlük Check-in Yap" 
            onPress={() => router.push('/check-in')}
            variant="primary"
          />
          <CustomButton 
            title="Bir Davet Kartı Çek" 
            onPress={() => router.push('/cards')}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
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
  },
});
