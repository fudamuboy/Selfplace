import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import useAuthStore from '../store/useAuthStore';
import { CustomModal } from '../components/CustomModal';
import useThemeStore from '../store/useThemeStore';

import { useT } from '../i18n';

export default function PrivacyDataScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { currentTheme } = useThemeStore();
  const { t, language } = useT();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; type: 'deleteData' | 'deleteAccount' | 'none' }>({
    visible: false,
    type: 'none',
  });
  const [infoModal, setInfoModal] = useState({ visible: false, title: '', message: '' });

  const handleExportData = async () => {
    setLoading(true);
    try {
      const res = await client.get('/user/export-data');
      const dataStr = JSON.stringify(res.data, null, 2);
      
      await Share.share({
        message: dataStr,
        title: isEn ? 'My Selfplace Data' : 'Selfplace Verilerim',
      });
    } catch (_error) {
      setInfoModal({
        visible: true,
        title: isEn ? 'Error' : 'Hata',
        message: isEn ? 'An issue occurred while exporting your data.' : 'Veriler dışa aktarılırken bir sorun oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteData = async () => {
    setLoading(true);
    try {
      await client.delete('/user/delete-data');
      setConfirmModal({ visible: false, type: 'none' });
      setInfoModal({
        visible: true,
        title: isEn ? 'Success' : 'Başarılı',
        message: isEn ? 'All your personal data has been deleted.' : 'Tüm kişisel verileriniz silindi.',
      });
    } catch (_error) {
      setInfoModal({
        visible: true,
        title: isEn ? 'Error' : 'Hata',
        message: isEn ? 'An issue occurred while deleting your data.' : 'Veriler silinirken bir sorun oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await client.delete('/user/delete-account');
      setConfirmModal({ visible: false, type: 'none' });
      logout();
      router.replace('/login');
    } catch (_error) {
      setInfoModal({
        visible: true,
        title: isEn ? 'Error' : 'Hata',
        message: isEn ? 'An issue occurred while deleting your account.' : 'Hesap silinirken bir sorun oluştu.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{t('settings.privacyData')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Privacy Policy Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>{isEn ? 'Privacy Policy Summary' : 'Gizlilik Politikası'}</Text>
            <View style={[styles.policyCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              <Text style={[styles.policyText, { color: currentTheme.colors.text.primary }]}>
                {isEn ? (
                  <>
                    Selfplace is a quiet, safe sanctuary focused on your personal growth and inner peace.
                    {"\n\n"}
                    <Text style={[styles.bold, { color: currentTheme.colors.primary }]}>What data do we collect?</Text>
                    {"\n"}Your username, email address, mood check-ins, journal reflections, and app interactions.
                    {"\n\n"}
                    <Text style={[styles.bold, { color: currentTheme.colors.primary }]}>How is your data used?</Text>
                    {"\n"}Your data is used to generate personalized daily reflections and weekly insights. AI models process your data solely to produce meaningful feedback.
                    {"\n\n"}
                    <Text style={[styles.bold, { color: currentTheme.colors.primary }]}>Security & Boundaries</Text>
                    {"\n"}Selfplace is not a medical or therapy tool. Your data is stored securely and never shared with third parties.
                  </>
                ) : (
                  <>
                    Selfplace, kişisel gelişiminize ve içsel huzurunuza odaklanan güvenli bir alandır.
                    {"\n\n"}
                    <Text style={[styles.bold, { color: currentTheme.colors.primary }]}>Hangi verileri topluyoruz?</Text>
                    {"\n"}Kullanıcı adınız, e-posta adresiniz, ruh hali seçimleriniz, günlük notlarınız ve uygulama içindeki etkileşimleriniz.
                    {"\n\n"}
                    <Text style={[styles.bold, { color: currentTheme.colors.primary }]}>Verileriniz nasıl kullanılır?</Text>
                    {"\n"}Verileriniz, size özel günlük yansımalar ve haftalık içgörüler oluşturmak için kullanılır. AI teknolojisi, verilerinizi sadece anlamlı geri bildirimler üretmek için işler.
                    {"\n\n"}
                    <Text style={[styles.bold, { color: currentTheme.colors.primary }]}>Güvenlik ve Sınırlar</Text>
                    {"\n"}Selfplace bir terapi veya tıbbi teşhis aracı değildir. Verileriniz veritabanımızda güvenli bir şekilde saklanır ve asla üçüncü taraflarla paylaşılmaz.
                  </>
                )}
              </Text>
            </View>
          </View>

          {/* Data Actions Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>{isEn ? 'Data Management' : 'Veri Yönetimi'}</Text>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]} 
              onPress={handleExportData}
            >
              <Ionicons name="download-outline" size={22} color={currentTheme.colors.primary} />
              <Text style={[styles.actionButtonText, { color: currentTheme.colors.primary }]}>{isEn ? 'Export My Data' : 'Verilerimi Dışa Aktar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { marginTop: 12, backgroundColor: currentTheme.colors.card, borderColor: 'rgba(248, 113, 113, 0.2)' }]} 
              onPress={() => setConfirmModal({ visible: true, type: 'deleteData' })}
            >
              <Ionicons name="trash-outline" size={22} color="#F87171" />
              <Text style={[styles.actionButtonText, { color: '#F87171' }]}>{isEn ? 'Delete All My Data' : 'Tüm Verilerimi Sil'}</Text>
            </TouchableOpacity>
          </View>

          {/* Account Actions Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>{isEn ? 'Account Management' : 'Hesap Yönetimi'}</Text>
            <TouchableOpacity 
              style={[styles.actionButton, styles.destructiveButton]} 
              onPress={() => setConfirmModal({ visible: true, type: 'deleteAccount' })}
            >
              <Ionicons name="person-remove-outline" size={22} color="#FFF" />
              <Text style={[styles.actionButtonText, { color: '#FFF' }]}>{isEn ? 'Delete My Account' : 'Hesabımı Sil'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Confirmation Modal */}
      <CustomModal
        visible={confirmModal.visible}
        title={isEn ? 'Are you sure?' : 'Emin misiniz?'}
        message={confirmModal.type === 'deleteData' 
          ? (isEn ? "This action cannot be undone. All your personal records (journals, mood check-ins, insights) will be deleted." : "Bu işlem geri alınamaz. Tüm kişisel kayıtların (günlükler, ruh halleri, içgörüler) silinecek.")
          : (isEn ? "Your account and all data will be permanently deleted. This action cannot be undone." : "Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz.")}
        confirmText={isEn ? "Yes, Delete" : "Evet, Sil"}
        onConfirm={confirmModal.type === 'deleteData' ? handleDeleteData : handleDeleteAccount}
        onClose={() => setConfirmModal({ visible: false, type: 'none' })}
      />

      <CustomModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  policyCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  destructiveButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.4)',
    borderColor: 'rgba(248, 113, 113, 0.6)',
  },
});
