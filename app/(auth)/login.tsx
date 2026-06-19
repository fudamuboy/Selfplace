import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import client from '../../api/client';
import { getSubscription } from '../../api/userApi';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { GradientBackground } from '../../components/GradientBackground';
import { MascotBlob } from '../../components/MascotBlob';
import { Colors } from '../../constants/Colors';
import useAuthStore from '../../store/useAuthStore';
import { FORM_MAX_WIDTH, PAGE_PADDING_H } from '../../constants/Layout';

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
      
      // Hydrate subscription state after successful login
      try {
        const sub = await getSubscription();
        useAuthStore.getState().setPlanType(sub.plan_type);
      } catch (subErr) {
        console.error('Failed to fetch subscription on login:', subErr);
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      const errorData = err.response?.data;
      const debugInfo = errorData?.debug || errorData?.debug_error || err.message;
      const stackInfo = errorData?.stack;

      setModal({
        visible: true,
        title: 'Giriş Başarısız',
        message: errorData?.message || 'E-posta veya şifre hatalı. Lütfen kontrol edin.'
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
        <View style={styles.formOuter}>
          <View style={styles.content}>
          <View style={styles.mascotContainer}>
            <MascotBlob mood="calm" />
          </View>

          <Text style={styles.title}>Tekrar hoş geldin</Text>
          <Text style={styles.subtitle}>Kendine ayırdığın küçük alana geri dön.</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="E-posta adresinizi girin"
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
              placeholder="Şifrenizi girin"
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

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <CustomButton
            title="Giriş Yap"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 10, width: '100%' }}
          />

          <TouchableOpacity onPress={() => router.replace('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.linkText}>Hesabın yok mu? <Text style={{ fontWeight: 'bold' }}>Kayıt Ol</Text></Text>
          </TouchableOpacity>


          </View>
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
    padding: PAGE_PADDING_H,
  },
  formOuter: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
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

});

