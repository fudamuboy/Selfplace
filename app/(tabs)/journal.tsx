import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import useThemeStore from '../../store/useThemeStore';
import client from '../../api/client';
import { GradientBackground } from '../../components/GradientBackground';
import { CONTENT_MAX_WIDTH, PAGE_PADDING_H, isTablet } from '../../constants/Layout';
import { logger } from '../../utils/logger';
import { JournalSkeleton } from '../../components/SkeletonLoader';
import { NetworkErrorState } from '../../components/NetworkErrorState';
import { useNetworkStore } from '../../store/useNetworkStore';

interface JournalEntry {
  id: number | null;
  title: string | null;
  content: string;
  created_at?: string;
}

export default function JournalScreen() {
  const { currentTheme } = useThemeStore();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry>({ id: null, title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const richText = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    const unsubscribe = useNetworkStore.getState().subscribeToRefresh(() => {
      fetchEntries();
    });

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, []);

  const fetchEntries = async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await client.get('/journal', { timeout: 15000 });
      if (isMounted.current) {
        setEntries(response.data);
      }
    } catch (err: any) {
      if (isMounted.current) {
        if (err.message === 'SESSION_EXPIRED' || err.isSessionExpiry) {
          return;
        }
        setError(err.message || 'Bağlantı kısa süreliğine sessizleşti 🌙');
      }
      logger.error('[JournalScreen] fetchEntries failed', err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSave = async () => {
    // Strip HTML tags and &nbsp; to check if the content is truly empty
    const plainText = currentEntry.content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, '')
      .trim();
    
    if (!plainText) {
      Alert.alert('Eksik Bilgi', 'Lütfen önce bir şeyler yaz.');
      return;
    }

    try {
      if (currentEntry.id) {
        await client.put(`/journal/${currentEntry.id}`, {
          title: currentEntry.title?.trim() || null,
          content: currentEntry.content
        });
      } else {
        await client.post('/journal', {
          title: currentEntry.title?.trim() || null,
          content: currentEntry.content
        });
      }
      setIsEditing(false);
      setCurrentEntry({ id: null, title: '', content: '' });
      fetchEntries();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Günlük kaydedilemedi.';
      Alert.alert('Hata', msg);
    }
  };

  const createNew = () => {
    setCurrentEntry({ id: null, title: '', content: '' });
    setIsEditing(true);
  };

  const editEntry = (entry: JournalEntry) => {
    setCurrentEntry({ id: entry.id, title: entry.title || '', content: entry.content });
    setIsEditing(true);
  };

  const deleteEntry = async (id: number) => {
    Alert.alert('Emin misiniz?', 'Bu günlüğü silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await client.delete(`/journal/${id}`);
          fetchEntries();
        } catch (err) {}
      }}
    ]);
  };

  if (isEditing) {
    return (
      <GradientBackground edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsEditing(false)}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Günlük Yaz</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveButton, { color: currentTheme.colors.primary }]}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.editorOuter}>
          <View style={styles.editorInner}>
            <TextInput
              style={[styles.titleInput, { color: '#FFFFFF', borderBottomColor: 'rgba(255,255,255,0.1)' }]}
              placeholder="Başlık (İsteğe bağlı)"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={currentEntry.title || ''}
              onChangeText={(t) => setCurrentEntry(prev => ({ ...prev, title: t }))}
              multiline={false}
              returnKeyType="next"
            />
            
            <RichToolbar
              editor={richText}
              actions={[
                actions.setBold, actions.setItalic, actions.setUnderline, actions.heading1,
                actions.insertBulletsList, actions.insertOrderedList, actions.undo, actions.redo
              ]}
              iconTint="#FFFFFF"
              selectedIconTint={currentTheme.colors.primary}
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 10 }}
            />
            
            <View style={{ flex: 1, marginTop: 10 }}>
              <RichEditor
                ref={richText}
                initialContentHTML={currentEntry.content}
                placeholder="Bugün aklından neler geçiyor? Buraya özgürce yazabilirsin..."
                onChange={(content) => setCurrentEntry(prev => ({ ...prev, content }))}
                editorStyle={{
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  placeholderColor: 'rgba(255,255,255,0.5)',
                  contentCSSText: `font-size: 16px; line-height: 26px; min-height: 300px; ${isTablet ? 'max-width: 640px; margin: 0 auto;' : ''}`
                }}
                useContainer={false}
                style={{ flex: 1, paddingHorizontal: 15 }}
              />
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Günlüğüm</Text>
        <TouchableOpacity onPress={createNew}>
          <Ionicons name="add" size={28} color={currentTheme.colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && entries.length === 0 ? (
        <JournalSkeleton />
      ) : error && entries.length === 0 ? (
        <NetworkErrorState message={error} onRetry={fetchEntries} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.entryCard, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]} onPress={() => editEntry(item)}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.entryTitle, { color: '#FFFFFF' }]}>
                  {item.title || 'Başlıksız Günlük'}
                </Text>
                <Text style={[styles.entryDate, { color: 'rgba(255,255,255,0.75)' }]}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString('tr-TR') : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteEntry(item.id as number)} style={{ padding: 10 }}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="journal-outline" size={64} color="rgba(255,255,255,0.35)" />
              <Text style={[styles.emptyText, { color: 'rgba(255,255,255,0.75)' }]}>
                Henüz bir günlük yazmadın. Kendine biraz zaman ayır ve ilk günlüğünü oluştur.
              </Text>
            </View>
          }
        />
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  saveButton: { fontSize: 16, fontWeight: '600' },
  titleInput: {
    fontSize: 18,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    fontWeight: '600',
  },
  editorOuter: {
    flex: 1,
    alignItems: 'center',
  },
  editorInner: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
  listContent: {
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 40,
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  entryCard: {
    flexDirection: 'row',
    padding: 20,
    marginBottom: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  entryTitle: { fontSize: 18, fontWeight: '600', marginBottom: 5 },
  entryDate: { fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, padding: 40 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, lineHeight: 24 }
});
