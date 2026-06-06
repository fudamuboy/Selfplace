import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import useAuthStore from '../store/useAuthStore';
import { CustomModal } from '../components/CustomModal';
import { Toast } from '../components/Toast';
import { CustomButton } from '../components/CustomButton';
import { PremiumGate } from '../components/PremiumGate';
import { PremiumUpgradeModal } from '../components/PremiumUpgradeModal';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getConnections,
  getConnectionInsight,
  getPrivacySettings,
  updatePrivacySettings,
  disconnectConnection,
  updateSettings,
  getDailySync,
  getInsightFeed,
  RelationshipConnection,
  RelationshipPrivacySettings,
  RelationshipDailySync
} from '../api/relationshipApi';
import { CONTENT_MAX_WIDTH, FORM_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';

const RELATIONSHIP_TYPES = [
  { key: 'partner', label: '💞 Partner' },
  { key: 'best_friend', label: '🌟 En Yakın Arkadaş' },
  { key: 'family', label: '🌿 Aile' },
  { key: 'close_person', label: '🤍 Yakın Kişi' }
];

export default function ConnectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const connectionId = parseInt(id || '0', 10);

  const { currentTheme } = useThemeStore();
  const { planType, setPlanType } = useAuthStore();
  
  const [connection, setConnection] = useState<RelationshipConnection | null>(null);
  const [privacy, setPrivacy] = useState<RelationshipPrivacySettings | null>(null);
  const [insightText, setInsightText] = useState('');
  const [insightDate, setInsightDate] = useState<string | null>(null);
  const [dailySync, setDailySync] = useState<RelationshipDailySync | null>(null);
  const [insightFeed, setInsightFeed] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [insightLoading, setInsightLoading] = useState(false);
  const [dailySyncLoading, setDailySyncLoading] = useState(false);
  const [disconnectModalVisible, setDisconnectModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [editAlias, setEditAlias] = useState('');
  const [editType, setEditType] = useState('partner');
  const [toast, setToast] = useState({ visible: false, message: '' });

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load connections list to find this specific connection
      const allConns = await getConnections();
      const thisConn = allConns.find(c => c.id === connectionId);
      if (!thisConn) {
        router.back();
        return;
      }
      setConnection(thisConn);
      setEditAlias(thisConn.partnerAlias || '');
      setEditType(thisConn.connectionType);

      // Load privacy settings
      const privSettings = await getPrivacySettings(connectionId);
      setPrivacy(privSettings);

      // Load AI Empathy Insight
      const insightData = await getConnectionInsight(connectionId);
      setInsightText(insightData.insightText);
      setInsightDate(insightData.generatedAt);

      // Load Daily Sync details if available
      try {
        const syncData = await getDailySync(connectionId);
        setDailySync(syncData);
      } catch (e) {
        // Free tier limitation or no sync generated yet - handle gracefully
        setDailySync(null);
      }

      // Load Insight Feed details if available
      try {
        const feedData = await getInsightFeed(connectionId);
        setInsightFeed(feedData);
      } catch (e) {
        setInsightFeed([]);
      }

    } catch (error) {
      console.error('[ConnectionDetail] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (connectionId) {
      loadAllData();
    }
  }, [connectionId, planType]);

  const handleRefreshInsight = async () => {
    setInsightLoading(true);
    try {
      const insightData = await getConnectionInsight(connectionId, true);
      setInsightText(insightData.insightText);
      setInsightDate(insightData.generatedAt);
      showToast('İlişki analizi güncellendi ✨');
    } catch (error) {
      console.error('[ConnectionDetail] Error refreshing insight:', error);
      showToast('İçgörü şu an güncellenemedi.');
    } finally {
      setInsightLoading(false);
    }
  };

  const handleGenerateDailySync = async () => {
    setDailySyncLoading(true);
    try {
      const syncData = await getDailySync(connectionId);
      setDailySync(syncData);

      // Fetch new insight feed
      try {
        const feedData = await getInsightFeed(connectionId);
        setInsightFeed(feedData);
      } catch (e) {
        // ignore
      }

      showToast('Günlük uyum sentezlendi 🌤️');
    } catch (error: any) {
      console.error('[ConnectionDetail] Error generating daily sync:', error);
      if (error.response?.status === 403) {
        setUpgradeModalVisible(true);
      } else {
        showToast('Günlük uyum sentezi şu an yapılamadı.');
      }
    } finally {
      setDailySyncLoading(false);
    }
  };

  const handlePrivacyToggle = async (key: keyof RelationshipPrivacySettings, value: boolean) => {
    if (!privacy) return;

    const updatedApiSettings = {
      excludeCheckins: key === 'exclude_checkins' ? value : privacy.exclude_checkins,
      excludeJournals: key === 'exclude_journals' ? value : privacy.exclude_journals,
      excludeCards: key === 'exclude_cards' ? value : privacy.exclude_cards,
      excludeAiChat: key === 'exclude_ai_chat' ? value : privacy.exclude_ai_chat,
      excludePersonality: key === 'exclude_personality' ? value : privacy.exclude_personality,
    };

    try {
      const res = await updatePrivacySettings(connectionId, updatedApiSettings);
      setPrivacy(res.settings);
      showToast('Gizlilik sınırları güncellendi.');
    } catch (error) {
      console.error('[ConnectionDetail] Error updating privacy:', error);
      showToast('Ayarlar güncellenirken bir sorun oluştu.');
    }
  };

  const handleDisconnect = async () => {
    setDisconnectModalVisible(false);
    try {
      await disconnectConnection(connectionId);
      router.replace('/connections');
    } catch (error) {
      console.error('[ConnectionDetail] Error disconnecting:', error);
      showToast('Bağlantı kesilemedi.');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await updateSettings(connectionId, { alias: editAlias, connectionType: editType });
      setEditModalVisible(false);
      showToast('Bağlantı güncellendi.');
      loadAllData();
    } catch (error) {
      console.error('[ConnectionDetail] Error updating settings:', error);
      showToast('Bağlantı güncellenemedi.');
    }
  };

  const showToast = (message: string) => {
    setToast({ visible: true, message });
  };

  const getConnectionTypeLabel = (type: string) => {
    switch (type) {
      case 'partner': return '💞 Partner';
      case 'best_friend': return '🌟 En Yakın Arkadaş';
      case 'family': return '🌿 Aile';
      case 'close_person': return '🤍 Yakın Kişi';
      default: return '🔗 Bağlantı';
    }
  };

  const getWeatherGradient = (weather: string): [string, string] => {
    switch (weather) {
      case 'Sakin': return ['rgba(15, 32, 39, 0.95)', 'rgba(32, 58, 67, 0.95)'];
      case 'Dingin': return ['rgba(26, 27, 53, 0.95)', 'rgba(36, 36, 62, 0.95)'];
      case 'Yumuşak': return ['rgba(43, 16, 85, 0.95)', 'rgba(117, 151, 222, 0.95)'];
      case 'Hassas': return ['rgba(101, 78, 163, 0.95)', 'rgba(234, 175, 200, 0.95)'];
      case 'Derin': return ['rgba(67, 198, 172, 0.95)', 'rgba(25, 22, 84, 0.95)'];
      case 'Hafif Yoğun': return ['rgba(230, 92, 0, 0.95)', 'rgba(249, 212, 35, 0.95)'];
      case 'Yenileyici': return ['rgba(17, 153, 142, 0.95)', 'rgba(56, 239, 125, 0.95)'];
      default: return [currentTheme.colors.card, 'transparent'];
    }
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'Sakin': return 'sunny-outline';
      case 'Dingin': return 'moon-outline';
      case 'Yumuşak': return 'sparkles-outline';
      case 'Hassas': return 'rose-outline';
      case 'Derin': return 'water-outline';
      case 'Hafif Yoğun': return 'thunderstorm-outline';
      case 'Yenileyici': return 'leaf-outline';
      default: return 'cloud-outline';
    }
  };

  if (loading || !connection || !privacy) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  const partnerDisplayName = connection.partnerAlias || connection.partner.username;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>{partnerDisplayName}</Text>
          <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color={currentTheme.colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Info Card */}
          <View style={[styles.infoCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>İlişki Türü:</Text>
              <Text style={[styles.infoValue, { color: currentTheme.colors.text.primary }]}>
                {getConnectionTypeLabel(connection.connectionType)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: currentTheme.colors.text.muted }]}>E-posta:</Text>
              <Text style={[styles.infoValue, { color: currentTheme.colors.text.primary }]}>{connection.partner.email}</Text>
            </View>
          </View>

          {/* Phase 2: Daily Emotional Sync (Atmospheric weather & energy system) */}
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Günlük Duygusal Uyum 🌤️</Text>
          
          <PremiumGate
            requiredPlan="plus"
            currentPlan={planType}
            onUpgradePress={() => setUpgradeModalVisible(true)}
            subtitle="Günlük uyum analizi, duygusal hava durumu ve ilişki enerjisi analizlerini açmak için Plus'a yükseltin."
            containerStyle={{ marginBottom: 28 }}
          >
            {dailySyncLoading ? (
              <View style={[styles.syncCardMock, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                <Text style={[styles.syncLoadingText, { color: currentTheme.colors.text.secondary }]}>Duygusal kalıplarınız birleştiriliyor...</Text>
              </View>
            ) : dailySync ? (
              <LinearGradient
                colors={getWeatherGradient(dailySync.emotional_weather)}
                style={[styles.weatherCard, { borderColor: currentTheme.colors.primary }]}
              >
                <View style={styles.weatherHeader}>
                  <View style={styles.weatherBadgeRow}>
                    <View style={styles.weatherIconBg}>
                      <Ionicons name={getWeatherIcon(dailySync.emotional_weather) as any} size={22} color="#FFF" />
                    </View>
                    <View>
                      <Text style={styles.weatherLabel}>İlişki Atmosferi</Text>
                      <Text style={styles.weatherStateText}>{dailySync.emotional_weather}</Text>
                    </View>
                  </View>

                  <View style={styles.energyBadge}>
                    <Text style={styles.energyLabelText}>İlişki Enerjisi</Text>
                    <Text style={styles.energyValueText}>{dailySync.relationship_energy}</Text>
                  </View>
                </View>

                <View style={styles.weatherDivider} />

                <Text style={styles.weatherGuideText}>
                  {dailySync.generated_text}
                </Text>

                <TouchableOpacity 
                  style={[styles.syncRefreshBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                  onPress={handleGenerateDailySync}
                >
                  <Ionicons name="refresh-outline" size={14} color="#FFF" />
                  <Text style={styles.syncRefreshBtnText}>Sentezi Yenile</Text>
                </TouchableOpacity>

              </LinearGradient>
            ) : (
              <View style={[styles.syncCardMock, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
                <Ionicons name="cloudy-outline" size={36} color={currentTheme.colors.text.muted} style={{ marginBottom: 12 }} />
                <Text style={[styles.syncCardMockText, { color: currentTheme.colors.text.secondary }]}>
                  Bugünün duygusal sentezi henüz yapılmadı.
                </Text>
                <TouchableOpacity 
                  style={[styles.generateBtn, { backgroundColor: currentTheme.colors.primary }]}
                  onPress={handleGenerateDailySync}
                >
                  <Text style={styles.generateBtnText}>Uyum Sentezi Yap</Text>
                </TouchableOpacity>
              </View>
            )}
          </PremiumGate>

          {/* Phase 3: Uyum Fısıltıları (Insight Feed) */}
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Uyum Fısıltıları 🌿</Text>
          <PremiumGate
            requiredPlan="plus"
            currentPlan={planType}
            onUpgradePress={() => setUpgradeModalVisible(true)}
            subtitle="Günün 3 hafif duygusal uyum tavsiyesini açmak için Plus'a yükseltin."
            containerStyle={{ marginBottom: 28 }}
          >
            <View style={[styles.whisperContainer, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
              {insightFeed && insightFeed.length > 0 ? (
                insightFeed.map((whisper, idx) => (
                  <View key={idx} style={styles.whisperRowItem}>
                    <View style={[styles.whisperDot, { backgroundColor: currentTheme.colors.primary }]} />
                    <Text style={[styles.whisperText, { color: currentTheme.colors.text.primary }]}>
                      {whisper}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.whisperEmpty}>
                  <Text style={[styles.whisperEmptyText, { color: currentTheme.colors.text.muted }]}>
                    Bugün için henüz uyum fısıltısı üretilmemiş. Yukarıdaki uyum sentezini yapın.
                  </Text>
                </View>
              )}
            </View>
          </PremiumGate>

          {/* Phase 2: Navigation Links (Rituals & Timeline) */}
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Ortak Keşif Alanı 🌿</Text>
          <View style={styles.exploreGrid}>
            
            {/* Shared Rituals Button */}
            <TouchableOpacity 
              style={[styles.exploreBtn, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
              onPress={() => {
                if (planType === 'free') {
                  setUpgradeModalVisible(true);
                } else {
                  router.push(`/connection-rituals?id=${connectionId}`);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.exploreIconBg, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
                <Ionicons name="chatbubbles-outline" size={22} color="#A78BFA" />
              </View>
              <Text style={[styles.exploreBtnTitle, { color: currentTheme.colors.text.primary }]}>Günlük Ritüel</Text>
              <Text style={[styles.exploreBtnSub, { color: currentTheme.colors.text.muted }]}>Günün empati sorusuna yanıt verin</Text>
              {planType === 'free' && <Ionicons name="lock-closed" size={12} color={currentTheme.colors.text.muted} style={styles.lockBadge} />}
            </TouchableOpacity>

            {/* TimeLine Button */}
            <TouchableOpacity 
              style={[styles.exploreBtn, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
              onPress={() => {
                if (planType === 'free') {
                  setUpgradeModalVisible(true);
                } else {
                  router.push(`/connection-timeline?id=${connectionId}`);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.exploreIconBg, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                <Ionicons name="trail-sign-outline" size={22} color="#FBBF24" />
              </View>
              <Text style={[styles.exploreBtnTitle, { color: currentTheme.colors.text.primary }]}>Zaman Tüneli</Text>
              <Text style={[styles.exploreBtnSub, { color: currentTheme.colors.text.muted }]}>İlişki kilometre taşlarını takip edin</Text>
              {planType === 'free' && <Ionicons name="lock-closed" size={12} color={currentTheme.colors.text.muted} style={styles.lockBadge} />}
            </TouchableOpacity>

          </View>

          <View style={{ height: 16 }} />

          {/* AI Empathy Insight section */}
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Derin Uyum Analizi ✨</Text>
          <View style={[styles.insightCard, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
            {insightLoading ? (
              <View style={styles.insightLoadingBox}>
                <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                <Text style={[styles.insightLoadingText, { color: currentTheme.colors.text.secondary }]}>
                  Duygusal ritimleriniz analiz ediliyor...
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.insightText, { color: currentTheme.colors.text.primary }]}>
                  {insightText || 'Henüz bir uyum içgörüsü oluşturulmamış. Analiz etmek için aşağıdaki butona basın.'}
                </Text>
                
                {insightDate && (
                  <Text style={[styles.insightDate, { color: currentTheme.colors.text.muted }]}>
                    Güncellendi: {new Date(insightDate).toLocaleDateString('tr-TR')} · {new Date(insightDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}

                <TouchableOpacity 
                  style={[styles.refreshBtn, { backgroundColor: currentTheme.colors.primary }]}
                  onPress={handleRefreshInsight}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={16} color="#FFF" style={styles.refreshIcon} />
                  <Text style={styles.refreshBtnText}>Uyum Analizini Yenile</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={[styles.disclaimer, { color: currentTheme.colors.text.muted }]}>
            🛡️ Bu analiz, özel günlük yazılarınızı veya AI sohbetlerinizi birbirinizle paylaşmadan, yalnızca genel kişilik tipleri ve ruh hali eğilimlerinizin yapay zeka tarafından sentezlenmesi ile oluşturulmuştur.
          </Text>

          {/* Privacy settings */}
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Gizlilik Sınırlarınız 🔒</Text>
          <Text style={[styles.privacyDesc, { color: currentTheme.colors.text.muted }]}>
            Ortağınızla paylaşmak istemediğiniz ve uyum analizine dahil edilmesini engellemek istediğiniz verileri buradan kapatabilirsiniz.
          </Text>

          <View style={[styles.switchContainer, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
            
            <View style={styles.switchRow}>
              <View style={styles.switchTexts}>
                <Text style={[styles.switchTitle, { color: currentTheme.colors.text.primary }]}>Duygu Durumları</Text>
                <Text style={[styles.switchSub, { color: currentTheme.colors.text.muted }]}>Günlük mood check-in’lerini hariç tut</Text>
              </View>
              <Switch
                value={privacy.exclude_checkins}
                onValueChange={(val) => handlePrivacyToggle('exclude_checkins', val)}
                trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.switchSeparator} />

            <View style={styles.switchRow}>
              <View style={styles.switchTexts}>
                <Text style={[styles.switchTitle, { color: currentTheme.colors.text.primary }]}>Günlük Yazıları</Text>
                <Text style={[styles.switchSub, { color: currentTheme.colors.text.muted }]}>Günlük notlarının genel temasını analiz dışı bırak</Text>
              </View>
              <Switch
                value={privacy.exclude_journals}
                onValueChange={(val) => handlePrivacyToggle('exclude_journals', val)}
                trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.switchSeparator} />

            <View style={styles.switchRow}>
              <View style={styles.switchTexts}>
                <Text style={[styles.switchTitle, { color: currentTheme.colors.text.primary }]}>Eylem Kartları</Text>
                <Text style={[styles.switchSub, { color: currentTheme.colors.text.muted }]}>Seçtiğiniz ruhsal kart seçimlerini hariç tut</Text>
              </View>
              <Switch
                value={privacy.exclude_cards}
                onValueChange={(val) => handlePrivacyToggle('exclude_cards', val)}
                trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.switchSeparator} />

            <View style={styles.switchRow}>
              <View style={styles.switchTexts}>
                <Text style={[styles.switchTitle, { color: currentTheme.colors.text.primary }]}>Yapay Zeka Sohbetleri</Text>
                <Text style={[styles.switchSub, { color: currentTheme.colors.text.muted }]}>AI arkadaşınızla yaptığınız sohbet kalıplarını hariç tut</Text>
              </View>
              <Switch
                value={privacy.exclude_ai_chat}
                onValueChange={(val) => handlePrivacyToggle('exclude_ai_chat', val)}
                trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.switchSeparator} />

            <View style={styles.switchRow}>
              <View style={styles.switchTexts}>
                <Text style={[styles.switchTitle, { color: currentTheme.colors.text.primary }]}>Kişilik Özellikleri</Text>
                <Text style={[styles.switchSub, { color: currentTheme.colors.text.muted }]}>DISC renk testi sonuçlarını hariç tut</Text>
              </View>
              <Switch
                value={privacy.exclude_personality}
                onValueChange={(val) => handlePrivacyToggle('exclude_personality', val)}
                trackColor={{ false: '#3e3e3e', true: currentTheme.colors.primary }}
                thumbColor="#fff"
              />
            </View>

          </View>

          {/* Disconnect Button */}
          <TouchableOpacity 
            style={[styles.disconnectBtn, { borderColor: '#F87171' }]}
            onPress={() => setDisconnectModalVisible(true)}
          >
            <Ionicons name="heart-dislike-outline" size={20} color="#F87171" style={styles.disconnectIcon} />
            <Text style={styles.disconnectText}>Bağlantıyı Kes</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Edit Nickname & Type Modal */}
        <Modal
          visible={editModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: currentTheme.colors.background[1], borderColor: currentTheme.colors.glow }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: currentTheme.colors.text.primary }]}>Bağlantıyı Düzenle</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Ionicons name="close" size={24} color={currentTheme.colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ width: '100%' }} showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>Takma Ad</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: currentTheme.colors.card, color: currentTheme.colors.text.primary, borderColor: currentTheme.colors.cardBorder }]}
                    value={editAlias}
                    onChangeText={setEditAlias}
                    placeholder="Bir takma ad girin"
                    placeholderTextColor={currentTheme.colors.text.muted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: currentTheme.colors.text.muted }]}>İlişki Türü</Text>
                  <View style={styles.modalTypesGrid}>
                    {RELATIONSHIP_TYPES.map((type: { key: string; label: string }) => {
                      const isSelected = editType === type.key;
                      return (
                        <TouchableOpacity
                          key={type.key}
                          style={[
                            styles.modalTypeBtn,
                            { 
                              backgroundColor: isSelected ? currentTheme.colors.glow : currentTheme.colors.card,
                              borderColor: isSelected ? currentTheme.colors.primary : currentTheme.colors.cardBorder
                            }
                          ]}
                          onPress={() => setEditType(type.key)}
                        >
                          <Text style={{ color: isSelected ? currentTheme.colors.text.primary : currentTheme.colors.text.secondary, fontWeight: isSelected ? '700' : '500' }}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <CustomButton 
                  title="Güncelle" 
                  onPress={handleUpdateSettings} 
                  style={{ marginTop: 24 }}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Disconnect confirmation modal */}
        <CustomModal
          visible={disconnectModalVisible}
          title="Bağlantıyı Kes 💔"
          message={`${partnerDisplayName} ile aranızdaki duygusal bağı koparmak istediğinize emin misiniz? Bu işlem her iki taraftaki tüm ilişki yansımalarını silecektir.`}
          onClose={() => setDisconnectModalVisible(false)}
          onConfirm={handleDisconnect}
          confirmText="Bağlantıyı Kes"
        />

        {/* Subscription details upgrade modal */}
        <PremiumUpgradeModal
          visible={upgradeModalVisible}
          onClose={() => setUpgradeModalVisible(false)}
          currentPlan={planType}
          onPlanUpdated={(newPlan) => setPlanType(newPlan)}
        />

        <Toast 
          visible={toast.visible} 
          message={toast.message} 
          onHide={() => setToast({ ...toast, visible: false })} 
        />
      </View>
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
    paddingHorizontal: PAGE_PADDING_H,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  editButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 60,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 28,
  },
  infoRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  infoLabel: {
    width: 90,
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  weatherCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    overflow: 'hidden',
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  weatherStateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 1,
  },
  energyBadge: {
    alignItems: 'flex-end',
  },
  energyLabelText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  energyValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 1,
  },
  weatherDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 16,
  },
  weatherGuideText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  syncRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 18,
    gap: 6,
  },
  syncRefreshBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  syncCardMock: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncLoadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  syncCardMockText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  generateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  exploreGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  exploreBtn: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    position: 'relative',
  },
  exploreIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  exploreBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  exploreBtnSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  lockBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  insightCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    marginBottom: 12,
  },
  insightLoadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  insightLoadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 24,
  },
  insightDate: {
    fontSize: 11,
    marginTop: 16,
    fontStyle: 'italic',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 20,
  },
  refreshIcon: {
    marginRight: 8,
  },
  refreshBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  privacyDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  switchContainer: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 36,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  switchTexts: {
    flex: 1,
    marginRight: 16,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  switchSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 16,
  },
  disconnectIcon: {
    marginRight: 8,
  },
  disconnectText: {
    color: '#F87171',
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  modalTypesGrid: {
    gap: 10,
  },
  modalTypeBtn: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  whisperContainer: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  whisperRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  whisperDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  whisperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  whisperEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  whisperEmptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
