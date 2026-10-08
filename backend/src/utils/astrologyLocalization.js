/**
 * Astrology Localization Engine
 * Provides complete English presentation mappings for all 12 zodiac signs
 * and all current/future sky transit events.
 */

const ZODIAC_NAME_MAP = {
  'Koç': 'Aries',
  'Boğa': 'Taurus',
  'İkizler': 'Gemini',
  'Yengeç': 'Cancer',
  'Aslan': 'Leo',
  'Başak': 'Virgo',
  'Terazi': 'Libra',
  'Akrep': 'Scorpio',
  'Yay': 'Sagittarius',
  'Oğlak': 'Capricorn',
  'Kova': 'Aquarius',
  'Balık': 'Pisces'
};

const EN_TO_TR_ZODIAC = {
  'Aries': 'Koç',
  'Taurus': 'Boğa',
  'Gemini': 'İkizler',
  'Cancer': 'Yengeç',
  'Leo': 'Aslan',
  'Virgo': 'Başak',
  'Libra': 'Terazi',
  'Scorpio': 'Akrep',
  'Sagittarius': 'Yay',
  'Capricorn': 'Oğlak',
  'Aquarius': 'Kova',
  'Pisces': 'Balık'
};

function toCanonicalTurkishZodiac(sign) {
  if (!sign) return null;
  const trimmed = String(sign).trim();
  if (ZODIAC_NAME_MAP[trimmed]) return trimmed;
  if (EN_TO_TR_ZODIAC[trimmed]) return EN_TO_TR_ZODIAC[trimmed];
  for (const [en, tr] of Object.entries(EN_TO_TR_ZODIAC)) {
    if (en.toLowerCase() === trimmed.toLowerCase()) return tr;
  }
  for (const tr of Object.keys(ZODIAC_NAME_MAP)) {
    if (tr.toLowerCase() === trimmed.toLowerCase()) return tr;
  }
  return trimmed;
}

function toCanonicalEnglishZodiac(sign) {
  if (!sign) return null;
  const trSign = toCanonicalTurkishZodiac(sign);
  return ZODIAC_NAME_MAP[trSign] || sign;
}

function getZodiacFromDate(birthDate) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Koç';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Boğa';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'İkizler';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Yengeç';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Aslan';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Başak';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Terazi';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Akrep';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Yay';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Oğlak';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Kova';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Balık';
  return null;
}

const ELEMENT_MAP = {
  'Ateş': 'Fire',
  'Toprak': 'Earth',
  'Hava': 'Air',
  'Su': 'Water'
};

const MODALITY_MAP = {
  'Öncü': 'Cardinal',
  'Sabit': 'Fixed',
  'Değişken': 'Mutable'
};

const PLANET_MAP = {
  'Mars': 'Mars',
  'Venüs': 'Venus',
  'Merkür': 'Mercury',
  'Ay': 'Moon',
  'Güneş': 'Sun',
  'Satürn': 'Saturn',
  'Jüpiter': 'Jupiter',
  'Uranüs': 'Uranus',
  'Neptün': 'Neptune',
  'Plüton': 'Pluto'
};

