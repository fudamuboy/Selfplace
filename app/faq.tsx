import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
  {
    question: 'Selfplace terapi uygulaması mı?',
    answer: 'Hayır, Selfplace bir terapi, tıbbi teşhis veya tedavi aracı değildir. Selfplace, kişisel yansımalarınızı kaydetmenize, duygularınızı takip etmenize ve AI destekli içgörülerle kendinizi daha iyi anlamanıza yardımcı olan bir öz-farkındalık aracıdır. Ciddi bir psikolojik sorun yaşıyorsanız lütfen bir uzmana danışın.'
  },
  {
    question: 'Verilerim nerede saklanıyor?',
    answer: 'Verileriniz güvenli bulut sunucularımızda, modern şifreleme yöntemleri kullanılarak saklanır. Kişisel verileriniz asla üçüncü taraflarla reklam veya pazarlama amacıyla paylaşılmaz. İstediğiniz zaman tüm verilerinizi silebilir veya hesabınızı kalıcı olarak kapatabilirsiniz.'
  },
  {
    question: 'Yapay zeka nasıl kullanılıyor?',
    answer: 'Yapay zeka, sadece sizin paylaştığınız günlük notları ve ruh hali verilerini analiz ederek size anlamlı özetler, haftalık içgörüler ve destekleyici geri bildirimler sunmak için kullanılır. AI, verilerinizi sadece sizin deneyiminizi iyileştirmek için işler ve bu verileri "öğrenme" amacıyla genel modellerde kullanmaz.'
  },
  {
    question: 'Hatırlatıcıları nasıl kapatırım?',
    answer: 'Hatırlatıcıları, Ayarlar > Bildirimler sekmesindeki anahtarı kapatarak devre dışı bırakabilirsiniz. Ayrıca cihazınızın ana ayarlarından Selfplace bildirim izinlerini tamamen yönetebilirsiniz.'
  }
];

function FAQItem({ item, theme }: { item: typeof FAQ_DATA[0], theme: any }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity 
      style={[styles.faqCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]} 
      onPress={toggle}
      activeOpacity={0.7}
    >
      <View style={styles.questionRow}>
        <Text style={[styles.question, { color: theme.colors.text.primary }]}>{item.question}</Text>
        <Ionicons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={theme.colors.primary} 
        />
      </View>
      {expanded && (
        <View style={styles.answerWrapper}>
          <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
          <Text style={[styles.answer, { color: theme.colors.text.secondary }]}>{item.answer}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function FAQScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Yardım & SSS</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>
            Selfplace hakkında merak ettiğin temel soruların cevaplarını burada bulabilirsin.
          </Text>

          {FAQ_DATA.map((item, index) => (
            <FAQItem key={index} item={item} theme={currentTheme} />
          ))}

          <View style={styles.contactBox}>
            <Text style={[styles.contactText, { color: currentTheme.colors.text.muted }]}>
              Başka bir sorun mu var?
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.contactLink, { color: currentTheme.colors.primary }]}>Bize ulaşın</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
    opacity: 0.8,
  },
  faqCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 12,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  answerWrapper: {
    marginTop: 16,
  },
  separator: {
    height: 1,
    marginBottom: 16,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactBox: {
    marginTop: 40,
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    marginBottom: 4,
  },
  contactLink: {
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  }
});
