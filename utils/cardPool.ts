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

const CARD_POOL_EN: Record<string, { category: string; title: string; message: string }> = {
  'oz_1': { category: 'Self-Compassion', title: 'Be Gentle with Yourself', message: 'Treat yourself today as you would treat your best friend. You are that friend.' },
  'oz_2': { category: 'Self-Compassion', title: 'Mistakes Do Not Define You', message: 'Is there something you feel went wrong today? You did your best for that moment.' },
  'oz_3': { category: 'Self-Compassion', title: 'Stand by Your Side', message: 'Was there a moment you criticized yourself today? Softly tell that voice to pause now.' },
  'oz_4': { category: 'Self-Compassion', title: 'You Are Enough', message: 'Just as you are, right in this moment — you are enough. Breathe that in.' },
  'oz_5': { category: 'Self-Compassion', title: 'Listen to Your Inner Voice', message: 'If your inner voice spoke harshly today, tell it what you need: "You are right, but I am with you."' },
  'oz_6': { category: 'Self-Compassion', title: 'Patience Is Love', message: 'You can be a bit more patient with yourself today. Growth takes time.' },
  'far_1': { category: 'Mindfulness', title: 'Catch the Moment', message: 'How do you feel right now? No need to put it into words — just feel it.' },
  'far_2': { category: 'Mindfulness', title: 'What Echoed Today', message: 'What echoed inside you today? Even if a small memory — hold it for a moment.' },
  'far_3': { category: 'Mindfulness', title: 'A Pausing Moment', message: 'Was there something that made you pause today? What was that moment trying to tell you?' },
  'far_4': { category: 'Mindfulness', title: 'A Weight in Your Heart', message: 'Is there something you are carrying in your heart today? Noticing it begins to lighten it.' },
  'far_5': { category: 'Mindfulness', title: 'Silent Observer', message: 'If you observed yourself from the outside today, what would you see? Share that gaze now.' },
  'far_6': { category: 'Mindfulness', title: 'Which Moment Was Real?', message: 'Was there a moment today where you felt fully present? How long did it last?' },
  'nef_1': { category: 'Breath', title: 'Breath Ritual', message: 'Count four in, hold, count four out. That is all. Return to your body.' },
  'nef_2': { category: 'Breath', title: 'One Breath, Now', message: 'Just one deep breath. That is the whole practice. Take it now.' },
  'nef_3': { category: 'Breath', title: 'Feel Your Body', message: 'Do you feel your chest or abdomen as you breathe? Bring your attention there for a few seconds.' },
  'nef_4': { category: 'Breath', title: 'Slow Down', message: 'Did everything flow too quickly today? Now slow the world down by one breath.' },
  'nef_5': { category: 'Breath', title: 'Breath = Return', message: 'Whenever you feel lost, your breath is always ready to bring you back. Try it now.' },
  'alan_1': { category: 'Make Space', title: 'Gift of Silence', message: 'Spend five minutes just with yourself. Screens off, breath open.' },
  'alan_2': { category: 'Make Space', title: 'Stop and Listen', message: 'Was there a moment today where you stopped just to exist? Dedicate five minutes to it now.' },
  'alan_3': { category: 'Make Space', title: 'Allow Empty Space', message: 'Would you like to empty a bit instead of overflowing? What can you let go of today?' },
  'alan_4': { category: 'Make Space', title: 'Simply Exist', message: 'Without producing anything, without solving anything — what is it like to simply exist?' },
  'ces_1': { category: 'Small Courage', title: 'A Small Step', message: 'Do just one thing today to make yourself feel good. Small steps are also progress.' },
  'ces_2': { category: 'Small Courage', title: 'The Waiting Thing', message: 'What is that tiny thing you postponed for so long? Take just the first step today.' },
  'ces_3': { category: 'Small Courage', title: 'Unspoken Words', message: 'Was there something you wanted to say today but could not? Say it at least to yourself.' },
  'ces_4': { category: 'Small Courage', title: 'One Courageous Thing', message: 'What could be one single thing today that makes you feel brave, even if small?' },
  'ces_5': { category: 'Small Courage', title: 'Setting Boundaries', message: 'Saying "no" is sometimes the bravest act. Did you set a boundary for yourself today?' },
  'min_1': { category: 'Gratitude', title: 'Gratitude', message: 'Think of one thing that felt good today. No matter how small — it counts.' },
  'min_2': { category: 'Gratitude', title: 'Unnoticed Good', message: 'What good thing might you have received today without realizing? See it for a moment.' },
  'min_3': { category: 'Gratitude', title: 'Small Lights', message: 'Find a moment that was a small light in your day. However brief — that moment was real.' },
  'min_4': { category: 'Gratitude', title: 'Grateful for Whom?', message: 'Did someone presence feel good to you today? Think of that person sincerely.' },
  'min_5': { category: 'Gratitude', title: 'Thanking Your Body', message: 'Your body carried you today. What small thing can you thank it for?' },
  'bag_1': { category: 'Connection', title: 'A Touch with Someone', message: 'Was there someone you felt truly connected with today? A message, a look — how long did it last?' },
  'bag_2': { category: 'Connection', title: 'You Are Not Alone', message: 'If you feel lonely right now, know that this feeling comes to everyone. And it passes. I am here.' },
  'bag_3': { category: 'Connection', title: 'Return to Yourself', message: 'Was there a moment today when you said "me"? Did you hear your own voice?' },
  'yan_1': { category: 'Reflection', title: 'How Was Today?', message: 'If you described today with a single color or weather, what would it be?' },
  'yan_2': { category: 'Reflection', title: 'What Do You Wish for Tomorrow?', message: 'If you could carry one thing learned today into tomorrow, what would it be?' },
  'yan_3': { category: 'Reflection', title: 'What Challenged You', message: 'Which moment challenged you a bit? Simply see that moment without judging.' },
  'yan_4': { category: 'Reflection', title: 'What You Can Release', message: 'Which thought or feeling can you release before falling asleep tonight?' },
  'yan_5': { category: 'Reflection', title: 'Morning Intention', message: 'Was there an intention you carried for yourself today? Did that intention live today?' },
  'yan_6': { category: 'Reflection', title: 'Wish to Relive?', message: 'Was there a moment today you wished you could relive? Feel that moment again now.' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Weighted shuffle — slightly favors cards with matching peakHours */
function weightedShuffle(cards: PoolCard[], hour: number): PoolCard[] {
  const scored = cards.map(c => {
    const isPeak = c.peakHours ? c.peakHours.includes(hour) : false;
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
export async function pickFallbackCards(n: number = 3, isEn: boolean = false): Promise<PoolCard[]> {
  const hour = new Date().getHours();
  const recent = await loadRecent();

  const fresh = CARD_POOL.filter(c => !recent.includes(c.id));
  const stale = CARD_POOL.filter(c => recent.includes(c.id));

  const pool = fresh.length >= n ? fresh : [...fresh, ...stale];
  const shuffled = weightedShuffle(pool, hour);
  const picked = shuffled.slice(0, n);

  const newRecent = [...recent, ...picked.map(c => c.id)];
  await saveRecent(newRecent);

  if (isEn) {
    return picked.map(c => {
      const enMap = CARD_POOL_EN[c.id];
      if (enMap) {
        return {
          ...c,
          category: enMap.category,
          title: enMap.title,
          message: enMap.message,
        };
      }
      return c;
    });
  }

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