const ZODIAC_PROFILE_EN_MAP = {
  'Koç': {
    sign: 'Aries',
    element: 'Fire',
    modality: 'Cardinal',
    ruling_planet: 'Mars',
    strengths: ['Courage', 'Leadership', 'Energy'],
    weaknesses: ['Impatience', 'Anger', 'Impulsiveness'],
    core_needs: 'Taking action and leading the way.',
    stress_response: 'Under stress, may become irritable and impulsive.'
  },
  'Boğa': {
    sign: 'Taurus',
    element: 'Earth',
    modality: 'Fixed',
    ruling_planet: 'Venus',
    strengths: ['Patience', 'Reliability', 'Practicality'],
    weaknesses: ['Stubbornness', 'Resistance to change', 'Tendency toward complacency'],
    core_needs: 'Security, comfort, and stability.',
    stress_response: 'Under stress, may become stubborn and withdrawn.'
  },
  'İkizler': {
    sign: 'Gemini',
    element: 'Air',
    modality: 'Mutable',
    ruling_planet: 'Mercury',
    strengths: ['Communication', 'Adaptability', 'Curiosity'],
    weaknesses: ['Indecisiveness', 'Superficiality', 'Lack of focus'],
    core_needs: 'Mental stimulation and variety.',
    stress_response: 'Under stress, may become anxious and scattered.'
  },
  'Yengeç': {
    sign: 'Cancer',
    element: 'Water',
    modality: 'Cardinal',
    ruling_planet: 'Moon',
    strengths: ['Empathy', 'Protectiveness', 'Intuition'],
    weaknesses: ['Hypersensitivity', 'Clinging to the past', 'Touchiness'],
    core_needs: 'Emotional security and belonging.',
    stress_response: 'Under stress, retreats into a shell and becomes defensive.'
  },
  'Aslan': {
    sign: 'Leo',
    element: 'Fire',
    modality: 'Fixed',
    ruling_planet: 'Sun',
    strengths: ['Creativity', 'Generosity', 'Confidence'],
    weaknesses: ['Pride', 'Need for validation', 'Authoritarianism'],
    core_needs: 'Being appreciated and shining bright.',
    stress_response: 'Under stress, may become prideful or overly dramatic.'
  },
  'Başak': {
    sign: 'Virgo',
    element: 'Earth',
    modality: 'Mutable',
    ruling_planet: 'Mercury',
    strengths: ['Analysis', 'Helpfulness', 'Attention to Detail'],
    weaknesses: ['Overcritical nature', 'Perfectionism', 'Anxiety'],
    core_needs: 'Being helpful and creating order.',
    stress_response: 'Under stress, may become overly critical and anxious.'
  },
  'Terazi': {
    sign: 'Libra',
    element: 'Air',
    modality: 'Cardinal',
    ruling_planet: 'Venus',
    strengths: ['Diplomacy', 'Harmony', 'Aesthetics'],
    weaknesses: ['Indecisiveness', 'Conflict avoidance', 'People-pleasing'],
    core_needs: 'Harmony, balance, and justice.',
    stress_response: 'Under stress, becomes indecisive and passive-aggressive.'
  },
  'Akrep': {
    sign: 'Scorpio',
    element: 'Water',
    modality: 'Fixed',
    ruling_planet: 'Pluto',
    strengths: ['Passion', 'Depth', 'Transformation'],
    weaknesses: ['Jealousy', 'Need for control', 'Suspicion'],
    core_needs: 'Deep connections and seeking truth.',
    stress_response: 'Under stress, may become controlling and secretive.'
  },
  'Yay': {
    sign: 'Sagittarius',
    element: 'Fire',
    modality: 'Mutable',
    ruling_planet: 'Jupiter',
    strengths: ['Optimism', 'Freedom', 'Philosophy'],
    weaknesses: ['Irresponsibility', 'Impatience', 'Tactlessness'],
    core_needs: 'Freedom and the search for meaning.',
    stress_response: 'Under stress, tends to escape or over-promise.'
  },
  'Oğlak': {
    sign: 'Capricorn',
    element: 'Earth',
    modality: 'Cardinal',
    ruling_planet: 'Saturn',
    strengths: ['Discipline', 'Responsibility', 'Determination'],
    weaknesses: ['Pessimism', 'Rigidity', 'Workaholism'],
    core_needs: 'Achievement, structure, and respect.',
    stress_response: 'Under stress, may become cold, distant, and rigid.'
  },
  'Kova': {
    sign: 'Aquarius',
    element: 'Air',
    modality: 'Fixed',
    ruling_planet: 'Uranus',
    strengths: ['Originality', 'Humanitarianism', 'Independence'],
    weaknesses: ['Emotional detachment', 'Stubbornness', 'Rebelliousness'],
    core_needs: 'Individuality and collective progress.',
    stress_response: 'Under stress, isolates emotionally and retreats into pure logic.'
  },
  'Balık': {
    sign: 'Pisces',
    element: 'Water',
    modality: 'Mutable',
    ruling_planet: 'Neptune',
    strengths: ['Compassion', 'Intuition', 'Artistry'],
    weaknesses: ['Escapism', 'Victim mentality', 'Difficulty setting boundaries'],
    core_needs: 'Spiritual wholeness and inspiration.',
    stress_response: 'Under stress, seeks escape routes and loses personal boundaries.'
  }
};

// Also index by English sign names for fast lookup
Object.keys(ZODIAC_NAME_MAP).forEach(trName => {
  const enName = ZODIAC_NAME_MAP[trName];
  if (!ZODIAC_PROFILE_EN_MAP[enName]) {
    ZODIAC_PROFILE_EN_MAP[enName] = ZODIAC_PROFILE_EN_MAP[trName];
  }
});

function isEnglish(val) {
  return val === true || val === 'en';
}

