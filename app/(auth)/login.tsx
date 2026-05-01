import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { Colors } from '../../constants/Colors';
import { MascotBlob } from '../../components/MascotBlob';
import { Ionicons } from '@expo/vector-icons';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const router = useRouter();
  const setAuth = useAuthStore(state => state.setAuth);

  const handleLogin = async () => {
    if (!email || !password) {
      setModal({ visible: true, title: 'Hata', message: 'Lütfen tüm alanları doldurun.' });
      return;
    }

    setLoading(true);
    try {
      const response = await client.post('/auth/login', { email, password });
      await setAuth(response.data.token, response.data.user);
      router.replace('/(tabs)');
    } catch (error: any) {
      setModal({ 
        visible: true, 
        title: 'Giriş Başarısız', 
        message: error.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setModal({ 
        visible: true, 
        title: 'E-posta Gerekli', 
        message: 'Şifre sıfırlama kodu gönderebilmemiz için lütfen e-posta adresinizi girin.' 
      });
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email });
      setModal({ 
        visible: true, 
        title: 'Kod Gönderildi', 
        message: '6 haneli sıfırlama kodu e-posta adresine gönderildi. Sıfırlama ekranına yönlendiriliyorsun.' 
      });
      setTimeout(() => {
        setModal(prev => ({ ...prev, visible: false }));
        router.push({
          pathname: '/reset-password',
          params: { email } // Pass email to reset screen if needed
        });
      }, 2000);
    } catch (error: any) {
      setModal({ 
        visible: true, 
        title: 'Hata', 
        message: error.response?.data?.message || 'Bağlantı gönderilirken bir sorun oluştu.' 
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
        <View style={styles.content}>
          <View style={styles.mascotContainer}>
            <MascotBlob mood="neutral" />
          </View>

          <Text style={styles.title}>Tekrar hoş geldin</Text>
          <Text style={styles.subtitle}>Kendine ayırdığın küçük alana geri dön.</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              placeholderTextColor={Colors.text.secondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 50 }]}
              placeholder="Şifre"
              placeholderTextColor={Colors.text.secondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={Colors.text.secondary} 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <CustomButton 
            title="Giriş Yap" 
            onPress={handleLogin} 
            loading={loading} 
            style={{ marginTop: 10, width: '100%' }}
          />

          <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
            <Text style={styles.linkText}>Hesabın yok mu? <Text style={{ fontWeight: 'bold' }}>Kayıt Ol</Text></Text>
          </TouchableOpacity>

          {__DEV__ && (
            <TouchableOpacity 
              style={styles.devResetButton} 
              onPress={async () => {
                await useAuthStore.getState().resetAll();
                router.replace('/onboarding');
              }}
            >
              <Text style={styles.devResetText}>[ DEV RESET ]</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal({ ...modal, visible: false })}
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
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  mascotContainer: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginRight: 4,
  },
  forgotPasswordText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  registerLink: {
    marginTop: 24,
    padding: 10,
  },
  linkText: {
    color: Colors.text.primary,
    fontSize: 15,
  },
  devResetButton: {
    marginTop: 40,
    opacity: 0.5,
  },
  devResetText: {
    color: '#FF4B4B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

