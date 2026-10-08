import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import { CustomModal } from '../components/CustomModal';
import client from '../api/client';
import { logger } from '../utils/logger';

import { useT } from '../i18n';

export default function AccountScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { t, language } = useT();
  const isEn = language === 'en';
  
  const [loading, setLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });

  const handleDeleteAccount = async () => {
    setConfirmModalVisible(false);
    setLoading(true);
    try {
      await client.delete('/user/delete-account');
      await logout();
      router.replace('/(auth)/login');
    } catch (err: any) {
      logger.error('[AccountScreen] Delete account failed', err);
      
      const errMsg = err.response?.data?.message || (isEn ? 'An error occurred while deleting your account. Please try again later.' : 'Hesabınız silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setErrorModal({
        visible: true,
        title: isEn ? 'Error' : 'Hata',
        message: errMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, { color: currentTheme.colors.text.muted }]}>{title}</Text>
  );

  const renderRow = (icon: any, title: string, value?: string, onPress?: () => void, isDestructive = false) => (
    <TouchableOpacity 
      style={[
        styles.row, 
        { 
          backgroundColor: isDestructive ? 'rgba(248, 113, 113, 0.1)' : currentTheme.colors.card, 
          borderColor: isDestructive ? 'rgba(248, 113, 113, 0.2)' : currentTheme.colors.cardBorder 
        }
      ]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <View style={[
          styles.iconBox, 
          { backgroundColor: isDestructive ? 'rgba(248, 113, 113, 0.2)' : currentTheme.colors.glow }
        ]}>
          <Ionicons 
            name={icon} 
            size={20} 
            color={isDestructive ? '#F87171' : currentTheme.colors.primary} 
          />
        </View>
        <View style={styles.textColumn}>
          <Text style={[
            styles.rowTitle, 
            { color: isDestructive ? '#F87171' : currentTheme.colors.text.primary }
          ]}>
            {title}
          </Text>
          {value && (
            <Text style={[styles.rowValue, { color: currentTheme.colors.text.secondary }]}>
              {value}
            </Text>
          )}
        </View>
      </View>
      {onPress && (
        <Ionicons 
          name="chevron-forward" 
          size={18} 
          color={isDestructive ? '#F87171' : currentTheme.colors.text.muted} 
        />
      )}
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={loading}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{t('settings.account')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={currentTheme.colors.primary} />
              <Text style={[styles.loadingText, { color: currentTheme.colors.text.secondary }]}>
                {isEn ? 'Deleting your account...' : 'Hesabınız siliniyor...'}
              </Text>
            </View>
          )}

          {!loading && (
            <>
              {renderSectionHeader(isEn ? 'ACCOUNT INFORMATION' : 'HESAP BİLGİLERİ')}
              {renderRow('person-outline', isEn ? 'Username' : 'Kullanıcı Adı', user?.username || (isEn ? 'Not specified' : 'Belirtilmemiş'))}
              {renderRow('mail-outline', isEn ? 'Email' : 'E-posta', user?.email || (isEn ? 'Not specified' : 'Belirtilmemiş'))}

              <View style={{ height: 32 }} />

              {renderSectionHeader(isEn ? 'ACCOUNT MANAGEMENT' : 'HESAP YÖNETİMİ')}
              {renderRow(
                'person-remove-outline', 
                isEn ? 'Delete Account Permanently' : 'Hesabı Kalıcı Olarak Sil', 
                isEn ? 'Permanently wipe your profile and all data' : 'Profilinizi ve tüm verilerinizi tamamen yok edin', 
                () => setConfirmModalVisible(true), 
                true
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Account Deletion Confirmation Modal */}
      <CustomModal
        visible={confirmModalVisible}
        title={isEn ? 'Delete Account' : 'Hesabı Sil'}
        message={isEn ? 'Are you sure you want to permanently delete your account? This action cannot be undone.' : 'Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'}
        confirmText={isEn ? 'Permanently Delete Account' : 'Hesabı Kalıcı Olarak Sil'}
        secondaryText={t('common.cancel')}
        onConfirm={handleDeleteAccount}
        onSecondaryPress={() => setConfirmModalVisible(false)}
        onClose={() => setConfirmModalVisible(false)}
      />

      {/* Error Informational Modal */}
      <CustomModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
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
    paddingBottom: 60,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textColumn: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowValue: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});