const EXACT_EVENTS_EN = {
  'Dolunay (Terazi)': {
    name: 'Full Moon (Libra)',
    desc: 'A peak period for seeking harmony and balance in relationships. You may reflect on the balance of giving and receiving.'
  },
  'Merkür Retrosu (Koç)': {
    name: 'Mercury Retrograde (Aries)',
    desc: 'Be mindful of impulsive reactions in communication. A wonderful time to reflect on past decisions.'
  },
  'Yeni Ay (Boğa)': {
    name: 'New Moon (Taurus)',
    desc: 'A grounded time to plant new material and emotional seeds. Your need for security and comfort may increase.'
  },
  'Venüs İkizler Transit': {
    name: 'Venus in Gemini Transit',
    desc: 'A lighthearted and playful energy highlighting socialization, curiosity, and exploring fresh ideas.'
  },
  'Merkür Retrosu': {
    name: 'Mercury Retrograde',
    desc: 'Slowdowns in communication, revisiting past matters.'
  },
  'Venüs Retrosu': {
    name: 'Venus Retrograde',
    desc: 'Reflecting on relationships, values, and past connections.'
  },
  'Mars Retrosu': {
    name: 'Mars Retrograde',
    desc: 'Re-evaluating energy, ambition, and inner drive.'
  },
  'Satürn Retrosu': {
    name: 'Saturn Retrograde',
    desc: 'Reviewing commitments, boundaries, and long-term structures.'
  },
  'Jüpiter Retrosu': {
    name: 'Jupiter Retrograde',
    desc: 'Deepening inner wisdom, faith, and philosophical perspective.'
  },
  'Dolunay': {
    name: 'Full Moon',
    desc: 'Tonight invites you to gently listen to your inner voice 🌙'
  },
  'Yeni Ay': {
    name: 'New Moon',
    desc: 'A calm day for setting gentle intentions and welcoming fresh beginnings.'
  },
  'Yaz Gündönümü': {
    name: 'Summer Solstice',
    desc: 'May the radiant light of the longest day illuminate your inner energy ☀️'
  },
  'Kış Gündönümü': {
    name: 'Winter Solstice',
    desc: 'The quietest night of the year invites reflection and restoration.'
  },
  'Bahar Ekinoksu': {
    name: 'Spring Equinox',
    desc: 'Day and night reach perfect balance, welcoming growth and rejuvenation.'
  },
  'Sonbahar Ekinoksu': {
    name: 'Autumn Equinox',
    desc: 'A graceful balance of light and shadow, time to harvest inner gratitude.'
  },
  'Bahar Yağmurları': {
    name: 'Spring Showers',
    desc: 'Like the first spring rain, make room for gentle moments that refresh your spirit.'
  },
  'Kış Sakinliği': {
    name: 'Winter Serenity',
    desc: 'As nature rests in winter slumber, give yourself permission to slow down.'
  },
  'Hıdırellez': {
    name: 'Spring Renewal Festival',
    desc: 'A beautiful day to plant gentle seeds and intentions for the season 🌿'
  },
  'İkizler Mevsimi': {
    name: 'Gemini Season',
    desc: 'This seasonal shift brings a fresh and curious perspective to your world.'
  },
  'Yengeç Mevsimi': {
    name: 'Cancer Season',
    desc: 'A reflective period highlighting emotional depth, belonging, and comfort.'
  },
  'Gökyüzü': {
    name: 'The Sky',
    desc: 'Observations of the celestial sphere.'
  },
  'Gökyüzü Dingin': {
    name: 'Sky Serenity',
    desc: 'The sky rests in tranquil harmony.'
  }
};

/**
 * Translates an astrological event name dynamically if it follows known astronomical patterns.
 */
