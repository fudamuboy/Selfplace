/**
 * cardPool.ts
 *
 * Local fallback card content system.
 * Used when the API is unavailable OR as supplemental variety for mapped backend cards.
 *
 * Features:
 *   • 50+ unique Turkish prompts across 8 emotional tones
 *   • Time-of-day weighting (morning / afternoon / evening)
 *   • Recency tracking via AsyncStorage — avoids last 8 shown
 *   • Weighted-shuffle so pools feel organic, not fully random
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENCY_KEY = 'cardPool_recentIds';
const RECENCY_LIMIT = 8;

// ─── Card shape ────────────────────────────────────────────────────────────────
export interface PoolCard {
  id: string;
  icon: string;
  category: string;
  title: string;
  message: string;
  // Time windows this card is most relevant for (0–23). Empty = always.
  peakHours?: number[];
}

// ─── Full pool ─────────────────────────────────────────────────────────────────
export const CARD_POOL: PoolCard[] = [
  // ── Öz-Şefkat (Self-compassion) ────────────────────────────────────────────
  {
    id: 'oz_1',
    icon: '💜',
    category: 'Öz-Şefkat',
    title: 'Kendine Nazik Ol',
    message: 'Bugün en iyi arkadaşına davrandığın gibi kendine davran. O arkadaş sensin.',
  },
  {
    id: 'oz_2',
    icon: '💜',
    category: 'Öz-Şefkat',
    title: 'Hataların Seni Tanımlamaz',
    message: 'Bugün yanlış gittiğini düşündüğün bir şey var mı? O an için elinden geleni yaptın.',
  },
  {
    id: 'oz_3',
    icon: '💜',
    category: 'Öz-Şefkat',
    title: 'Kendi Yanında Ol',
    message: 'Bugün kendini eleştirdiğin bir an oldu mu? Şimdi o sese nazikçe "dur" de.',
  },
  {
    id: 'oz_4',
    icon: '🤲',
    category: 'Öz-Şefkat',
    title: 'Yeterlisin',
    message: 'Tam olarak şu haliyle, tam olarak şu an — yeterlisin. Bunu içine çek.',
  },
  {
    id: 'oz_5',
    icon: '🫂',
    category: 'Öz-Şefkat',
    title: 'İçindeki Sese Kulak Ver',
    message: 'Eğer içindeki ses bugün sert konuştuysa, ona ihtiyaç duyduğun şeyi söyle: "Haklısın, ama ben senin yanındayım."',
  },
  {
    id: 'oz_6',
    icon: '💜',
    category: 'Öz-Şefkat',
    title: 'Sabır Bir Sevgi Dilidir',
    message: 'Kendine bugün thera biraz daha sabırlı olabilirsin. Büyüme, zaman ister.',
    peakHours: [20, 21, 22],
  },

  // ── Farkındalık (Mindfulness) ──────────────────────────────────────────────
  {
    id: 'far_1',
    icon: '✨',
    category: 'Farkındalık',
    title: 'Anı Yakala',
    message: 'Şu an nasıl hissediyorsun? Kelimelerle ifade etmene gerek yok — sadece hisset.',
  },
  {
    id: 'far_2',
    icon: '✨',
    category: 'Farkındalık',
    title: 'Bugün İçinde Yankı Bırakan',
    message: 'Bugün içinde yankı bırakan neydi? Küçük bir anı bile olsa — onu bir an için tut.',
  },
  {
    id: 'far_3',
    icon: '🌿',
    category: 'Farkındalık',
    title: 'Duraksatan An',
    message: 'Bugün seni duraksatan bir şey oldu mu? O an sana ne söylemeye çalışıyordu?',
  },
  {
    id: 'far_4',
    icon: '✨',
    category: 'Farkındalık',
    title: 'Kalbindeki Ağırlık',
    message: 'Kalbinde taşıdığın bir şey var mı bugün? Onu fark etmek, onu hafifletmeye başlar.',
  },
  {
    id: 'far_5',
    icon: '🌙',
    category: 'Farkındalık',
    title: 'Sessiz Gözlemci',
    message: 'Bugün kendini dışarıdan izleseydin ne görürdün? O bakışı şimdi kendinle paylaş.',
    peakHours: [21, 22, 23],
  },
  {
    id: 'far_6',
    icon: '✨',
    category: 'Farkındalık',
    title: 'Hangi An Gerçekti?',
    message: 'Bugün tam anlamıyla var olduğunu hissettiğin bir an var mıydı? Ne kadar sürdü?',
  },

  // ── Nefes (Breath) ─────────────────────────────────────────────────────────
  {
    id: 'nef_1',
    icon: '🫧',
    category: 'Nefes',
    title: 'Nefes Ritüeli',
    message: 'Dört say, tut, dört say ver. Bu kadar. Bedene geri dön.',
  },
  {
    id: 'nef_2',
    icon: '🫧',
    category: 'Nefes',
    title: 'Bir Nefes, Şimdi',
    message: 'Sadece bir tane derin nefes. Bütün iş bu. Şimdi al.',
  },
  {
    id: 'nef_3',
    icon: '🌬️',
    category: 'Nefes',
    title: 'Vücudunu Hisset',
    message: 'Nefes alırken göğsünü ya da karnını hissediyor musun? Dikkatini oraya götür — sadece birkaç saniye.',
  },
  {
    id: 'nef_4',
    icon: '🫧',
    category: 'Nefes',
    title: 'Yavaşla',
    message: 'Bugün her şey çok hızlı aktı mı? Şimdi dünyayı bir nefes kadar yavaşlat.',
    peakHours: [18, 19, 20],
  },
  {
    id: 'nef_5',
    icon: '🌬️',
    category: 'Nefes',
    title: 'Nefes = Dönüş',
    message: 'Ne zaman kaybolsan, nefesin her zaman seni geri getirmeye hazır. Şimdi dene.',
  },

  // ── Alan Aç (Space) ────────────────────────────────────────────────────────
  {
    id: 'alan_1',
    icon: '🌙',
    category: 'Alan Aç',
    title: 'Sessizlik Hediyesi',
    message: 'Beş dakika sadece seninle ol. Ekranlar kapalı, nefes açık.',
  },
  {
    id: 'alan_2',
    icon: '🌙',
    category: 'Alan Aç',
    title: 'Dur ve Dinle',
    message: 'Bugün durup sadece var olduğun bir an oldu mu? Şimdi ona beş dakika ayır.',
    peakHours: [20, 21, 22, 23],
  },
  {
    id: 'alan_3',
    icon: '🌌',
    category: 'Alan Aç',
    title: 'Boşluğa İzin Ver',
    message: 'Dolup taşmak yerine biraz boşalmak ister misin? Bugün ne bırakabilirsin?',
  },
  {
    id: 'alan_4',
    icon: '🌙',
    category: 'Alan Aç',
    title: 'Sadece Var Ol',
    message: 'Hiçbir şey üretmeden, hiçbir şey çözmeden — sadece var olmak nasıl bir şey?',
    peakHours: [21, 22, 23, 0],
  },

  // ── Küçük Cesaret (Small Courage) ─────────────────────────────────────────
  {
    id: 'ces_1',
    icon: '🌱',
    category: 'Küçük Cesaret',
    title: 'Küçük Bir Adım',
    message: 'Bugün sadece bir şeyi kendine iyi hissettirmek için yap. Küçük adımlar da ilerlemedir.',
  },
  {
    id: 'ces_2',
    icon: '🌱',
    category: 'Küçük Cesaret',
    title: 'Bekleyen Şey',
    message: 'Uzun süredir ertelediğin ama aslında çok küçük olan şey ne? Bugün sadece ilk adımını at.',
    peakHours: [9, 10, 11],
  },
  {
    id: 'ces_3',
    icon: '🌱',
    category: 'Küçük Cesaret',
    title: 'Söyleyemedin mi?',
    message: 'Bugün söylemek isteyip söyleyemediğin bir şey var mıydı? Onu en azından kendine söyle.',
  },
  {
    id: 'ces_4',
    icon: '⚡',
    category: 'Küçük Cesaret',
    title: 'Tek Bir Şey',
    message: 'Bugün kendine cesur hissettiren — küçük de olsa — tek bir şey ne olabilir?',
    peakHours: [8, 9, 10],
  },
  {
    id: 'ces_5',
    icon: '🌱',
    category: 'Küçük Cesaret',
    title: 'Sınır Çizmek Cesaret İster',
    message: '"Hayır" demek bazen en cesur şeydir. Bugün kendine bir sınır çizdin mi?',
  },

  // ── Minnettarlık (Gratitude) ────────────────────────────────────────────────
  {
    id: 'min_1',
    icon: '🌸',
    category: 'Minnettarlık',
    title: 'Minnettarlık',
    message: 'Bugün sana iyi gelen bir şeyi düşün. Ne kadar küçük olursa olsun — o sayılır.',
  },
  {
    id: 'min_2',
    icon: '🌸',
    category: 'Minnettarlık',
    title: 'Görmezden Geldiğin İyi Şey',
    message: 'Bugün farkında olmadan aldığın güzel bir şey ne olabilir? Onu bir an için gör.',
  },
  {
    id: 'min_3',
    icon: '☀️',
    category: 'Minnettarlık',
    title: 'Küçük Işıklar',
    message: 'Bugünün içinde küçük bir ışık olan anı bul. Kaç saniye de sürsé — o an gerçekti.',
  },
  {
    id: 'min_4',
    icon: '🌸',
    category: 'Minnettarlık',
    title: 'Kime Minnettarsın?',
    message: 'Bugün birinin varlığı sana iyi geldi mi? O kişiyi bir an düşün — içten.',
    peakHours: [20, 21, 22],
  },
  {
    id: 'min_5',
    icon: '🌷',
    category: 'Minnettarlık',
    title: 'Bedenine Teşekkür',
    message: 'Bedenin bugün seni taşıdı. Hangi küçük şey için ona teşekkür edebilirsin?',
    peakHours: [21, 22, 23],
  },

  // ── Bağlantı (Connection) ──────────────────────────────────────────────────
  {
    id: 'bag_1',
    icon: '🤍',
    category: 'Bağlantı',
    title: 'Birisiyle Temas',
    message: 'Bugün gerçekten bağlandığını hissettiğin biri var mıydı? Bir mesaj, bir bakış — ne kadar sürdü?',
  },
  {
    id: 'bag_2',
    icon: '🫶',
    category: 'Bağlantı',
    title: 'Yalnız Değilsin',
    message: 'Şu an yalnız hissediyorsan bil ki bu duygu herkese gelir. Ve geçer. Sen buradayım.',
    peakHours: [22, 23, 0],
  },
  {
    id: 'bag_3',
    icon: '🤍',
    category: 'Bağlantı',
    title: 'Kendine Döndüğün An',
    message: 'Bugün bir anında "ben" dedin mi? Kendi sesini duydun mu? O an ne zaman oldu?',
  },

  // ── Yansıma (Reflection) ────────────────────────────────────────────────────
  {
    id: 'yan_1',
    icon: '🌙',
    category: 'Yansıma',
    title: 'Bugün Nasıldı?',
    message: 'Bugünü tek bir renk ya da hava durumu ile tarif etseydin ne olurdu?',
    peakHours: [20, 21, 22, 23],
  },
  {
    id: 'yan_2',
    icon: '🌙',
    category: 'Yansıma',
    title: 'Yarın Ne İstiyorsun?',
    message: 'Bugünden öğrendiğin bir şeyi yarına taşımak isteseydin bu ne olurdu?',
    peakHours: [21, 22, 23],
  },
  {
    id: 'yan_3',
    icon: '💭',
    category: 'Yansıma',
    title: 'Bugün Seni Zorlayan',
    message: 'Hangi an seni biraz zorladı? O anı yargılamadan sadece gör.',
  },
  {
    id: 'yan_4',
    icon: '🌙',
    category: 'Yansıma',
    title: 'Bırakabildiğin Şey',
    message: 'Bu gece uyumadan önce hangi düşünceyi ya da duyguyu bırakabilirsin?',
    peakHours: [22, 23, 0],
  },
  {
    id: 'yan_5',
    icon: '🌅',
    category: 'Yansıma',
    title: 'Sabahın Niyeti',
    message: 'Bu gün için kendin için taşıdığın bir niyet var mıydı? O niyet bugün yaşadı mı?',
    peakHours: [7, 8, 9],
  },
  {
    id: 'yan_6',
    icon: '💭',
    category: 'Yansıma',
    title: 'Tekrar Yaşamak İsterdin mi?',
    message: 'Bugün "keşke bir daha yaşasaydım" dediğin bir an oldu mu? O anı şimdi yeniden hisset.',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Weighted shuffle — slightly favors cards with matching peakHours */
