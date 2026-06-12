import client from './client';

export interface RelationshipConnection {
  id: number;
  status: 'pending' | 'active' | 'rejected' | 'disconnected';
  connectionType: 'partner' | 'best_friend' | 'family' | 'close_person';
  myAlias: string | null;
  partnerAlias: string | null;
  partner: {
    id: number;
    username: string;
    email: string;
  };
  isIncoming: boolean;
  createdAt: string;
}

export interface RelationshipPrivacySettings {
  id: number;
  user_id: number;
  connection_id: number;
  exclude_checkins: boolean;
  exclude_journals: boolean;
  exclude_cards: boolean;
  exclude_ai_chat: boolean;
  exclude_personality: boolean;
}

export const sendInvite = async (email: string, connectionType: string, alias?: string) => {
  const res = await client.post('/relationships/invite', { email, connectionType, alias });
  return res.data;
};

export const getConnections = async (): Promise<RelationshipConnection[]> => {
  const res = await client.get('/relationships');
  return res.data;
};

export const respondToInvite = async (id: number, action: 'accept' | 'reject', alias?: string) => {
  const res = await client.put(`/relationships/${id}/respond`, { action, alias });
  return res.data;
};

export const updateSettings = async (id: number, settings: { alias?: string; connectionType?: string }) => {
  const res = await client.put(`/relationships/${id}/settings`, settings);
  return res.data;
};

export const disconnectConnection = async (id: number) => {
  const res = await client.delete(`/relationships/${id}`);
  return res.data;
};

export const getPrivacySettings = async (id: number): Promise<RelationshipPrivacySettings> => {
  const res = await client.get(`/relationships/${id}/privacy`);
  return res.data;
};

export const updatePrivacySettings = async (id: number, settings: {
  excludeCheckins?: boolean;
  excludeJournals?: boolean;
  excludeCards?: boolean;
  excludeAiChat?: boolean;
  excludePersonality?: boolean;
}) => {
  const res = await client.put(`/relationships/${id}/privacy`, settings);
  return res.data;
};

export const getConnectionInsight = async (id: number, refresh = false): Promise<{ insightText: string; generatedAt: string }> => {
  const res = await client.get(`/relationships/${id}/insight?refresh=${refresh}`);
  return res.data;
};

export interface RelationshipDailySync {
  id: number;
  connection_id: number;
  synced_date: string;
  generated_text: string;
  emotional_weather: string;
  relationship_energy: string;
  created_at: string;
  expires_at: string | null;
  emotional_aura?: string | null;
  connection_state?: string | null;
  relationship_rhythm?: string | null;
  emotional_closeness?: number | null;
}

export interface MemoryCrystal {
  id: number;
  summary: string;
  created_at: string;
  symbol: string;
}

export interface RelationshipGarden {
  connectionId: number;
  gardenState: 'peaceful_garden' | 'rainy_reflection' | 'warm_sunset' | 'spring_bloom' | 'silent_winter' | 'healing_rain';
  growthLevel: number;
  flowersCount: number;
  treeHeight: number;
  starsUnlocked: number;
  totalRituals: number;
  totalCrystals: number;
}

export interface RelationshipRitual {
  ritualId: number;
  prompt: string;
  myResponse: {
    id: number;
    ritual_id: number;
    user_id: number;
    response_text: string;
    include_in_synthesis: boolean;
    created_at: string;
  } | null;
  partnerResponded: boolean;
  relationshipReflection?: string | null;
  emotionalClimate?: string | null;
  gentleSuggestion?: string | null;
}

export interface RelationshipTimelineEvent {
  id: number;
  connection_id: number;
  event_type: 'created' | 'sync' | 'weather_change' | 'ritual_done';
  title_tr: string;
  description_tr: string;
  created_at: string;
}

export const getDailySync = async (id: number): Promise<RelationshipDailySync> => {
  const res = await client.get(`/relationships/${id}/daily-sync`);
  return res.data;
};

export const getRituals = async (id: number): Promise<RelationshipRitual> => {
  const res = await client.get(`/relationships/${id}/rituals`);
  return res.data;
};

export const respondToRitual = async (id: number, ritualId: number, responseText: string, includeInSynthesis = true) => {
  const res = await client.post(`/relationships/${id}/rituals/${ritualId}/respond`, { responseText, includeInSynthesis });
  return res.data;
};

export const getTimeline = async (id: number): Promise<RelationshipTimelineEvent[]> => {
  const res = await client.get(`/relationships/${id}/timeline`);
  return res.data;
};

export const getInsightFeed = async (id: number): Promise<string[]> => {
  const res = await client.get(`/relationships/${id}/insight-feed`);
  return res.data;
};

export const getCrystals = async (id: number): Promise<MemoryCrystal[]> => {
  const res = await client.get(`/relationships/${id}/crystals`);
  return res.data;
};

export const getGardenState = async (id: number): Promise<RelationshipGarden> => {
  const res = await client.get(`/relationships/${id}/garden`);
  return res.data;
};
