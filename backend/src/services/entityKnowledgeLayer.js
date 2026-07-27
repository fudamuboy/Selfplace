/**
 * Entity Knowledge Layer (EKL)
 * ============================================================
 * Provides real-world entity intelligence to the Conversation
 * Brain before it generates a response.
 *
 * The Brain is responsible for empathy, tone, and conversation.
 * EKL is responsible for verified factual knowledge.
 *
 * Pipeline:
 *   Stage 1 — Entity Detector      (detectEntities)
 *   Stage 2 — Entity Classifier    (classifyEntity)
 *   Stage 3 — Knowledge Cache      (EKLCache)
 *   Stage 4 — Two-Tier Provider    (routeToProvider)
 *               └─ Tier A: Internal Knowledge  (gpt-4o-mini, fast)
 *               └─ Tier B: Web Search          (gpt-4o-search-preview, real-time)
 *
 * Entity types supported:
 *   place | city | country | landmark | museum | university |
 *   company | brand | product | organization | sports_team |
 *   airport | hotel | restaurant | cafe | monument |
 *   tourist_attraction | shopping_mall | public_institution | general
 *
 * Output schema:
 * {
 *   entityFound:   boolean,
 *   entityType:    string,
 *   canonicalName: string|null,
 *   summary:       string|null,
 *   city:          string|null,
 *   district:      string|null,
 *   confidence:    number,           // 0–1, blended detection + retrieval
 *   sourceType:    string,           // cache | internal_knowledge | web_search | none
 *   freshness:     string            // fresh | cached | stale
 * }
 */

'use strict';

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Constants ────────────────────────────────────────────────

/** Minimum detection confidence to trigger a knowledge lookup. */
const DETECTION_THRESHOLD = 0.40;

/** Minimum blended confidence to include the EKL block in the prompt. */
const RETRIEVAL_THRESHOLD = 0.45;

/**
 * Internal knowledge confidence threshold.
 * If gpt-4o-mini's confidence is at or above this value, we trust
 * its training data and skip the web search.
 * Below this → escalate to real-time web search.
 */
const INTERNAL_CONFIDENCE_THRESHOLD = 0.80;

/** Model used for internal (training-data) knowledge lookups. */
const INTERNAL_MODEL = 'gpt-4o-mini';

/** Model used for real-time web search lookups. */
const WEB_SEARCH_MODEL = 'gpt-4o-search-preview';

// ─── Stage 3: Knowledge Cache ─────────────────────────────────

const CACHE_CONFIG = {
  /** Time-to-live in milliseconds. Default: 1 hour. */
  TTL_MS: 60 * 60 * 1000,
  /**
   * Fraction of TTL after which a cache entry is considered "stale".
   * A stale entry is still served but the Brain uses softer wording.
   */
  STALE_FRACTION: 0.75,
  /** Interval for the background sweep that removes expired entries. */
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000,
};

/**
 * EKLCache
 * In-memory knowledge cache scoped to the current server process.
 * Only successful lookups (entityFound: true) are cached.
 */
class EKLCache {
  constructor(config = CACHE_CONFIG) {
    this._store = new Map();
    this._ttl = config.TTL_MS;
    this._staleFraction = config.STALE_FRACTION;
    this._cleanupTimer = setInterval(() => this._sweep(), config.CLEANUP_INTERVAL_MS);
    if (this._cleanupTimer.unref) this._cleanupTimer.unref();
  }

  _key(entityName) {
    return entityName.trim().toLowerCase();
  }

  get(entityName) {
    const key = this._key(entityName);
    const entry = this._store.get(key);
    if (!entry) return null;

    const ageMs = Date.now() - entry.cachedAt;
    if (ageMs >= this._ttl) {
      this._store.delete(key);
      return null;
    }

    const isStale = ageMs >= this._ttl * this._staleFraction;
    return { knowledge: entry.knowledge, freshness: isStale ? 'stale' : 'cached' };
  }

  set(entityName, knowledge) {
    this._store.set(this._key(entityName), { knowledge, cachedAt: Date.now() });
  }

  _sweep() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this._store.entries()) {
      if (now - entry.cachedAt >= this._ttl) {
        this._store.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      // Swept expired entries
    }
  }

  get size() { return this._store.size; }
}