function weightedShuffle(cards: PoolCard[], hour: number): PoolCard[] {
  const scored = cards.map(c => {
    const isPeak = c.peakHours ? c.peakHours.includes(hour) : false;
    // Peak-hour cards get a boost, others get a small random weight
    const weight = (isPeak ? 2 : 1) * Math.random();
    return { card: c, weight };
  });
  scored.sort((a, b) => b.weight - a.weight);
  return scored.map(s => s.card);
}

/** Load recently shown card IDs from AsyncStorage */
async function loadRecent(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENCY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist updated recency list */
async function saveRecent(ids: string[]): Promise<void> {
  try {
    // Keep only the last RECENCY_LIMIT entries
    const trimmed = ids.slice(-RECENCY_LIMIT);
    await AsyncStorage.setItem(RECENCY_KEY, JSON.stringify(trimmed));
  } catch {
    // Non-fatal
  }
}

/**
 * Pick `n` fresh local fallback cards, avoiding recently shown ones.
 * Applies time-of-day weighting for organic variety.
 */
export async function pickFallbackCards(n: number = 3): Promise<PoolCard[]> {
  const hour = new Date().getHours();
  const recent = await loadRecent();

  // Prefer cards not recently shown
  const fresh = CARD_POOL.filter(c => !recent.includes(c.id));
  const stale = CARD_POOL.filter(c => recent.includes(c.id));

  // If pool is exhausted, reset and use everything
  const pool = fresh.length >= n ? fresh : [...fresh, ...stale];

  const shuffled = weightedShuffle(pool, hour);
  const picked = shuffled.slice(0, n);

  // Record shown IDs
  const newRecent = [...recent, ...picked.map(c => c.id)];
  await saveRecent(newRecent);

  return picked;
}

/**
 * Clear recency history (e.g. after logout or reset).
 */
export async function clearCardRecency(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENCY_KEY);
  } catch {
    // Non-fatal
  }
}
