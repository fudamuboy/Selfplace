import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Platform, Linking, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import useNotificationStore from '../store/useNotificationStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CustomModal } from '../components/CustomModal';
import { CustomButton } from '../components/CustomButton';
import client from '../api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const { user } = useAuthStore();

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

  useEffect(() => {
    loadConfig();
  }, []);

  const toggleReminders = async (value: boolean) => {
    const success = await storeToggleReminders(value);
    if (!success && value) {
      setInfoModal({
        visible: true,
        title: 'İzin Gerekli',
        message: 'Hatırlatıcı gönderebilmemiz için bildirim izni vermeniz gerekiyor.'
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
      setInfoModal({
        visible: true,
        title: 'Bize Ulaşın',
        message: `E-posta uygulamanız açılamadı. Lütfen bize ${email} adresinden yazın.`
      });
    });
  };

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    
    setPasswordLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: user.email });
      setInfoModal({ 
        visible: true, 
        title: 'Kod Gönderildi', 
        message: '6 haneli sıfırlama kodu e-posta adresine gönderildi. Şimdi kodunla şifreni yenileyebilirsin.' 
      });
      // Navigation happens after modal close or directly? User said "automatically navigate".
      // I'll set a flag or just navigate. 
      // Actually, standard UX is show success THEN navigate.
      setTimeout(() => {
        router.push('/reset-password');
      }, 1500);
    } catch (error: any) {
      if (__DEV__) {
        console.log('[ForgotPassword] Error:', error.response?.data || error.message);
      }
      setInfoModal({ 
        visible: true, 
        title: 'Hata', 
        message: 'Bağlantı gönderilirken bir sorun oluştu.' 
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
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Ayarlar</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {renderSectionHeader('BİLDİRİMLER')}
          {renderRow(
            'notifications-outline', 
            'Günlük Hatırlatıcı', 
            remindersEnabled ? `Her gün ${reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : 'Kapalı',
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
              <Text style={{ color: currentTheme.colors.text.primary }}>Hatırlatma Saatini Değiştir</Text>
              <Text style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>
                {reminderTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
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
          {renderSectionHeader('GÜVENLİK')}
          {renderRow(
            'lock-closed-outline', 
            'Şifre', 
            'Şifreni güvenle sıfırla',
            undefined,
            <TouchableOpacity 
              onPress={handleSendResetLink}
              disabled={passwordLoading}
              style={{ backgroundColor: currentTheme.colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}
            >
              <Text style={{ color: currentTheme.colors.button.text, fontSize: 12, fontWeight: '600' }}>
                {passwordLoading ? '...' : 'Sıfırla'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
          {renderSectionHeader('DESTEK')}
          {renderRow('mail-outline', 'Bize Ulaş', 'selfplace.support@gmail.com', handleContactSupport)}
          {renderRow('help-circle-outline', 'Yardım & SSS', 'Uygulama hakkında merak edilenler', () => router.push('/faq'))}

          <View style={{ height: 24 }} />
          {renderSectionHeader('YASAL')}
          {renderRow('document-text-outline', 'Kullanım Koşulları', 'Uygulama kuralları ve şartları', () => router.push('/terms'))}
          {renderRow('shield-outline', 'Gizlilik Politikası', 'Verilerinin nasıl korunduğu', () => router.push('/privacy-policy'))}

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
