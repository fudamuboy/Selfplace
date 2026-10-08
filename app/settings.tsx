import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, Linking, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import useNotificationStore from '../store/useNotificationStore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CustomModal } from '../components/CustomModal';
import client from '../api/client';
import * as Clipboard from 'expo-clipboard';
import { Toast } from '../components/Toast';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';
import useSubscriptionStore from '../store/useSubscriptionStore';
import { useT } from '../i18n';
import { useLanguageStore } from '../store/useLanguageStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { t, language } = useT();
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const {
    restoreLoading,
    restoreMessage,
    restorePurchases,
    clearRestoreMessage,
  } = useSubscriptionStore();

  const { 
    remindersEnabled, 
    reminderTime, 
    loadConfig, 
    toggleReminders: storeToggleReminders, 
    setReminderTime: storeSetReminderTime 
  } = useNotificationStore();
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [infoModal, setInfoModal] = useState({ visible: false, title: '', message: '' });
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const toggleReminders = async (value: boolean) => {
    const success = await storeToggleReminders(value);
    if (!success && value) {
      setInfoModal({
        visible: true,
        title: t('common.warning'),
        message: t('errors.generic')
      });
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      storeSetReminderTime(selectedDate);
    }
  };

  const handleContactSupport = () => {
    const email = 'selfplace.support@gmail.com';
    Linking.openURL(`mailto:${email}`).catch(() => {
      setContactModalVisible(true);
    });
  };

  const handleRestorePurchases = async () => {
    clearRestoreMessage();
    await restorePurchases();
    const msg = useSubscriptionStore.getState().restoreMessage;
    if (msg) {
      setToast({ visible: true, message: msg });
      clearRestoreMessage();
    }
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setToast({ visible: true, message: t('toasts.copied') });
  };

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    
    setPasswordLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: user.email });
      setInfoModal({ 
        visible: true, 
        title: t('auth.resetPasswordTitle'), 
        message: t('auth.resetSuccess') 
      });
      setTimeout(() => {
        router.push('/reset-password');
      }, 1500);
    } catch (error: any) {
      setInfoModal({ 
        visible: true, 
        title: t('common.error'), 
        message: t('errors.generic') 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, { color: currentTheme.colors.text.muted }]}>{title}</Text>
  );

  const renderRow = (icon: any, title: string, subtitle?: string, onPress?: () => void, rightElement?: React.ReactNode) => (
    <TouchableOpacity 
      style={[styles.row, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.iconBox, { backgroundColor: currentTheme.colors.glow }]}>
          <Ionicons name={icon} size={20} color={currentTheme.colors.primary} />
        </View>
        <View style={styles.textColumn}>
          <Text style={[styles.rowTitle, { color: currentTheme.colors.text.primary }]}>{title}</Text>
          {subtitle && <Text style={[styles.rowSubtitle, { color: currentTheme.colors.text.secondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement ? rightElement : (onPress && <Ionicons name="chevron-forward" size={18} color={currentTheme.colors.text.muted} />)}
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{t('settings.title')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {renderSectionHeader(t('settings.languageSection'))}
          {renderRow(
            'language-outline',
            t('settings.selectLanguage'),
            language === 'tr' ? t('languageSelection.tr') : t('languageSelection.en'),
            () => setLanguage(language === 'tr' ? 'en' : 'tr')
          )}

          <View style={{ height: 24 }} />
          {renderSectionHeader(t('settings.accountSection'))}
          {renderRow('person-outline', t('account.title'), t('settings.accountSettings'), () => router.push('/account'))}
          {renderRow('compass-outline', t('goals.title'), user?.onboarding_goals && user.onboarding_goals.length > 0 ? user.onboarding_goals.join(', ') : t('common.optional'), () => router.push('/goals-selection'))}

          <View style={{ height: 24 }} />

          {renderSectionHeader(t('settings.notificationsSection'))}
          {renderRow(
            'notifications-outline', 
            t('settings.dailyReminder'), 
            remindersEnabled ? (language === 'en' ? `Daily at ${reminderTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : `Her gün ${reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`) : t('settings.off'),
            undefined,
            <Switch 
              value={remindersEnabled} 
              onValueChange={toggleReminders}
              trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
              thumbColor="#fff"
            />
          )}
          {remindersEnabled && (
            <TouchableOpacity 
              style={[styles.timeRow, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={{ color: currentTheme.colors.text.primary }}>{t('settings.changeReminderTime')}</Text>
              <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>
                {reminderTime.toLocaleTimeString(language === 'en' ? 'en-US' : 'tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={reminderTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

          <View style={{ height: 24 }} />
          {renderSectionHeader(t('settings.accountSection'))}
          {renderRow(
            'lock-closed-outline', 
            t('settings.password'), 
            t('settings.resetPasswordSub'),
            undefined,
            <TouchableOpacity 
              onPress={handleSendResetLink}
              disabled={passwordLoading}
              style={{ backgroundColor: currentTheme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}
            >
              <Text style={{ color: currentTheme.colors.button.text, fontSize: 12, fontWeight: '600' }}>
                {passwordLoading ? '...' : t('settings.resetBtn')}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
          {renderSectionHeader(t('settings.supportSection'))}
          {renderRow('mail-outline', t('settings.contactUs'), 'selfplace.support@gmail.com', handleContactSupport)}
          {renderRow('help-circle-outline', t('settings.faq'), language === 'en' ? 'Frequently asked questions' : 'Uygulama hakkında merak edilenler', () => router.push('/faq'))}
          {renderRow(
            'refresh-outline',
            restoreLoading ? t('settings.restoringPurchases') : t('settings.restorePurchases'),
            language === 'en' ? 'Restore subscription on this device' : 'Aboneliğini cihaza yeniden tanımla',
            restoreLoading ? undefined : handleRestorePurchases,
            restoreLoading
              ? <ActivityIndicator size="small" color={currentTheme.colors.primary} />
              : undefined
          )}

          <View style={{ height: 24 }} />
          {renderSectionHeader(t('settings.legalSection'))}
          {renderRow('document-text-outline', t('settings.termsOfService'), language === 'en' ? 'Rules and conditions' : 'Uygulama kuralları ve şartları', () => router.push('/terms'))}
          {renderRow('shield-outline', t('settings.privacyPolicy'), language === 'en' ? 'How your data is protected' : 'Verilerinin nasıl korunduğu', () => router.push('/privacy-policy'))}



          <View style={{ height: 40 }} />
          <Text style={[styles.versionText, { color: currentTheme.colors.text.muted }]}>Selfplace v1.0.0</Text>
        </ScrollView>
      </View>

      <CustomModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />

      <CustomModal
        visible={contactModalVisible}
        title={language === 'en' ? 'Contact Us 🌿' : 'Bize Yaz 🌿'}
        message={language === 'en' 
          ? "Could not open mail app.\nYou can write to us directly at:\n\nselfplace.support@gmail.com"
          : "Mail uygulaması açılamadı.\nAşağıdaki adrese yazabilirsin:\n\nselfplace.support@gmail.com"}
        onClose={() => setContactModalVisible(false)}
        confirmText={language === 'en' ? 'OK' : 'Tamam'}
        secondaryText={language === 'en' ? 'Copy Email' : 'E-postayı Kopyala'}
        onSecondaryPress={() => copyToClipboard('selfplace.support@gmail.com')}
      />

      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        onHide={() => setToast({ ...toast, visible: false })} 
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
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 60,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
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
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: -4,
    marginBottom: 10,
    marginHorizontal: 8,
  },
  modalContent: {
    paddingTop: 10,
    gap: 12,
  },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.6,
  }
});
