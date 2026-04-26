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
      setAuth(response.data.token, response.data.user);
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

        <CustomButton 
          title="Giriş Yap" 
          onPress={handleLogin} 
          loading={loading} 
          style={{ marginTop: 20 }}
        />

        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.linkText}>Hesabın yok mu? Kayıt Ol</Text>
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
  linkText: {
    color: Colors.primary,
    marginTop: 20,
    fontSize: 14,
  },
});
