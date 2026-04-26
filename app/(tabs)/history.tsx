import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GradientBackground } from '../../components/GradientBackground';
import { Colors } from '../../constants/Colors';
import client from '../../api/client';
import { CustomModal } from '../../components/CustomModal';

interface CheckIn {
  id: number;
  mood: string;
  reflection_question: string;
  note: string;
  created_at: string;
}

export default function HistoryScreen() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState({ visible: false, title: '', message: '' });

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch History
    try {
      const historyRes = await client.get('/check-ins');
      setCheckIns(historyRes.data);
    } catch (error: any) {
      console.error('History Fetch Error:', error?.response?.data || error.message);
      // Only show error modal if it's a critical failure (not just empty)
      if (error.response?.status !== 404) {
        setModal({ 
          visible: true, 
          title: 'Hata', 
          message: 'Geçmiş yüklenirken bir sorun oluştu. Lütfen bağlantınızı kontrol edin.' 
        });
      }
    }

    // Fetch Insight separately (soft failure)
    try {
      const insightRes = await client.get('/insights/weekly');
      setInsight(insightRes.data.insight);
    } catch (error: any) {
      console.log('Insight Fetch (Soft Error):', error?.response?.data || error.message);
      // We don't show an error modal for insights, we just don't show the card
      setInsight(null);
    }

    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: CheckIn }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        <View style={styles.moodBadge}>
          <Text style={styles.moodText}>{item.mood}</Text>
        </View>
      </View>
      {item.note ? (
        <Text style={styles.note} numberOfLines={2}>{item.note}</Text>
      ) : (
        <Text style={styles.noNote}>Not bırakılmamış.</Text>
      )}
    </View>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Check-in Geçmişi</Text>
        
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={checkIns}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={
              insight ? (
                <View style={styles.insightCard}>
                  <Text style={styles.insightTitle}>Haftalık İçgörü ✨</Text>
                  <Text style={styles.insightText}>{insight}</Text>
                </View>
              ) : null
            }
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz bir check-in yapmadın.</Text>
                <Text style={styles.emptySubtext}>Kendini tanıma yolculuğun küçük adımlarla başlar. Bugünün sorusuna cevap vererek başlayabilirsin.</Text>
              </View>
            }
          />
        )}
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
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text.primary,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  insightCard: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.2)',
  },
  insightTitle: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightText: {
    color: Colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    color: Colors.text.secondary,
    fontSize: 14,
  },
  moodBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  note: {
    color: Colors.text.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  noNote: {
    color: Colors.text.secondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: Colors.text.primary,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptySubtext: {
    color: Colors.text.secondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
});
