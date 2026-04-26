import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { Colors } from '../constants/Colors';
import client from '../api/client';

interface Card {
  id: number;
  title: string;
  content: string;
  category: string;
}

export default function CardsScreen() {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });
  const router = useRouter();

  const fetchCard = async () => {
    setLoading(true);
    try {
      const response = await client.get('/cards/random');
      setCard(response.data);
    } catch (error) {
      setModal({ visible: true, title: 'Hata', message: 'Kart yüklenirken bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCard();
  }, []);

  const handleResponse = async (response: string) => {
    if (!card) return;
    
    setSubmitting(true);
    try {
      await client.post(`/cards/${card.id}/response`, { response });
      setModal({ visible: true, title: 'Teşekkürler', message: 'Yanıtın kaydedildi.' });
    } catch (error) {
      setModal({ visible: true, title: 'Hata', message: 'Yanıt kaydedilemedi.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground style={styles.container}>
      <Text style={styles.headerTitle}>Davet Kartın</Text>
      
      {card ? (
        <View style={styles.card}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{card.category}</Text>
          </View>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardContent}>{card.content}</Text>
        </View>
      ) : (
        <Text style={styles.errorText}>Kart bulunamadı.</Text>
      )}

      <View style={styles.actions}>
        <CustomButton 
          title="Deneyeceğim" 
          onPress={() => handleResponse('Deneyeceğim')} 
          loading={submitting}
        />
        <CustomButton 
          title="Bana göre değil" 
          onPress={() => handleResponse('Bana göre değil')} 
          variant="outline"
          loading={submitting}
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.laterButton}>
          <Text style={styles.laterText}>Daha sonra</Text>
        </TouchableOpacity>
      </View>

      <CustomModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        onClose={() => {
          setModal({ ...modal, visible: false });
          if (modal.title === 'Teşekkürler') router.back();
        }}
      />
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    width: '100%',
    padding: 30,
    borderRadius: 30,
    alignItems: 'center',
    minHeight: 300,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  categoryText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  cardContent: {
    fontSize: 18,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  errorText: {
    color: Colors.text.secondary,
    fontSize: 16,
    marginVertical: 40,
  },
  actions: {
    width: '100%',
    marginTop: 40,
  },
  laterButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  laterText: {
    color: Colors.text.secondary,
    fontSize: 16,
  },
});
