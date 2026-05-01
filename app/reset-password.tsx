import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { Colors } from '../constants/Colors';
import { MascotBlob } from '../components/MascotBlob';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import useThemeStore from '../store/useThemeStore';

export default function ResetPasswordScreen() {
  const { token: urlToken, email: urlEmail } = useLocalSearchParams<{ token: string, email: string }>();
  const [token, setToken] = useState(urlToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', success: false });
  const router = useRouter();
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken);
    }
  }, [urlToken]);

  const handleResetPassword = async () => {
    if (!token || !newPassword || !confirmPassword) {
      setModal({ visible: true, title: 'Hata', message: 'Lütfen tüm alanları doldurun.', success: false });
      return;
    }

    if (newPassword.length < 6) {
      setModal({ visible: true, title: 'Hata', message: 'Yeni şifre en az 6 karakter olmalıdır.', success: false });
      return;
    }

    if (newPassword !== confirmPassword) {
      setModal({ visible: true, title: 'Hata', message: 'Şifreler eşleşmiyor.', success: false });
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/reset-password', { token, newPassword });
      setModal({ 
        visible: true, 
        title: 'Başarılı', 
        message: 'Şifreniz başarıyla güncellendi. Giriş yapabilirsin.', 
        success: true 
      });
    } catch (error: any) {
      setModal({ 
        visible: true, 
        title: 'Hata', 
        message: error.response?.data?.message || 'Şifre sıfırlanırken bir sorun oluştu.',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.mascotContainer}>
              <MascotBlob mood="neutral" />
            </View>

            <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Şifre Yenileme</Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.text.secondary }]}>
              {urlEmail ? `${urlEmail} adresine` : 'E-posta adresine'} gelen 6 haneli kodu ve yeni şifreni gir.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>Sıfırlama Kodu</Text>
              <TextInput
                style={[styles.input, { backgroundColor: currentTheme.colors.card, color: currentTheme.colors.text.primary, borderColor: currentTheme.colors.cardBorder }]}
                placeholder="6 Haneli Kod"
                placeholderTextColor={currentTheme.colors.text.muted}
                value={token}
                onChangeText={setToken}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>Yeni Şifre</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { backgroundColor: currentTheme.colors.card, color: currentTheme.colors.text.primary, borderColor: currentTheme.colors.cardBorder, paddingRight: 50 }]}
                  placeholder="Yeni Şifre"
                  placeholderTextColor={currentTheme.colors.text.muted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Ionicons 
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color={currentTheme.colors.text.muted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>Şifre Tekrar</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { backgroundColor: currentTheme.colors.card, color: currentTheme.colors.text.primary, borderColor: currentTheme.colors.cardBorder, paddingRight: 50 }]}
                  placeholder="Şifreyi Onayla"
                  placeholderTextColor={currentTheme.colors.text.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color={currentTheme.colors.text.muted} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <CustomButton 
              title="Şifreyi Güncelle" 
              onPress={handleResetPassword} 
              loading={loading} 
              style={{ marginTop: 10, width: '100%' }}
            />

            <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backLink}>
              <Text style={[styles.backLinkText, { color: currentTheme.colors.primary }]}>Giriş ekranına dön</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal({ ...modal, visible: false });
          if (modal.success) router.replace('/login');
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  mascotContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  backLink: {
    marginTop: 24,
    padding: 12,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: '600',
  }
});

