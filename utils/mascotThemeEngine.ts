import { ThemeMode } from '../constants/themeModes';
import { useLanguageStore } from '../store/useLanguageStore';

export type MascotMood = 
  | 'happy' 
  | 'neutral' 
  | 'calm' 
  | 'sad' 
  | 'tired' 
  | 'reflective' 
  | 'sleepy' 
  | 'caring' 
  | 'excited';

export interface MascotConfig {
  colors: {
    start: string;
    end: string;
    glow: string;
  };
  animation: {
    breathDuration: number;
    floatIntensity: number;
    glowOpacityMax: number;
    scaleIntensity: number;
    floatDuration: number;
  };
  expression: {
    eyeOpacity: number;
    mouthOpacity: number;
    blinkFrequency: number; // base ms
    eyeType: 'open' | 'semi' | 'closed' | 'default';
  };
}

export interface EmotionalContext {
  recentMoods: string[];
  intensity: number; // 0-1
  isDistressed: boolean; // True if recent moods are negative
}

/**
 * Mascot Periods
 */
export const MASCOT_PERIODS = {
  MORNING: { start: 5, end: 11 },
  AFTERNOON: { start: 11, end: 17 },
  EVENING: { start: 17, end: 22 },
  NIGHT: { start: 22, end: 5 },
};

/**
 * MascotThemeEngine
 * Centralized logic for mascot adaptation based on theme, mood, time, and intensity.
 */
export const getMascotConfig = (
  theme: ThemeMode,
  mood: MascotMood = 'neutral',
  hour: number = new Date().getHours(),
  stressLevel: number = 0,
  context?: EmotionalContext
): MascotConfig => {
  // ─── 0. Time-of-Day Logic ──────────────────────────────────────────────────
  const isMorning = hour >= 5 && hour < 11;
  const isAfternoon = hour >= 11 && hour < 17;
  const isEvening = hour >= 17 && hour < 22;
  const isNight = hour >= 22 || hour < 5;
  const isLateNight = hour >= 0 && hour < 5;

  // ─── 1. Color Logic (Theme-Based) ───────────────────────────────────────────
  let colors = { ...theme.colors.mascot };

  // Subtle atmospheric tweaks
  if (isNight) {
    colors.glow = colors.glow.slice(0, 7) + '99';
    if (isLateNight) colors.glow = colors.glow.slice(0, 7) + '77';
  } else if (isMorning) {
    colors.glow = colors.glow.slice(0, 7) + 'CC';
  }

  // Emotional Memory Influence: Soften glow if distressed
  if (context?.isDistressed) {
    colors.glow = colors.glow.slice(0, 7) + '88'; // Gentler glow for support
  }

  // ─── 2. Animation & Expression Logic ──────────────────────────────────────
  let breathDuration = 3500;
  let floatDuration = 4000;
  let floatIntensity = -8;
  let glowOpacityMax = 0.45;
  let scaleIntensity = 1.05;
  let blinkFrequency = 5000;
  let eyeType: 'open' | 'semi' | 'closed' | 'default' = 'default';
  let eyeOpacity = 1;
  let mouthOpacity = 0.9;

  if (isMorning) {
    breathDuration = 3800;
    floatDuration = 4500;
    floatIntensity = -6;
    scaleIntensity = 1.04;
    eyeType = 'open'; // AWAKE: 05:00 - 11:00
    glowOpacityMax = 0.65; 
  } else if (isAfternoon) {
    breathDuration = 3200;
    floatDuration = 4000;
    floatIntensity = -10;
    scaleIntensity = 1.06;
    eyeType = 'open'; // AWAKE: 11:00 - 17:00
    blinkFrequency = 4000;
    glowOpacityMax = 0.55;
  } else if (hour >= 17 && hour < 20) {
    // EARLY EVENING: 17:00 - 20:00 (Relaxed but Awake)
    breathDuration = 4200;
    floatDuration = 4500;
    floatIntensity = -6;
    scaleIntensity = 1.04;
    eyeType = 'semi'; 
    eyeOpacity = 0.95;
    glowOpacityMax = 0.45;
    blinkFrequency = 6000;
  } else if (hour >= 20 && hour < 22) {
    // LATE EVENING: 20:00 - 22:00 (Softer/More Relaxed)
    breathDuration = 5000;
    floatDuration = 5000;
    floatIntensity = -4;
    scaleIntensity = 1.03;
    eyeType = 'semi';
    eyeOpacity = 0.8;
    glowOpacityMax = 0.35;
    blinkFrequency = 8000;
  } else if (isNight) {
    breathDuration = isLateNight ? 7500 : 6000;
    floatDuration = 6000;
    floatIntensity = -3;
    scaleIntensity = 1.02;
    eyeType = 'closed'; // SLEEPY: 22:00 - 05:00
    glowOpacityMax = 0.25;
    blinkFrequency = 10000;
  }

  // ─── 3. Emotional Memory Adaptation ───────────────────────────────────────
  if (context?.isDistressed || stressLevel > 0.6) {
    // Make mascot softer and calmer regardless of time
    const factor = context?.isDistressed ? 1.3 : 1.4;
    breathDuration *= factor;
    floatIntensity = Math.max(floatIntensity, -4); // Reduce movement
    scaleIntensity = 1.02; // Gentler pulse
    glowOpacityMax *= 0.85;
    // Face state remains time-based for alertness
  }

  // Override if mood is specifically set (e.g. Happy/Sad check-in)
  if (mood !== 'neutral' && mood !== 'sleepy' && mood !== 'tired') {
    eyeType = 'default';
  }

  return {
    colors,
    animation: {
      breathDuration,
      floatIntensity,
      glowOpacityMax,
      scaleIntensity,
      floatDuration,
    },
    expression: {
      eyeOpacity,
      mouthOpacity,
      blinkFrequency,
      eyeType,
    },
  };
};

