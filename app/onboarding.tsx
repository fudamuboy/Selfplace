import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { CustomButton } from '../components/CustomButton';
import { MascotBlob } from '../components/MascotBlob';
import { Colors } from '../constants/Colors';

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.mascotContainer}>
          <MascotBlob />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>Selfplace'e Hoş Geldin</Text>
          <Text style={styles.description}>
            Kendi iç dünyana küçük bir yolculuk yapmaya ne dersin? 
            Burada sadece sen ve hislerin varsınız.
          </Text>
          
          <View style={styles.features}>
            <FeatureItem icon="🌿" text="Günlük duygusal check-in" />
            <FeatureItem icon="✨" text="Kendine şefkat davetleri" />
            <FeatureItem icon="🌙" text="Sakin ve güvenli alan" />
          </View>
        </View>

        <View style={styles.footer}>
          <CustomButton 
            title="Başlayalım" 
            onPress={() => router.replace('/login')} 
          />
        </View>
      </View>
    </GradientBackground>
  );
}

function FeatureItem({ icon, text }: { icon: string, text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  mascotContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  features: {
    width: '100%',
    paddingHorizontal: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: Colors.text.primary,
  },
  footer: {
    marginTop: 50,
  },
});