const _cache = new EKLCache();

// ─── Stage 1: Entity Detector ─────────────────────────────────

/**
 * Context signals that raise entity detection confidence.
 * Covers: location, visit, work, purchase, inquiry, and general reference.
 */
const ENTITY_CONTEXT_SIGNALS = [
  // Location / Visit
  'gittim', 'gidiyorum', 'gideceğim', 'geldim', 'geliyorum',
  'ziyaret ettim', 'ziyaret ediyorum', 'ziyaret edeceğim',
  'buluşacağız', 'buluşuyoruz', 'buluşalım',
  'yakınında', 'yanında', 'karşısında', 'önünde', 'içinde',
  'nerede', 'nerededir', 'nasıl bir yer', 'nasıl bir',
  // Work / Study
  'çalışıyorum', 'çalışıyordum', 'çalışacağım', 'çalışıyorduk',
  'okuyorum', 'okudum', 'mezun oldum', 'mezun olacağım',
  'staj yapıyorum', 'staj yaptım',
  'yaşıyorum', 'yaşıyordum', 'oturuyorum',
  // Purchase / Ownership (brand/product signals)
  'aldım', 'satın aldım', 'sipariş ettim', 'kullanıyorum',
  'kullandım', 'kullanıyordum', 'var bende', 'var mı',
  'inceleme', 'review', 'kaç para', 'fiyatı ne',
  // Inquiry / Reference
  'biliyor musun', 'tanıyor musun', 'duydun mu', 'haberin var mı',
  'hakkında', 'ile ilgili', 'ne düşünüyorsun', 'ne dersin',
  'tavsiye eder misin', 'gitmiş miydin', 'gittiniz mi',
  'nedir', 'kim kurdu', 'ne zaman kuruldu', 'kaç yıllık',
  // English equivalents
  'i work at', 'i went to', 'i live near', 'i visited',
  'near', 'next to', 'across from', 'i bought', 'i use',
  'have you heard', 'what is', 'where is', 'tell me about',
];

const QUESTION_PATTERNS = [
  'nerede?', 'nasıl bir yer?', 'nedir?', 'ne kadar?', 'kim?',
  'tavsiye eder misin', 'gitmiş miydin', 'gittiniz mi',
  'what is', 'where is', 'have you been', 'who is', 'what does',
];

/**
 * detectEntities
 * Scans a user message for likely proper noun entity candidates.
 *
 * @param {string} message
 * @returns {{ candidates: string[], confidence: number } | null}
 */
