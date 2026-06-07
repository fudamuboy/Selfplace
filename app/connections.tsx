import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';
import { getConnections, respondToInvite, RelationshipConnection } from '../api/relationshipApi';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H } from '../constants/Layout';

export default function ConnectionsScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const [connections, setConnections] = useState<RelationshipConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchConnections = async () => {
    try {
      const data = await getConnections();
      setConnections(data);
    } catch (error) {
      console.warn('[Connections] Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConnections();
  };

  const handleRespond = async (id: number, action: 'accept' | 'reject') => {
    setActionLoading(id);
    try {
      await respondToInvite(id, action);
      await fetchConnections();
    } catch (error) {
      console.warn(`[Connections] Response error (${action}):`, error);
    } finally {
      setActionLoading(null);
    }
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

  const activeConnections = connections.filter(c => c.status === 'active');
  const incomingInvites = connections.filter(c => c.status === 'pending' && c.isIncoming);
  const outgoingInvites = connections.filter(c => c.status === 'pending' && !c.isIncoming);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Bağlantılar</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.colors.primary} />
          }
        >
          <Text style={[styles.description, { color: currentTheme.colors.text.secondary }]}>
            Kendinize en yakın hissettiğiniz kişilerle duygusal bir köprü kurun. Selfplace, paylaşımlarınızı gizli tutarak aranızdaki bağı güçlendirir.
          </Text>

          {/* New Invite CTA */}
          <TouchableOpacity 
            style={[styles.inviteCTA, { backgroundColor: currentTheme.colors.glow, borderColor: currentTheme.colors.primary }]}
            onPress={() => router.push('/connection-invite')}
            activeOpacity={0.8}
          >
            <View style={styles.inviteCTALeft}>
              <View style={[styles.plusIconBg, { backgroundColor: currentTheme.colors.primary }]}>
                <Ionicons name="add" size={24} color="#FFF" />
              </View>
              <View style={styles.inviteCTATexts}>
                <Text style={[styles.inviteCTATitle, { color: currentTheme.colors.text.primary }]}>Yeni Bağlantı Ekle</Text>
                <Text style={[styles.inviteCTASub, { color: currentTheme.colors.text.muted }]}>E-posta adresiyle bir yakınınızı davet edin.</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.text.muted} />
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Incoming invites */}
              {incomingInvites.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Bekleyen Davetler ({incomingInvites.length})</Text>
                  {incomingInvites.map((invite) => (
                    <View 
                      key={invite.id} 
                      style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardAvatar}>
                          <Text style={styles.avatarText}>{invite.partner.username.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={[styles.partnerName, { color: currentTheme.colors.text.primary }]}>
                            {invite.partner.username}
                          </Text>
                          <Text style={[styles.partnerType, { color: currentTheme.colors.text.muted }]}>
                            {getConnectionTypeLabel(invite.connectionType)} olarak eklemek istiyor.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.actionButtonsRow}>
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: currentTheme.colors.primary }]}
                          onPress={() => handleRespond(invite.id, 'accept')}
                          disabled={actionLoading !== null}
                        >
                          {actionLoading === invite.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.acceptBtnText}>Kabul Et</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.rejectBtn, { borderColor: currentTheme.colors.cardBorder }]}
                          onPress={() => handleRespond(invite.id, 'reject')}
                          disabled={actionLoading !== null}
                        >
                          <Text style={[styles.rejectBtnText, { color: currentTheme.colors.text.secondary }]}>Reddet</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Active Connections */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Aktif Bağlantılar ({activeConnections.length})</Text>
                {activeConnections.length === 0 ? (
                  <View style={[styles.emptyState, { borderColor: currentTheme.colors.cardBorder }]}>
                    <Ionicons name="heart-dislike-outline" size={48} color={currentTheme.colors.text.muted} />
                    <Text style={[styles.emptyText, { color: currentTheme.colors.text.muted }]}>
                      Henüz aktif bir bağlantınız bulunmuyor.
                    </Text>
                  </View>
                ) : (
                  activeConnections.map((conn) => (
                    <TouchableOpacity
                      key={conn.id}
                      style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}
                      onPress={() => router.push(`/connection-detail?id=${conn.id}`)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardHeader}>
                        <View style={[styles.cardAvatar, { backgroundColor: currentTheme.colors.glow }]}>
                          <Text style={[styles.avatarText, { color: currentTheme.colors.primary }]}>
                            {(conn.partnerAlias || conn.partner.username).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={[styles.partnerName, { color: currentTheme.colors.text.primary }]}>
                            {conn.partnerAlias || conn.partner.username}
                          </Text>
                          <Text style={[styles.partnerType, { color: currentTheme.colors.text.muted }]}>
                            {getConnectionTypeLabel(conn.connectionType)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={currentTheme.colors.text.muted} />
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Outgoing Invites */}
              {outgoingInvites.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.text.secondary }]}>Gönderilen Davetler ({outgoingInvites.length})</Text>
                  {outgoingInvites.map((invite) => (
                    <View 
                      key={invite.id} 
                      style={[styles.card, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder, opacity: 0.85 }]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardAvatar}>
                          <Text style={styles.avatarText}>{invite.partner.username.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={[styles.partnerName, { color: currentTheme.colors.text.primary }]}>
                            {invite.partner.username}
                          </Text>
                          <Text style={[styles.partnerType, { color: currentTheme.colors.text.muted }]}>
                            {getConnectionTypeLabel(invite.connectionType)} · Bekliyor...
                          </Text>
                        </View>
                        <Ionicons name="time-outline" size={20} color={currentTheme.colors.primary} />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
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
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 40,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.8,
  },
  inviteCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  inviteCTALeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  plusIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  inviteCTATexts: {
    flex: 1,
  },
  inviteCTATitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inviteCTASub: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  partnerType: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 24,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {},
  acceptBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectBtn: {
    borderWidth: 1,
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
