/**
 * Relationship Domain Enums & Language Localizations
 * Canonical keys avoid AI dependency on Turkish strings.
 */

const EMOTIONAL_WEATHER = {
  CALM: { key: 'CALM', tr: 'Sakin', en: 'Calm' },
  SERENE: { key: 'SERENE', tr: 'Dingin', en: 'Serene' },
  GENTLE: { key: 'GENTLE', tr: 'Yumuşak', en: 'Gentle' },
  TENDER: { key: 'TENDER', tr: 'Hassas', en: 'Tender' },
  DEEP: { key: 'DEEP', tr: 'Derin', en: 'Deep' },
  MILDLY_INTENSE: { key: 'MILDLY_INTENSE', tr: 'Hafif Yoğun', en: 'Mildly Intense' },
  RENEWING: { key: 'RENEWING', tr: 'Yenileyici', en: 'Renewing' },
};

const RELATIONSHIP_ENERGY = {
  PEACEFUL: { key: 'PEACEFUL', tr: 'Huzurlu', en: 'Peaceful' },
  BALANCED: { key: 'BALANCED', tr: 'Dengeli', en: 'Balanced' },
  SOFT: { key: 'SOFT', tr: 'Yumuşak', en: 'Soft' },
  RENEWING: { key: 'RENEWING', tr: 'Yenileniyor', en: 'Renewing' },
  DISTANT: { key: 'DISTANT', tr: 'Mesafeli', en: 'Distant' },
  DEEP: { key: 'DEEP', tr: 'Derin', en: 'Deep' },
  EMOTIONAL: { key: 'EMOTIONAL', tr: 'Duygusal', en: 'Emotional' },
};

function normalizeWeather(val) {
  if (!val) return 'CALM';
  const s = String(val).trim().toUpperCase();
  for (const [k, v] of Object.entries(EMOTIONAL_WEATHER)) {
    if (k === s || v.tr.toUpperCase() === s || v.en.toUpperCase() === s) return k;
  }
  return 'CALM';
}

function normalizeEnergy(val) {
  if (!val) return 'PEACEFUL';
  const s = String(val).trim().toUpperCase();
  for (const [k, v] of Object.entries(RELATIONSHIP_ENERGY)) {
    if (k === s || v.tr.toUpperCase() === s || v.en.toUpperCase() === s) return k;
  }
  return 'PEACEFUL';
}

function getWeatherPresentation(val, lang = 'tr') {
  if (!val) return lang === 'en' ? 'Calm' : 'Sakin';
  const norm = normalizeWeather(val);
  return EMOTIONAL_WEATHER[norm]?.[lang === 'en' ? 'en' : 'tr'] || val;
}

function getEnergyPresentation(val, lang = 'tr') {
  if (!val) return lang === 'en' ? 'Peaceful' : 'Huzurlu';
  const norm = normalizeEnergy(val);
  return RELATIONSHIP_ENERGY[norm]?.[lang === 'en' ? 'en' : 'tr'] || val;
}

module.exports = {
  EMOTIONAL_WEATHER,
  RELATIONSHIP_ENERGY,
  normalizeWeather,
  normalizeEnergy,
  getWeatherPresentation,
  getEnergyPresentation,
};
