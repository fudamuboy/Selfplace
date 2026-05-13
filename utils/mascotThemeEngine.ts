import { ThemeMode } from '../constants/themeModes';

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

/**
 * MascotThemeEngine
 * Centralized logic for mascot adaptation based on theme, mood, time, and intensity.
 */
export const getMascotConfig = (
  theme: ThemeMode,
  mood: MascotMood = 'neutral',
  hour: number = new Date().getHours(),
  stressLevel: number = 0 // 0.0 to 1.0 (Higher means slower, calmer animations)
): MascotConfig => {
  // ─── 0. Time-of-Day Logic ──────────────────────────────────────────────────
  const isMorning = hour >= 6 && hour < 11;
  const isAfternoon = hour >= 11 && hour < 18;
  const isEvening = hour >= 18 && hour < 22;
  const isNight = hour >= 22 || hour < 6;
  const isLateNight = hour >= 0 && hour < 5;

  // ─── 1. Color Logic (Theme-Based) ───────────────────────────────────────────
  // Mascot colors ALWAYS follow the active app theme
  let colors = { ...theme.colors.mascot };

  // Subtle atmospheric tweaks that don't break the theme's identity
  if (isNight) {
    if (isLateNight) {
      colors.glow = `${colors.glow}99`; // Softer glow for late night
    }
  }

  // ─── 2. Animation & Expression Logic (Time-Based) ──────────────────────────
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
    // MORNING: Gentle energy,fresh start
    breathDuration = 4000;
    floatIntensity = -5;
    scaleIntensity = 1.03;
    eyeType = 'semi'; // Eyes open softly
    glowOpacityMax = 0.5; // Brighter glow
  } else if (isAfternoon) {
    // AFTERNOON: Fully awake, attentive
    breathDuration = 3000;
    floatIntensity = -10;
    scaleIntensity = 1.06;
    eyeType = 'open'; // Fully awake
    blinkFrequency = 4000;
  } else if (isEvening) {
    // EVENING: Softer, reflective
    breathDuration = 5000;
    floatDuration = 5000;
    floatIntensity = -4;
    scaleIntensity = 1.03;
    eyeType = 'semi'; // Slightly sleepy
    glowOpacityMax = 0.35;
    blinkFrequency = 7000;
  } else if (isNight) {
    // NIGHT: Sleepy, peaceful (Restored behavior)
    breathDuration = isLateNight ? 7000 : 5500;
    floatDuration = 6000;
    floatIntensity = -3;
    scaleIntensity = 1.02;
    eyeType = 'closed'; // Eyes mostly closed
    glowOpacityMax = 0.25;
    blinkFrequency = 9000;
  }

  // Adapt to stress/emotional intensity (Emotional Mirror)
  if (stressLevel > 0.6) {
    breathDuration *= 1.5;
    floatIntensity = -2;
    scaleIntensity = 1.01;
  }

  // Override time-based eyeType if a specific emotional mood is passed
  // This allows the mascot to still show 'happy' or 'sad' if triggered
  if (mood !== 'neutral') {
    eyeType = 'default'; // Let MascotBlob decide based on mood
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
