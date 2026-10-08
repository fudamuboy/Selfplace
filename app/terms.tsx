import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';

import { useT } from '../i18n';

export default function TermsScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { t, language } = useT();
  const isEn = language === 'en';

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{t('settings.termsOfService')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.lastUpdated, { color: currentTheme.colors.text.muted }]}>
            {isEn ? 'Last updated: April 30, 2026' : 'Son güncelleme: 30 Nisan 2026'}
          </Text>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>{isEn ? '1. Acceptance' : '1. Kabul Edilme'}</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              {isEn 
                ? 'By using the Selfplace application, you agree to be bound by these terms. If you do not accept any of these terms, you must not use the application.' 
                : 'Selfplace uygulamasını kullanarak, bu kullanım koşullarını kabul etmiş sayılırsınız. Eğer bu koşullardan herhangi birini kabul etmiyorsanız, uygulamayı kullanmamanız gerekir.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>{isEn ? '2. Service Description & Boundaries' : '2. Hizmet Tanımı ve Sınırlar'}</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              {isEn 
                ? 'Selfplace is a digital journal and reflection space helping users record feelings and foster self-awareness.\n\nIMPORTANT: Selfplace IS NOT a therapy, medical diagnosis, clinical treatment, or psychological counseling service. AI insights are provided solely for personal growth.'
                : 'Selfplace, kullanıcıların günlük yansımalarını kaydetmelerine ve öz-farkındalıklarını artırmalarına yardımcı olan bir dijital günlük ve yansıma uygulamasıdır.\n\nÖNEMLİ: Selfplace bir terapi, tıbbi teşhis, klinik tedavi veya profesyonel psikolojik danışmanlık hizmeti DEĞİLDİR. Uygulama içeriği ve AI tarafından üretilen içgörüler sadece bilgilendirme ve kişisel gelişim amaçlıdır.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>{isEn ? '3. Data & Privacy' : '3. Veri ve Gizlilik'}</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              {isEn 
                ? 'Your reflections are private to you. Selfplace uses your data solely to generate insights and does not share it with third parties without your consent.' 
                : 'Uygulamaya girdiğiniz notlar ve yansımalar size aittir. Selfplace, bu içerikleri sadece size hizmet sunmak ve kişiselleştirilmiş içgörüler üretmek için kullanır.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>{isEn ? '4. Apple Standard EULA' : '4. Apple Standart Lisans Sözleşmesi (EULA)'}</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              {isEn 
                ? "By using this application, you agree to Apple's Standard End User License Agreement (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                : "Bu uygulamayı kullanarak, Apple'ın Standart Son Kullanıcı Lisans Sözleşmesi'ne (EULA) tabi olduğunuzu kabul edersiniz: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>{isEn ? '5. Contact' : '5. İletişim'}</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              {isEn ? 'You can always reach out for questions and feedback:\nselfplace.support@gmail.com' : 'Sorularınız ve geri bildirimleriniz için bize her zaman ulaşabilirsiniz:\nselfplace.support@gmail.com'}
            </Text>
          </View>

          <View style={{ height: 40 }} />
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
  lastUpdated: {
    fontSize: 12,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.9,
  },
  bold: {
    fontWeight: 'bold',
  }
});
