/**
 * Emotional Entries Content Classification & Read-Time Localization
 * 
 * Rules:
 * 1. User-authored content (journal text, journal title, check-in notes, free-form text)
 *    MUST NEVER be translated, deleted, hidden, or filtered.
 * 2. Only Selfplace-generated fields (card titles, default card action content,
 *    system reflection labels, emotion labels) are localized at read-time.
 * 3. Historical entries never disappear when switching languages.
 */

const CARD_EN_MAP = {
  'Küçük Bir Nezaket': { title: 'Gentle Kindness', content: 'Do a small, gentle thing for yourself today.' },
  'İç Sesin': { title: 'Your Inner Voice', content: 'Try speaking a bit more softly with your inner voice.' },
  'Sessizlik Anı': { title: 'Moment of Silence', content: 'Open up a quiet 20-minute space for yourself today.' },
  'Küçük Bir Seçim': { title: 'A Small Choice', content: 'Make a small choice without putting yourself second.' },
  'Nazik Bir Başlangıç': { title: 'A Gentle Start', content: 'Begin gently today with something you have postponed.' },
  'Sessiz İfade': { title: 'Quiet Expression', content: 'Try calmly expressing a thought you usually keep inside.' },
  'Çocukluk Anısı': { title: 'Childhood Memory', content: 'Recall something you loved as a child, even if small.' },
  'Amaçsız Yürüyüş': { title: 'Aimless Walk', content: 'Try taking a short, aimless walk.' },
  'Tetikleyici': { title: 'The Trigger', content: 'What might be triggering you today?' },
  'Zihin Akışı': { title: 'Mind Flow', content: 'Is there something you have been overthinking lately?' },
  'Dinlenme Hakkı': { title: 'Permission to Rest', content: 'Try viewing rest as something you truly deserve today.' },
  'Kısa Bir Mola': { title: 'A Short Pause', content: 'Give yourself permission to take a brief pause.' },
};

const EMOTIONS_EN_MAP = {
  'Mutlu': 'Happy',
  'Sakin': 'Calm',
  'Motive': 'Motivated',
  'Hassas': 'Sensitive',
  'Yorgun': 'Tired',
  'Kızgın': 'Angry',
  'Üzgün': 'Sad',
  'Kaygılı': 'Anxious',
};

const SYSTEM_PROMPTS_EN_MAP = {
  'Günlük Küçük Yansıma': 'Daily Micro Reflection',
  'Gelişmiş Paylaşım': 'Advanced Reflection',
  'Günlük Check-in': 'Daily Check-in',
  'Bugün seni en çok ne etkiledi?': 'What affected you most today?',
  'Bugün kendine nasıl davrandın?': 'How did you treat yourself today?',
  'Son zamanlarda aklında kalan bir şey var mı?': 'Has anything been lingering on your mind lately?',
  'Bugün kendine karşı biraz daha nazik olabildin mi?': 'Were you able to be a bit gentler with yourself today?',
  'Bugün neye ihtiyaç duyduğunu fark ettin mi?': 'Did you notice what you needed today?',
  'Şu an bedeninde ne hissediyorsun?': 'What are you feeling in your body right now?',
  'Bugün seni gülümseten küçük bir şey oldu mu?': 'Was there a small thing that made you smile today?',
  'Kendine bugün bir teşekkür etsen, bu ne için olurdu?': 'If you were to thank yourself today, what would it be for?',
};

const CARD_DEFAULT_CONTENT_EN_MAP = {
  'Bu kartı bugün için seçtim.': 'I chose this card for today.',
  'Seçildi': 'Selected',
};

/**
 * Localizes an emotional entry for read-time consumption.
 * Preserves user-authored content completely.
 * 
 * @param {Object} entry Database row from emotional_entries
 * @param {boolean} isEn Whether response should be English
 * @returns {Object} Localized entry
 */
function localizeEmotionalEntry(entry, isEn) {
  if (!entry || !isEn) return entry;

  const localized = { ...entry };

  // 1. Localize emotion label (System taxonomy)
  if (localized.emotion && EMOTIONS_EN_MAP[localized.emotion]) {
    localized.emotion = EMOTIONS_EN_MAP[localized.emotion];
  }

  // 2. Classify by source_type
  switch (localized.source_type) {
    case 'card': {
      // Prompt is the card title (Selfplace-generated)
      if (localized.prompt && CARD_EN_MAP[localized.prompt]) {
        localized.prompt = CARD_EN_MAP[localized.prompt].title;
      }
      // Content: Only map if it's the system default action template;
      // if user wrote custom content, NEVER change it!
      if (localized.content && CARD_DEFAULT_CONTENT_EN_MAP[localized.content.trim()]) {
        localized.content = CARD_DEFAULT_CONTENT_EN_MAP[localized.content.trim()];
      }
      break;
    }

    case 'checkin': {
      // Prompt: check-in question / system header
      if (localized.prompt && SYSTEM_PROMPTS_EN_MAP[localized.prompt]) {
        localized.prompt = SYSTEM_PROMPTS_EN_MAP[localized.prompt];
      }
      // Content: USER-AUTHORED check-in note -> Keep completely untouched!
      break;
    }

    case 'journal': {
      // User-authored journal content & title -> Keep completely untouched!
      break;
    }

    case 'reflection': {
      // Prompt: System reflection prompt header
      if (localized.prompt && SYSTEM_PROMPTS_EN_MAP[localized.prompt]) {
        localized.prompt = SYSTEM_PROMPTS_EN_MAP[localized.prompt];
      }
      // If content is pure user-authored answer, keep untouched.
      // If content has question prefix like "Bugün seni ne mutlu etti?: ...",
      // we do not touch user's text.
      break;
    }

    default:
      // Unknown source type: leave content untouched
      break;
  }

  return localized;
}

module.exports = {
  CARD_EN_MAP,
  EMOTIONS_EN_MAP,
  SYSTEM_PROMPTS_EN_MAP,
  localizeEmotionalEntry,
};
