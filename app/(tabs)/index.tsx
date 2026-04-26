import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { MascotBlob } from '../../components/MascotBlob';
import { CustomButton } from '../../components/CustomButton';
import { Colors } from '../../constants/Colors';
import useAuthStore from '../../store/useAuthStore';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  return (
    <GradientBackground>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Merhaba {user?.username},</Text>
          <Text style={styles.subtitle}>Bugün kendin için bir şeyler yapmaya ne dersin?</Text>
        </View>

        <View style={styles.mascotContainer}>
          <MascotBlob mood="neutral" />
          <Text style={styles.mascotText}>"Buradayım, seni dinliyorum."</Text>
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
    color: Colors.text.primary,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 8,
  },
  mascotContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  mascotText: {
    color: Colors.text.secondary,
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
