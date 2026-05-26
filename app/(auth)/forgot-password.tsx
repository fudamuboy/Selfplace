import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { MascotBlob } from '../../components/MascotBlob';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', success: false });
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email) {
      setModal({
        visible: true,
        title: 'E-posta Gerekli',
        message: 'Lütfen şifre sıfırlama kodu gönderebilmemiz için kayıtlı e-posta adresini girin.',
        success: false
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setModal({
        visible: true,
        title: 'Geçersiz E-posta',
        message: 'Lütfen geçerli bir e-posta adresi girdiğinizden emin olun.',
        success: false
      });
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      
      setModal({
        visible: true,
        title: 'Kod Gönderildi',
        message: '6 haneli şifre sıfırlama kodu e-posta adresine başarıyla gönderildi.',
        success: true
      });
    } catch (error: any) {
      const errMsg = error.response?.data?.message || 'Sıfırlama kodu gönderilirken bir sorun oluştu. Lütfen tekrar dene.';
      setModal({
        visible: true,
        title: 'Hata',
        message: errMsg,
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
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.mascotContainer}>
              <MascotBlob mood={loading ? "thinking" : "calm"} />
            </View>

            <Text style={styles.title}>Şifremi Unuttum</Text>
            <Text style={styles.subtitle}>
              Kendine giden yolculuğa devam etmek için kayıtlı e-posta adresini gir. Şifreni yenilemen için 6 haneli bir kod göndereceğiz.
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={Colors.text.secondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="E-posta adresinizi girin"
                  placeholderTextColor={Colors.text.secondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>
            </View>

            <CustomButton
              title="Sıfırlama Kodu Gönder"
              onPress={handleSendCode}
              loading={loading}
              style={{ marginTop: 10, width: '100%' }}
            />

            <TouchableOpacity
              onPress={() => router.replace('/(auth)/login')}
              style={styles.backLink}
            >
              <Ionicons name="arrow-back-outline" size={16} color={Colors.primary} />
              <Text style={styles.backLinkText}>Giriş ekranına dön</Text>
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
          if (modal.success) {
            router.push({
              pathname: '/reset-password',
              params: { email: email.trim().toLowerCase() }
            });
          }
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
    marginBottom: 10,
    transform: [{ scale: 0.85 }]
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: 18,
    top: 18,
    zIndex: 1,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    paddingLeft: 50,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    fontSize: 16,
  },
  backLink: {
    marginTop: 24,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backLinkText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