/**
 * Message Pools
 */
/**
 * Message Pools
 */
export const MESSAGE_POOLS = {
  tr: {
    MORNING: [
      "Bugün kendin için küçük bir şey yapalım mı?",
      "Yeni bir gün başladı 🌿",
      "Buradayım, seni dinliyorum.",
      "Günaydın, bugün senin günün olsun.",
      "Sabahın tazeliği ruhuna iyi gelsin.",
      "Yeni bir başlangıç için harika bir an."
    ],
    AFTERNOON: [
      "Bugün nasıl hissediyorsun?",
      "Küçük bir mola iyi gelebilir.",
      "Bugün seni en çok ne etkiledi?",
      "Nefes almayı unutma, buradayım.",
      "Günün ortasında kendine nazik davran.",
      "Seni neyin heyecanlandırdığını duymak isterim."
    ],
    EVENING: [
      "Bugünün sende bıraktığı şey neydi?",
      "Biraz içini dökmek ister misin?",
      "Akşamın sakinliği sana iyi gelsin.",
      "Günün yorgunluğunu beraber atalım mı?",
      "Bu akşam kendine ayırdığın vakit çok değerli.",
      "Gökyüzü kararırken içindeki ışığı hatırla."
    ],
    SUPPORTIVE: [
      "Zor bir gün müydü? Yanındayım...",
      "Her duygunun bir yeri var, burası güvenli.",
      "Sadece nefes al, her şey geçecek.",
      "Kendine biraz zaman tanı, acelemiz yok.",
      "Şu an nasıl hissediyorsan, o hisse alan açalım.",
      "Seni dinlemek için hep buradayım."
    ],
    NIGHT: [
      "Huzurlu geceler...",
      "Yıldızlar senin için parlıyor.",
      "Dinlenme vaktin geldi, iyi uykular.",
      "Günü geride bırak ve huzurla uyu."
    ]
  },
  en: {
    MORNING: [
      "Shall we do something kind for yourself today?",
      "A fresh new day has begun 🌿",
      "I'm here, listening anytime.",
      "Good morning, may today bring you peace.",
      "Feel the morning breeze refresh your spirit.",
      "A wonderful moment for a new start."
    ],
    AFTERNOON: [
      "How are you feeling right now?",
      "A little breather might feel nice.",
      "What resonated with you most today?",
      "Remember to breathe, I'm right here.",
      "Be gentle with yourself this afternoon.",
      "I'd love to hear what brings you joy."
    ],
    EVENING: [
      "What stayed with you from today?",
      "Would you like to pour out your thoughts?",
      "May the quiet evening bring you ease.",
      "Shall we unwind from today together?",
      "Taking time for yourself tonight is precious.",
      "As dusk falls, remember your inner light."
    ],
    SUPPORTIVE: [
      "Was today a bit heavy? I'm right here with you...",
      "Every emotion has a home here; you are safe.",
      "Just breathe, this moment will pass.",
      "Give yourself grace; there is no rush.",
      "Let's make space for whatever you feel right now.",
      "I am always here to listen."
    ],
    NIGHT: [
      "Peaceful night...",
      "The stars are shining softly for you.",
      "Time to rest now; sleep well.",
      "Let go of today and sleep in peace."
    ]
  }
};

let lastMessage: string = "";

/**
 * Get a dynamic mascot message based on time, emotional context, and language.
 */
export const getMascotMessage = (
  hour: number = new Date().getHours(),
  context?: EmotionalContext,
  language?: 'tr' | 'en'
): string => {
  const activeLang = language || (useLanguageStore?.getState?.()?.language as 'tr' | 'en') || 'tr';
  const langPools = MESSAGE_POOLS[activeLang] || MESSAGE_POOLS.tr;
  let pool: string[] = [];

  if (context?.isDistressed) {
    pool = langPools.SUPPORTIVE;
  } else if (hour >= 5 && hour < 11) {
    pool = langPools.MORNING;
  } else if (hour >= 11 && hour < 17) {
    pool = langPools.AFTERNOON;
  } else if (hour >= 17 && hour < 22) {
    pool = langPools.EVENING;
  } else {
    pool = langPools.NIGHT;
  }

  // Filter out the last message to avoid immediate repeats
  const availableMessages = pool.filter(m => m !== lastMessage);
  const finalPool = availableMessages.length > 0 ? availableMessages : pool;
  
  const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
  lastMessage = selected;
  return selected;
};
