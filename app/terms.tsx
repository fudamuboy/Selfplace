import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';

export default function TermsScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Kullanım Koşulları</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.lastUpdated, { color: currentTheme.colors.text.muted }]}>Son güncelleme: 30 Nisan 2026</Text>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>1. Kabul Edilme</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Selfplace uygulamasını kullanarak, bu kullanım koşullarını kabul etmiş sayılırsınız. Eğer bu koşullardan herhangi birini kabul etmiyorsanız, uygulamayı kullanmamanız gerekir.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>2. Hizmet Tanımı ve Sınırlar</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Selfplace, kullanıcıların günlük yansımalarını kaydetmelerine ve öz-farkındalıklarını artırmalarına yardımcı olan bir dijital günlük ve yansıma uygulamasıdır.
              {"\n\n"}
              <Text style={styles.bold}>ÖNEMLİ:</Text> Selfplace bir terapi, tıbbi teşhis, klinik tedavi veya profesyonel psikolojik danışmanlık hizmeti DEĞİLDİR. Uygulama içeriği ve AI tarafından üretilen içgörüler sadece bilgilendirme ve kişisel gelişim amaçlıdır.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>3. Kullanıcı Hesapları</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Uygulamayı kullanmak için bir hesap oluşturmanız gerekebilir. Hesap bilgilerinizin gizliliğini korumak sizin sorumluluğunuzdadır. Hesabınızın yetkisiz kullanımını fark ettiğinizde bize bildirmeniz gerekir.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>4. Gizli Yansımalar ve İçerik</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Uygulamaya girdiğiniz notlar ve yansımalar size aittir. Selfplace, bu içerikleri sadece size hizmet sunmak, analizler yapmak ve kişiselleştirilmiş içgörüler üretmek için kullanır. Verileriniz asla sizin rızanız olmadan üçüncü taraflarla paylaşılmaz.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>5. Yapay Zeka (AI) Kullanımı</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Uygulama, yansımalarınızı analiz etmek için AI teknolojilerini kullanır. AI tarafından üretilen sonuçlar bazen hatalı veya eksik olabilir. Bu içgörüleri hayatınızda uygularken her zaman kendi muhakemenizi kullanmalı ve gerektiğinde profesyonel destek almalısınız.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>6. Veri ve Gizlilik</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Verilerinizin işlenmesi ve korunması hakkında detaylı bilgi için lütfen Gizlilik Politikası sayfamızı inceleyin.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>7. Hesap ve Veri Silme</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              İstediğiniz zaman Ayarlar > Gizlilik ve Veriler sekmesinden tüm verilerinizi silebilir veya hesabınızı tamamen kapatabilirsiniz. Bu işlem geri alınamaz.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>8. Değişiklikler</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Selfplace, bu kullanım koşullarını zaman zaman güncelleme hakkını saklı tutar. Önemli değişiklikler yapıldığında uygulama içinden bilgilendirme yapılacaktır.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>9. İletişim</Text>
            <Text style={[styles.text, { color: currentTheme.colors.text.primary }]}>
              Sorularınız ve geri bildirimleriniz için bize her zaman ulaşabilirsiniz:
              {"\n"}selfplace.support@gmail.com
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