function translateAstrologyEventName(eventName, isEn = false) {
  if (!eventName || !isEnglish(isEn)) return eventName;
  if (EXACT_EVENTS_EN[eventName]) return EXACT_EVENTS_EN[eventName].name;

  let translated = eventName;

  // Translate signs using unicode boundaries
  for (const [trSign, enSign] of Object.entries(ZODIAC_NAME_MAP)) {
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${trSign}(?![\\p{L}\\p{N}])`, 'gu');
    translated = translated.replace(regex, enSign);
  }

  // Translate planets
  for (const [trPlanet, enPlanet] of Object.entries(PLANET_MAP)) {
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])${trPlanet}(?![\\p{L}\\p{N}])`, 'gu');
    translated = translated.replace(regex, enPlanet);
  }

  // Translate celestial event keywords and suffixes
  translated = translated
    .replace(/(?<![\p{L}\p{N}])Güneş Tutulması(?![\p{L}\p{N}])/gu, 'Solar Eclipse')
    .replace(/(?<![\p{L}\p{N}])Ay Tutulması(?![\p{L}\p{N}])/gu, 'Lunar Eclipse')
    .replace(/(?<![\p{L}\p{N}])Dolunayı(?![\p{L}\p{N}])/gu, 'Full Moon')
    .replace(/(?<![\p{L}\p{N}])Dolunay(?![\p{L}\p{N}])/gu, 'Full Moon')
    .replace(/(?<![\p{L}\p{N}])Yeni Ayı(?![\p{L}\p{N}])/gu, 'New Moon')
    .replace(/(?<![\p{L}\p{N}])Yeni Ay(?![\p{L}\p{N}])/gu, 'New Moon')
    .replace(/(?<![\p{L}\p{N}])Retrosu(?![\p{L}\p{N}])/gu, 'Retrograde')
    .replace(/(?<![\p{L}\p{N}])Retro(?![\p{L}\p{N}])/gu, 'Retrograde')
    .replace(/(?<![\p{L}\p{N}])Mevsimi(?![\p{L}\p{N}])/gu, 'Season')
    .replace(/(?<![\p{L}\p{N}])Transiti(?![\p{L}\p{N}])/gu, 'Transit')
    .replace(/(?<![\p{L}\p{N}])Transit(?![\p{L}\p{N}])/gu, 'Transit')
    .replace(/(?<![\p{L}\p{N}])Gündönümü(?![\p{L}\p{N}])/gu, 'Solstice')
    .replace(/(?<![\p{L}\p{N}])Ekinoksu(?![\p{L}\p{N}])/gu, 'Equinox');

  return translated.trim();
}

/**
 * Translates an astrological event's name and description.
 */
function translateAstrologyEvent(event, isEn = false) {
  if (!event || !isEnglish(isEn)) return event;

  const exact = EXACT_EVENTS_EN[event.event_name];
  if (exact) {
    return {
      ...event,
      event_name: exact.name,
      description: exact.desc
    };
  }

  const translatedName = translateAstrologyEventName(event.event_name, true);

  // If description has Turkish characters and no exact match, provide natural English fallback
  let desc = event.description || '';
  if (/[\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]/.test(desc)) {
    desc = `A subtle celestial shift under ${translatedName}, inviting calm awareness and gentle introspection.`;
  }

  return {
    ...event,
    event_name: translatedName,
    description: desc
  };
}

/**
 * Translates a complete zodiac profile for presentation.
 */
function translateZodiacProfile(profile, isEn = false) {
  if (!profile) return null;
  const trSign = toCanonicalTurkishZodiac(profile.sign);

  if (!isEnglish(isEn)) {
    return {
      ...profile,
      sign: trSign || profile.sign,
      element: profile.element,
      modality: profile.modality,
      ruling_planet: profile.ruling_planet,
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      core_needs: profile.core_needs,
      stress_response: profile.stress_response
    };
  }

  const enProfile = ZODIAC_PROFILE_EN_MAP[trSign] || ZODIAC_PROFILE_EN_MAP[profile.sign];

  if (!enProfile) {
    return {
      ...profile,
      sign: toCanonicalEnglishZodiac(profile.sign),
      element: ELEMENT_MAP[profile.element] || profile.element,
      modality: MODALITY_MAP[profile.modality] || profile.modality,
      ruling_planet: PLANET_MAP[profile.ruling_planet] || profile.ruling_planet
    };
  }

  return {
    ...profile,
    sign: enProfile.sign,
    element: enProfile.element,
    modality: enProfile.modality,
    ruling_planet: enProfile.ruling_planet,
    strengths: enProfile.strengths,
    weaknesses: enProfile.weaknesses,
    core_needs: enProfile.core_needs,
    stress_response: enProfile.stress_response
  };
}

module.exports = {
  ZODIAC_NAME_MAP,
  EN_TO_TR_ZODIAC,
  ELEMENT_MAP,
  MODALITY_MAP,
  PLANET_MAP,
  ZODIAC_PROFILE_EN_MAP,
  EXACT_EVENTS_EN,
  toCanonicalTurkishZodiac,
  toCanonicalEnglishZodiac,
  getZodiacFromDate,
  translateAstrologyEventName,
  translateAstrologyEvent,
  translateZodiacProfile
};