function detectEntities(message) {
  if (!message || message.trim().length < 3) return null;

  const text = message.trim();

  // ── 1. Extract capitalized proper noun sequences ───────────
  const properNounRegex = /(?<![a-zA-ZçğışöüÇĞİÖŞÜ])([A-ZÇĞİÖŞÜ][a-zA-ZçğışöüÇĞİÖŞÜ]+(?:\s+[A-ZÇĞİÖŞÜ][a-zA-ZçğışöüÇĞİÖŞÜ]+){0,4})(?![a-zA-ZçğışöüÇĞİÖŞÜ])/g;
  const rawMatches = [];
  let m;
  while ((m = properNounRegex.exec(text)) !== null) {
    rawMatches.push(m[1]);
  }

  // Common Turkish/English sentence-start words that are capitalized
  // only due to grammar, not because they are proper nouns.
  const STOPWORDS = new Set([
    'Ben', 'Sen', 'Biz', 'Siz', 'O', 'Onlar',
    'Bu', 'Şu', 'Bunlar', 'Şunlar', 'Hepsi', 'Herkes',
    'Bir', 'Ve', 'Ama', 'Fakat', 'Ancak', 'Çünkü', 'Yani', 'Hem',
    'Bugün', 'Dün', 'Yarın', 'Sabah', 'Akşam', 'Gece', 'Öğlen',
    'Sadece', 'Zaten', 'Hep', 'Hiç', 'Belki', 'Tabii', 'Evet', 'Hayır',
    'Çok', 'Az', 'Biraz', 'Bazı', 'Her', 'Hiçbir',
    'I', 'The', 'A', 'An', 'And', 'But', 'Or', 'So', 'Yet',
    'My', 'Your', 'His', 'Her', 'Our', 'Their',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    'Ok', 'Okay', 'Hey', 'Hi', 'Hello',
  ]);

  const candidates = [];

  for (const match of rawMatches) {
    const tokens = match.split(' ');
    const startIdx = tokens.findIndex(t => !STOPWORDS.has(t));
    if (startIdx === -1) continue;

    let phrase = tokens.slice(startIdx).join(' ');

    // Strip Turkish apostrophe suffixes (both ' U+0027 and ' U+2019)
    // e.g. "Beach'te" → "Beach", "Parkı'na" → "Parkı"
    phrase = phrase.replace(/['''](te|ta|de|da|ye|ya|e|a|i|ı|u|ü|nin|nın|nun|nün|nde|nda|ne|na|nı|yı|yü|yın|nın|dan|den|tan|ten|daki|deki|taki|teki|ya da|veya)$/i, '');

    if (phrase.length >= 2) {
      candidates.push(phrase);
    }
  }

  if (candidates.length === 0) return null;

  // ── 2. Confidence scoring ──────────────────────────────────
  let confidence = 0.25; // Base: a capitalized noun exists

  const lowerText = text.toLowerCase();

  // Strong boost: entity context signals (location, work, purchase, inquiry)
  const hasContextSignal = ENTITY_CONTEXT_SIGNALS.some(v => lowerText.includes(v));
  if (hasContextSignal) confidence += 0.30;

  // Boost: city/movement verbs that don't appear in ENTITY_CONTEXT_SIGNALS
  const hasMovementSignal = ['taşınıyorum', 'taşındım', 'taşınacağım', 'yerleştim', 'yerleşiyorum',
    'seyahat ettim', 'seyahat ediyorum', 'tur yaptım', 'keşfettim', 'döndüm'].some(v => lowerText.includes(v));
  if (hasMovementSignal) confidence += 0.25;

  // Boost: question patterns
  const hasQuestion = QUESTION_PATTERNS.some(p => lowerText.includes(p));
  if (hasQuestion) confidence += 0.20;

  // Boost: multi-word proper noun (e.g. "Aura Beach" vs "Ali")
  const hasMultiWord = candidates.some(c => c.includes(' '));
  if (hasMultiWord) confidence += 0.15;

  // Boost: Turkish apostrophe suffix — entity used in a sentence grammatically
  // e.g. "Beach'te", "Apple'ı", "Nike'nin"
  const hasSuffix = /[A-ZÇĞİÖŞÜa-zA-ZçğışöüÇĞİÖŞÜ0-9][''](te|ta|de|da|ye|ya|e|a|i|ı|u|ü|nin|nın|nun|nün|nde|nda|ne|na|nı|yı|yü|dan|den)\b/.test(text);
  if (hasSuffix) confidence += 0.10;

  confidence = Math.min(confidence, 1.0);


  return { candidates, confidence };
}

// ─── Stage 2: Entity Classifier ───────────────────────────────

/**
 * Expanded entity type taxonomy with 19 types.
 * Rules are checked in order; first match wins.
 * More specific types come before broader ones.
 */
const CLASSIFICATION_RULES = [
  // ── Infrastructure ──────────────────────────────────────────
  {
    type: 'airport',
    keywords: ['havalimanı', 'havaalanı', 'airport', 'terminal havalimanı', 'uluslararası havalimanı'],
  },
  // ── Sports (before tourist_attraction to avoid Saray match) ──
  {
    type: 'sports_team',
    keywords: ['spor kulübü', 'futbol kulübü', 'basketbol takımı', ' fc', ' sk', ' jsk', ' bk',
               'galatasaray', 'fenerbahçe', 'beşiktaş', 'trabzonspor', 'bursaspor', 'başakşehir'],
  },
  // ── Accommodation ───────────────────────────────────────────
  {
    type: 'hotel',
    // Includes both descriptor words AND well-known hotel chain brand names
    keywords: ['otel', 'hotel', 'resort', 'motel', 'apart otel', 'boutique hotel', 'inn', 'lodge',
               'hilton', 'marriott', 'sheraton', 'hyatt', 'intercontinental', 'radisson', 'novotel',
               'swissôtel', 'swissotel', 'ritz', 'four seasons', 'kempinski', 'wyndham', 'ibis',
               'mövenpick', 'movenpick', 'renaissance hotel', 'doubletree'],
  },
  // ── Food & Beverage ─────────────────────────────────────────
  {
    type: 'restaurant',
    keywords: ['restoran', 'restaurant', 'bistro', 'steakhouse', 'döner', 'kebap', 'lokanta', 'eatery', 'brasserie'],
  },
  {
    type: 'cafe',
    keywords: ['cafe', 'kafé', 'kahve', 'kahvesi', 'coffee', 'coffeehouse', 'pub', 'lounge', 'patisserie', 'pastane', 'bar '],
  },
  // ── Culture & Tourism ────────────────────────────────────────
  {
    type: 'museum',
    keywords: ['müze', 'museum', 'galeri', 'gallery', 'sergi merkezi'],
  },
  {
    type: 'monument',
    keywords: ['anıt', 'monument', 'heykel', 'statue', 'türbe', 'mausoleum', 'anıtkabir', 'mezar', 'anıt mezar'],
  },
  {
    type: 'tourist_attraction',
    keywords: ['saray', 'palace', 'castle', 'kale', 'tarihi', 'ören yeri', 'antik', 'ancient', 'arkeolojik', 'archaeological'],
  },
  {
    type: 'landmark',
    // Removed 'boğaz'/'strait' — those belong to geography, not architectural landmarks
    keywords: ['köprü', 'bridge', 'kule', 'tower', 'meydan', 'square', 'şelale', 'waterfall', 'sahil şeridi'],
  },
  // ── Retail ──────────────────────────────────────────────────
  {
    type: 'shopping_mall',
    keywords: ['mall', 'avm', 'alışveriş merkezi', 'shopping center', 'shopping centre', 'shopping mall',
               'center', 'centre', 'plaza', 'çarşı', 'kapalı çarşı', 'bazaar'],

  },
  // ── Education ───────────────────────────────────────────────
  {
    type: 'university',
    keywords: ['üniversite', 'university', 'üniversitesi', 'fakülte', 'yüksekokul', 'kolej', 'college', 'enstitü', 'institute', 'akademi', 'academy'],
  },
  // ── Sports ──────────────────────────────────────────────────
  {
    type: 'sports_team',
    keywords: ['spor kulübü', 'futbol kulübü', 'basketbol takımı', ' fc', ' sk', ' jsk', ' bk',
               'galatasaray', 'fenerbahçe', 'beşiktaş', 'trabzonspor', 'bursaspor', 'başakşehir'],
  },
  // ── Civil Society ────────────────────────────────────────────
  {
    type: 'organization',
    keywords: ['vakıf', 'vakfı', 'vakfına', 'vakfında', 'dernek', 'derneği', 'foundation', 'association',
               'ngo', 'sivil toplum', 'örgüt', 'birlik', 'birliği', 'union', 'federasyon', 'federation', 'konfederasyon'],
  },
  // ── Public Sector ───────────────────────────────────────────
  {
    type: 'public_institution',
    keywords: ['bakanlık', 'ministry', 'belediye', 'municipality', 'il müdürlüğü', 'devlet', 'kamu',
               'hastane', 'hospital', 'klinik', 'clinic', 'sağlık merkezi', 'okul', 'ilkokul', 'ortaokul', 'lise', 'high school'],
  },
  // ── Consumer Brands & Products ──────────────────────────────
  {
    type: 'brand',
    keywords: ['apple', 'samsung', 'nike', 'adidas', 'zara', 'h&m', 'ikea', 'starbucks', 'mcdonalds',
               'burger king', 'kfc', 'amazon', 'google', 'microsoft', 'tesla', 'netflix', 'spotify',
               'mango', 'bershka', 'pull&bear', 'lcw', 'koton', 'boyner'],
  },
  {
    type: 'product',
    keywords: ['iphone', 'ipad', 'macbook', 'airpods', 'galaxy', 'pixel', 'playstation', 'xbox',
               'nintendo', 'model s', 'model 3', 'kindle', 'alexa', 'echo', 'surface'],
  },
  // ── Business ─────────────────────────────────────────────────
  {
    type: 'company',
    keywords: ['a.ş.', 'anonim şirket', 'holding', 'group', 'grup', 'inc.', 'ltd.', 'corp.',
               'şirketi', 'teknoloji şirketi', 'bank', 'banka', 'sigorta', 'insurance',
               'şirket', 'company', 'corporation', 'enterprises', 'industries'],
  },
  // ── Geography ────────────────────────────────────────────────
  {
    type: 'city',
    keywords: ['istanbul', 'ankara', 'izmir', 'antalya', 'bursa', 'adana', 'gaziantep', 'konya',
               'london', 'paris', 'new york', 'berlin', 'rome', 'tokyo', 'dubai', 'barcelona',
               'şehri', 'city of', 'büyükşehir'],
  },
  {
    type: 'country',
    keywords: ['türkiye', 'turkey', 'germany', 'almanya', 'france', 'fransa', 'italy', 'italya',
               'usa', 'america', 'england', 'uk', 'ingiltere', 'spain', 'ispanya', 'japan', 'japonya',
               'ülkesi', 'cumhuriyeti', 'republic of'],
  },
  // ── Outdoor & Nature ─────────────────────────────────────────
  {
    type: 'place',
    keywords: [
      'beach', 'plaj', 'sahil', 'koy', 'koyu', 'körfez', 'göl', 'nehir', 'dağ', 'mountain', 'tepe', 'hill',
      'park', 'bahçe', 'garden', 'orman', 'forest', 'milli park', 'national park',
      'mahalle', 'semt', 'ilçe', 'sokak', 'cadde', 'bulvar', 'street', 'avenue',
      'club', 'kulüp', 'marina', 'liman', 'harbor', 'iskele', 'pier',
      'stadyum', 'stadium', 'arena', 'spor salonu',
    ],
  },
];

/**
 * classifyEntity
 * Returns an entityType for a candidate name.
 *
 * @param {string} candidateName
 * @returns {string} entityType
 */
function classifyEntity(candidateName) {
  const lower = candidateName.toLowerCase();

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.type;
    }
  }

  return 'general';
}

// ─── Stage 4: Two-Tier Knowledge Provider ─────────────────────

/**
 * Provider routing table.
 * Maps entityType to preferred provider strategy.
 * 'two_tier'  → try internal knowledge first, web search if confidence is low
 * 'none'      → skip lookup entirely
 */
const PROVIDER_ROUTES = {
  place:              'two_tier',
  city:               'two_tier',
  country:            'two_tier',
  landmark:           'two_tier',
  museum:             'two_tier',
  university:         'two_tier',
  company:            'two_tier',
  brand:              'two_tier',
  product:            'two_tier',
  organization:       'two_tier',
  sports_team:        'two_tier',
  airport:            'two_tier',
  hotel:              'two_tier',
  restaurant:         'two_tier',
  cafe:               'two_tier',
  monument:           'two_tier',
  tourist_attraction: 'two_tier',
  shopping_mall:      'two_tier',
  public_institution: 'two_tier',
  general:            'two_tier',
  unknown:            'none',
};

// ── Internal Knowledge (Tier A) ────────────────────────────────

/**
 * fetchInternalKnowledge
 * Uses GPT-4o-mini's training data to answer.
 * Returns the result with a self-reported confidence score.
 * If confidence < INTERNAL_CONFIDENCE_THRESHOLD, the caller
 * escalates to web search.
 *
 * @param {string} entityName
 * @param {string} entityType
 * @returns {Promise<object>}
 */
async function fetchInternalKnowledge(entityName, entityType) {
  const prompt = `You are a factual knowledge retrieval assistant.
A user mentioned "${entityName}" which appears to be a ${entityType}.

Use your training knowledge to identify this entity and return a JSON object:
{
  "entityFound": boolean,
  "canonicalName": string or null,
  "summary": string or null,
  "city": string or null,
  "district": string or null,
  "confidence": number
}

Confidence scoring rules:
- 0.90–1.00: You are very certain. This is a well-known, widely documented entity.
- 0.70–0.89: You are reasonably confident but may be missing recent details.
- 0.50–0.69: You recognize the name but are uncertain about key details.
- 0.00–0.49: You cannot confidently identify this entity. Set entityFound to false.

Additional rules:
- summary: 1–2 sentences in Turkish, natural and concise.
- canonicalName: official/correct full name if different from what was typed.
- Never invent details. If uncertain, lower confidence.
- Return ONLY the JSON object, no markdown.`;

  const completion = await openai.chat.completions.create({
    model: INTERNAL_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 300,
  });

  return JSON.parse(completion.choices[0].message.content);
}

// ── Web Search (Tier B) ────────────────────────────────────────

/**
 * fetchWebSearch
 * Performs a real-time web search using gpt-4o-search-preview,
 * then structures the result into our schema using gpt-4o-mini.
 *
 * Two-call pipeline:
 *   Call 1 → gpt-4o-search-preview (raw factual text + citations)
 *   Call 2 → gpt-4o-mini with json mode (structure the raw text)
 *
 * @param {string} entityName
 * @param {string} entityType
 * @returns {Promise<object>}
 */
async function fetchWebSearch(entityName, entityType) {
  // Call 1: Real-time web search — get raw factual content
  const searchCompletion = await openai.chat.completions.create({
    model: WEB_SEARCH_MODEL,
    messages: [
      {
        role: 'user',
        content: `"${entityName}" hakkında kısa ve güncel bilgi ver. Bu bir ${entityType} türünde bir varlık olabilir. Türkçe veya İngilizce olarak, doğrulayabildiğin gerçekleri paylaş: resmi adı, konumu (şehir, ilçe), kısa açıklaması. 2-3 cümle yeterli.`,
      },
    ],
    max_tokens: 400,
  });

  const rawText = searchCompletion.choices[0].message.content || '';

  if (!rawText || rawText.length < 10) {
    return { entityFound: false, confidence: 0 };
  }

  // Call 2: Structure the raw search result into our schema
  const structureCompletion = await openai.chat.completions.create({
    model: INTERNAL_MODEL,
    messages: [
      {
        role: 'user',
        content: `Aşağıdaki metin "${entityName}" adlı ${entityType} hakkında bir web araması sonucudur.

Metin:
"""
${rawText}
"""

Bu metni analiz et ve şu JSON şemasını doldur:
{
  "entityFound": boolean,
  "canonicalName": string or null,
  "summary": string or null,
  "city": string or null,
  "district": string or null,
  "confidence": number
}

Kurallar:
- entityFound: gerçek bir varlık bulundu mu?
- summary: 1-2 cümle, doğal Türkçe, web metninden özet.
- confidence: metindeki bilginin güvenilirliği (0.0–1.0). Metin iyi ve açıksa 0.80+.
- Yalnızca JSON nesnesi döndür, başka açıklama ekleme.`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 300,
  });

  const structured = JSON.parse(structureCompletion.choices[0].message.content);

  // Sanity check: if the returned canonicalName is radically different from
  // what we queried, treat it as a non-match to prevent hallucinated near-matches.
  if (structured.entityFound && structured.canonicalName) {
    const queriedLower = entityName.toLowerCase();
    const returnedLower = structured.canonicalName.toLowerCase();
    // Check if at least one word from the query appears in the returned name
    const queryWords = queriedLower.split(/\s+/).filter(w => w.length > 2);
    const hasOverlap = queryWords.some(w => returnedLower.includes(w));
    if (!hasOverlap) {
      // Treat as not found to prevent hallucinated near-matches
      return { entityFound: false, confidence: 0 };
    }
  }

  return structured;
}

// ── Provider Orchestrator ──────────────────────────────────────

/**
 * routeToProvider
 * Two-tier knowledge retrieval:
 *   Tier A (fast): Internal model knowledge
 *   Tier B (real-time): Web search (only if Tier A confidence is insufficient)
 *
 * @param {string} entityName
 * @param {string} entityType
 * @returns {Promise<{ result: object, sourceType: string }>}
 */
async function routeToProvider(entityName, entityType) {
  const strategy = PROVIDER_ROUTES[entityType] || 'two_tier';

  if (strategy === 'none') {
    return { result: null, sourceType: 'none' };
  }

  // ── Tier A: Internal Knowledge ─────────────────────────────
  let internalResult = null;
  try {
    internalResult = await fetchInternalKnowledge(entityName, entityType);
  } catch (err) {
    console.error(`[EKL] Internal knowledge fetch failed for "${entityName}":`, err.message);
  }

  const internalConfidence = internalResult?.confidence ?? 0;
  const internalFound = internalResult?.entityFound === true;

  if (internalFound && internalConfidence >= INTERNAL_CONFIDENCE_THRESHOLD) {
    return { result: internalResult, sourceType: 'internal_knowledge' };
  }

  // ── Tier B: Web Search ─────────────────────────────────────

  try {
    const webResult = await fetchWebSearch(entityName, entityType);

    if (webResult && webResult.entityFound && (webResult.confidence ?? 0) > internalConfidence) {
      return { result: webResult, sourceType: 'web_search' };
    }

    // Web search found less or equal — fall back to internal if it found anything
    if (internalFound) {
      return { result: internalResult, sourceType: 'internal_knowledge' };
    }

    // Web search is the best we have
    return { result: webResult || internalResult, sourceType: 'web_search' };

  } catch (err) {
    console.error(`[EKL] Web search failed for "${entityName}":`, err.message);

    // Web search unavailable — use internal knowledge regardless of confidence
    if (internalResult && internalFound) {
      return { result: internalResult, sourceType: 'internal_knowledge' };
    }

    return { result: internalResult, sourceType: 'internal_knowledge' };
  }
}

// ─── Orchestrator ─────────────────────────────────────────────

/**
 * getEntityKnowledge
 * Main export. Runs the full EKL pipeline for a user message.
 *
 *   Detector → Classifier → Cache → Provider → return
 *
 * Returns null if no detectable entity (fast path — no external calls).
 *
 * @param {string} message
 * @returns {Promise<object|null>}
 */
async function getEntityKnowledge(message) {
  try {
    // ── Stage 1: Detect ────────────────────────────────────
    const detection = detectEntities(message);

    if (!detection || detection.confidence < DETECTION_THRESHOLD) {
      return null;
    }

    // Best candidate: prefer longest (most specific) proper noun phrase
    const bestCandidate = detection.candidates
      .sort((a, b) => b.split(' ').length - a.split(' ').length)[0];

    // ── Stage 2: Classify ──────────────────────────────────
    const entityType = classifyEntity(bestCandidate);

    // ── Stage 3: Cache lookup ──────────────────────────────
    const cached = _cache.get(bestCandidate);
    if (cached) {
      return { ...cached.knowledge, freshness: cached.freshness, sourceType: 'cache' };
    }


    // ── Stage 4: Provider (Two-Tier) ───────────────────────
    const { result, sourceType } = await routeToProvider(bestCandidate, entityType);

    if (!result || !result.entityFound) {
      // Do NOT cache negative results — a failed lookup today may succeed later
      return {
        entityFound: false,
        entityType,
        canonicalName: null,
        summary: null,
        city: null,
        district: null,
        confidence: 0,
        sourceType,
        freshness: 'fresh',
      };
    }

    // Blend detection + retrieval confidence
    const blendedConfidence = parseFloat(
      ((detection.confidence * 0.30) + ((result.confidence ?? 0) * 0.70)).toFixed(2)
    );

    if (blendedConfidence < RETRIEVAL_THRESHOLD) {
      return null;
    }

    const knowledge = {
      entityFound: true,
      entityType,
      canonicalName: result.canonicalName || bestCandidate,
      summary:       result.summary       || null,
      city:          result.city          || null,
      district:      result.district      || null,
      confidence:    blendedConfidence,
      sourceType,
      freshness: 'fresh',
    };

    // Cache successful lookups for subsequent requests
    _cache.set(bestCandidate, knowledge);

    return knowledge;

  } catch (err) {
    // Never let EKL failures block the main chat response
    console.error('[EKL] Error — failing silently:', err.message);
    return null;
  }
}

// ─── Exports ──────────────────────────────────────────────────

module.exports = {
  getEntityKnowledge,
  // Exported individually for unit testing
  detectEntities,
  classifyEntity,
  routeToProvider,
  // Cache exposed for diagnostics / testing only
  _cache,
  CACHE_CONFIG,
};
