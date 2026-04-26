import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { CustomButton } from '../../components/CustomButton';
import { CustomModal } from '../../components/CustomModal';
import { Colors } from '../../constants/Colors';
import client from '../../api/client';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '', success: false });
  const router = useRouter();

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setModal({ visible: true, title: 'Hata', message: 'Lütfen tüm alanları doldurun.', success: false });
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/register', { username, email, password });
      setModal({ 
        visible: true, 
        title: 'Başarılı', 
        message: 'Kayıt olundu, şimdi giriş yapabilirsiniz.', 
        success: true 
      });
    } catch (error: any) {
      setModal({ 
        visible: true, 
        title: 'Kayıt Başarısız', 
        message: error.response?.data?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.',
        success: false
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Yeni Hesap</Text>
        <Text style={styles.subtitle}>Kendine giden yolculuğa buradan başla.</Text>

        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          placeholderTextColor={Colors.text.secondary}
          value={username}
          onChangeText={setUsername}
        />

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
          title="Kayıt Ol" 
          onPress={handleRegister} 
          loading={loading} 
          style={{ marginTop: 20 }}
        />

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Zaten hesabın var mı? Giriş Yap</Text>
        </TouchableOpacity>
      </View>

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
