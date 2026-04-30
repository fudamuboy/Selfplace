import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { Colors } from '../../constants/Colors';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setModal({ visible: true, title: 'Hata', message: 'Lütfen e-posta adresinizi girin.' });
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email });
      setModal({ 
        visible: true, 
        title: 'Kod Gönderildi', 
        message: '6 haneli sıfırlama kodu e-posta adresine gönderildi.' 
      });
      setTimeout(() => {
        router.push('/reset-password');
      }, 1500);
    } catch (error: any) {
      if (__DEV__) {
        console.log('[Login ForgotPassword] Error:', error.response?.data || error.message);
      }
      setModal({ 
        visible: true, 
        title: 'Hata', 
        message: 'Bağlantı gönderilirken bir sorun oluştu.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hoş Geldin</Text>
        <Text style={styles.subtitle}>Kendine ayıracağın küçük bir vakit için hazır mısın?</Text>

        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor={Colors.text.secondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor={Colors.text.secondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
          <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/reset-password')} style={styles.resetCodeContainer}>
          <Text style={styles.resetCodeText}>Kod ile Şifre Sıfırla</Text>
        </TouchableOpacity>

        <CustomButton 
          title="Giriş Yap" 
          onPress={handleLogin} 
          loading={loading} 
          style={{ marginTop: 20 }}
        />

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.devResetButton} 
          onPress={async () => {
            await useAuthStore.getState().resetAll();
            router.replace('/onboarding');
          }}
        >
          <Text style={styles.devResetText}>[ DEV RESET ]</Text>
        </TouchableOpacity>
      </View>

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
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 10,
    marginRight: 4,
  },
  forgotPasswordText: {
    color: Colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  resetCodeContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginRight: 4,
  },
  resetCodeText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  linkText: {
    color: Colors.primary,
    marginTop: 20,
    fontSize: 14,
  },
  devResetButton: {
    marginTop: 60,
    opacity: 0.5,
  },
  devResetText: {
    color: '#FF4B4B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
