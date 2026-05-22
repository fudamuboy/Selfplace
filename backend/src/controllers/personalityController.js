const db = require('../config/db');

// --- Test Definitions (Poetic & Soft) ---

const COLOR_TEST = {
  id: 'color',
  title: 'Ruhunun Renkleri',
  description: 'Şu an iç dünyanda hangi renklerin daha baskın olduğunu keşfet.',
  questions: [
    {
      id: 'c1',
      text: 'Gözlerini kapattığında güvende hissettiğin yer neresi?',
      options: [
        { text: 'Sessiz ve derin bir okyanus kıyısı', value: 'blue' },
        { text: 'Güneşin ısıttığı geniş bir çayır', value: 'yellow' },
        { text: 'Sık ağaçlarla kaplı, korunaklı bir orman', value: 'green' },
        { text: 'Yıldızların altında, sıcak bir kamp ateşi', value: 'red' }
      ]
    },
    {
      id: 'c2',
      text: 'Bir duygu seline kapıldığında genellikle ne yaparsın?',
      options: [
        { text: 'İçime çekilir, dalgaların dinmesini beklerim', value: 'blue' },
        { text: 'Birine anlatır, paylaşarak hafiflerim', value: 'yellow' },
        { text: 'Sebep aramaya başlar, köklerine inmek isterim', value: 'green' },
        { text: 'Duyguyu sonuna kadar, tüm bedeniyle yaşarım', value: 'red' }
      ]
    },
    {
      id: 'c3',
      text: 'Hayatındaki belirsizlikler sana nasıl hissettirir?',
      options: [
        { text: 'Hafif bir ürperti, ama kabullenirim', value: 'blue' },
        { text: 'Yeni ihtimallerin heyecanını duyarım', value: 'yellow' },
        { text: 'Kontrolü sağlamak için bir plan yapma ihtiyacı', value: 'green' },
        { text: 'Biraz telaş, ama hemen eyleme geçme isteği', value: 'red' }
      ]
    },
    {
      id: 'c4',
      text: 'Kendinle baş başa kaldığın bir akşamda sana en iyi ne gelir?',
      options: [
        { text: 'Derin bir sessizlik ve hafif bir müzik', value: 'blue' },
        { text: 'Güzel bir hayal kurmak ve gülümsemek', value: 'yellow' },
        { text: 'Bir şeyler yazmak veya okumak', value: 'green' },
        { text: 'Hareket etmek, yürüyüşe çıkmak', value: 'red' }
      ]
    }
  ],
  results: {
    blue: {
      title: 'Gece Mavisi Sessizliği',
      description: 'İç dünyan şu sıralar derin, sakin ve kendi içine dönük. Duygularını sindirmek, sessizliğin içinde kendini duymak istiyorsun. Bu bir kaçış değil, bir yenilenme süreci.',
      color: '#3B82F6'
    },
    yellow: {
      title: 'Sabah Güneşi Sıcaklığı',
      description: 'Ruhun şu an dışa dönük, umutlu ve bağlantı arayışında. İçindeki ışığı paylaşmak ve çevrenden enerji almak istiyorsun. Kendini ihtimallere açık tutuyorsun.',
      color: '#FBBF24'
    },
    green: {
      title: 'Orman Yeşili Dengesi',
      description: 'Köklenmeye, anlaşılmaya ve huzura ihtiyaç duyuyorsun. Zihnin her şeyi bir düzene oturtmaya çalışıyor. Büyümek için sağlam bir zemine ihtiyacın var.',
      color: '#10B981'
    },
    red: {
      title: 'Kamp Ateşi Kıvılcımı',
      description: 'İçinde yoğun, canlı ve hareketli bir enerji var. Belki bir tutku, belki küçük bir öfke... Duygularını tüm gerçekliğiyle, cesurca yaşıyorsun.',
      color: '#EF4444'
    }
  }
};

const MBTI_TEST = {
  id: 'mbti',
  title: 'İçsel Pusulan',
  description: 'Dünyayı algılama ve karar verme şeklini anlamak için küçük bir yolculuk.',
  questions: [
    {
      id: 'm1',
      trait: 'E_I',
      text: 'Uzun ve yorucu bir günün ardından enerjini nasıl toplarsın?',
      options: [
        { text: 'Kendi başıma kalarak, sessizliğe sığınarak.', value: 'I' },
        { text: 'Sevdiğim insanlarla sohbet edip paylaşarak.', value: 'E' }
      ]
    },
    {
      id: 'm2',
      trait: 'S_N',
      text: 'Bir karar alırken genellikle neye güvenirsin?',
      options: [
        { text: 'Geçmiş deneyimlerime ve somut gerçeklere.', value: 'S' },
        { text: 'İçgüdülerime ve gelecekteki ihtimallere.', value: 'N' }
      ]
    },
    {
      id: 'm3',
      trait: 'T_F',
      text: 'Bir arkadaşın zor bir durumdayken ilk tepkin ne olur?',
      options: [
        { text: 'Ona problemi çözmesi için mantıklı yollar sunmak.', value: 'T' },
        { text: 'Önce duygularını anladığımı ve yanında olduğumu hissettirmek.', value: 'F' }
      ]
    },
    {
      id: 'm4',
      trait: 'J_P',
      text: 'Hayatın akışı içinde hangisi sana daha güvenli hissettirir?',
      options: [
        { text: 'Planlı olmak ve ne olacağını bilmek.', value: 'J' },
        { text: 'Esnek olmak ve duruma göre uyum sağlamak.', value: 'P' }
      ]
    },
    {
      id: 'm5',
      trait: 'E_I',
      text: 'Kalabalık bir ortamda genellikle nerede hissedersin kendini?',
      options: [
        { text: 'Olayların merkezinde, sohbeti başlatan tarafta.', value: 'E' },
        { text: 'Biraz daha kenarda, gözlemleyen ve dinleyen tarafta.', value: 'I' }
      ]
    },
    {
      id: 'm6',
      trait: 'S_N',
      text: 'Yeni bir şey öğrenirken hangisini tercih edersin?',
      options: [
        { text: 'Adım adım, net detaylarla ilerlemeyi.', value: 'S' },
        { text: 'Önce büyük resmi ve anlamını kavramayı.', value: 'N' }
      ]
    },
    {
      id: 'm7',
      trait: 'T_F',
      text: 'Bir anlaşmazlık yaşadığında senin için hangisi daha önemlidir?',
      options: [
        { text: 'Kim haklıysa gerçeğin ortaya çıkması.', value: 'T' },
        { text: 'İlişkinin zarar görmemesi ve uyumun korunması.', value: 'F' }
      ]
    },
    {
      id: 'm8',
      trait: 'J_P',
      text: 'Bir yolculuğa çıkmadan önce hangisi sana daha çok uyar?',
      options: [
        { text: 'Gidilecek yerleri ve rotayı önceden belirlemek.', value: 'J' },
        { text: 'Rüzgarın estiği yöne gidip anın tadını çıkarmak.', value: 'P' }
      ]
    }
  ]
};

// Extremely simplified MBTI profile descriptions focusing on emotional tone
const MBTI_PROFILES = {
  INTJ: { title: 'Mimar', subtitle: 'Bağımsız ve Stratejik', description: 'Kendi iç dünyanda sağlam bir kalen var. Duygularını mantık süzgecinden geçirerek anlamlandırmayı seviyorsun.' },
  INTP: { title: 'Düşünür', subtitle: 'Meraklı ve Derin', description: 'Evrenin ve kendi zihninin sırlarını çözmek istiyorsun. Duygular bazen senin için çözülmesi gereken birer bulmaca gibidir.' },
  ENTJ: { title: 'Lider', subtitle: 'Cesur ve Kararlı', description: 'İçindeki gücü dışarıya yansıtmak konusunda doğal bir yeteneğin var. Duygularını hedeflerine ulaşmak için bir yakıt olarak kullanıyorsun.' },
  ENTP: { title: 'Tartışmacı', subtitle: 'Zeki ve Yenilikçi', description: 'Zihnin sürekli yeni ihtimallerle meşgul. Duygusal zorlukları bile zihinsel bir meydan okuma olarak görüp hızla adapte olabiliyorsun.' },
  INFJ: { title: 'Danışman', subtitle: 'Sezgisel ve Şefkatli', description: 'Başkalarının hislerini derinden anlayan, sessiz ama çok güçlü bir empati yeteneğin var. Kendi sınırlarını koruman önemli.' },
  INFP: { title: 'Arabulucu', subtitle: 'İdealist ve Şiirsel', description: 'Dünyayı kalbinin penceresinden izliyorsun. Çok zengin bir iç dünyan var ve her duygunun bir anlamı olduğuna inanıyorsun.' },
  ENFJ: { title: 'Önder', subtitle: 'İlham Verici ve Sıcak', description: 'İnsanlara dokunmak ve onları yükseltmek senin doğanda var. Etrafına yaydığın bu sıcaklık bazen kendi ihtiyaçlarını unutmana neden olabilir.' },
  ENFP: { title: 'Kampanyacı', subtitle: 'Coşkulu ve Özgür', description: 'Hayat senin için sonsuz bir keşif alanı. Duygularını renklice ve özgürce yaşıyor, çevrendekilere de bu özgürlüğü aşılıyorsun.' },
  ISTJ: { title: 'Lojistikçi', subtitle: 'Güvenilir ve Düzenli', description: 'Sessiz ve sağlam bir dayanaksın. Duygularını çok büyük sözlerle değil, sessiz ve güven veren eylemlerle ifade edersin.' },
  ISFJ: { title: 'Savunmacı', subtitle: 'Koruyucu ve İnce Ruhlu', description: 'Sevdiklerini korumak ve onlara güvenli bir alan yaratmak senin içgüdün. Bu nezaketini kendine de göstermeyi unutma.' },
  ESTJ: { title: 'Yönetici', subtitle: 'Pratik ve Sorumlu', description: 'Belirsizlikler yerine net olanı seversin. Hayatında düzen kurmak, duygusal dalgalanmaları yönetmenin en iyi yoludur senin için.' },
  ESFJ: { title: 'Konsolos', subtitle: 'Sosyal ve Yardımsever', description: 'Etrafındaki herkesin mutlu olması seni besliyor. Harmony ve uyum senin için çok önemli, duygusal dengeyi birlikte sağlarsın.' },
  ISTP: { title: 'Usta', subtitle: 'Gözlemci ve Mantıklı', description: 'Hayatı kendi akışında, anı yaşayarak deneyimliyorsun. Karmaşık duygulardansa, pratik ve anlık çözümleri tercih edersin.' },
  ISFP: { title: 'Maceracı', subtitle: 'Sanatkar ve Zarif', description: 'Kelimelerden çok, renkler, sesler ve hareketlerle kendini ifade etmeyi seviyorsun. İç dünyan oldukça yumuşak ve esnek.' },
  ESTP: { title: 'Girişimci', subtitle: 'Cesur ve Enerjik', description: 'Duygularının üstünde çok düşünmek yerine, onları doğrudan deneyimleyip geçmeyi seçiyorsun. Anı yaşamak en büyük ilacın.' },
  ESFP: { title: 'Eğlendirici', subtitle: 'Canlı ve Samimi', description: 'Hayat bir sahne ve sen onun keyfini çıkarıyorsun. Duygularını saklamaz, etrafındaki insanlarla hemen paylaşırsın.' }
};

/**
 * GET /api/personality/tests/:type
 * Get the test questions for 'color' or 'mbti'
 */
exports.getTest = async (req, res) => {
  const { type } = req.params;
  try {
    if (type === 'color') {
      res.json({ success: true, test: COLOR_TEST });
    } else if (type === 'mbti') {
      res.json({ success: true, test: MBTI_TEST });
    } else {
      res.status(404).json({ success: false, message: 'Test bulunamadı.' });
    }
  } catch (err) {
    console.error('[personalityController] getTest error:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
};

/**
 * POST /api/personality/tests/:type/submit
 * Submit test answers and get result
 */
exports.submitTest = async (req, res) => {
  const { type } = req.params;
  const { answers } = req.body; // e.g., { "c1": "blue", "c2": "red" }
  const userId = req.user.id;

  try {
    let resultData = {};

    if (type === 'color') {
      // Tally the colors
      const counts = { blue: 0, yellow: 0, green: 0, red: 0 };
      for (const key in answers) {
        if (counts[answers[key]] !== undefined) {
          counts[answers[key]]++;
        }
      }
      // Find the highest
      let dominant = 'blue';
      let maxCount = -1;
      for (const color in counts) {
        if (counts[color] > maxCount) {
          maxCount = counts[color];
          dominant = color;
        }
      }
      
      const resultObj = COLOR_TEST.results[dominant];
      resultData = {
        dominantColor: dominant,
        title: resultObj.title,
        description: resultObj.description,
        colorHex: resultObj.color,
        counts
      };

    } else if (type === 'mbti') {
      // Calculate MBTI
      const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
      for (const qId in answers) {
        const val = answers[qId];
        if (scores[val] !== undefined) scores[val]++;
      }
      
      const e_i = scores.E >= scores.I ? 'E' : 'I';
      const s_n = scores.S >= scores.N ? 'S' : 'N';
      const t_f = scores.T >= scores.F ? 'T' : 'F';
      const j_p = scores.J >= scores.P ? 'J' : 'P';
      
      const personalityType = `${e_i}${s_n}${t_f}${j_p}`;
      const profile = MBTI_PROFILES[personalityType] || MBTI_PROFILES['INFP']; // fallback
      
      resultData = {
        type: personalityType,
        title: profile.title,
        subtitle: profile.subtitle,
        description: profile.description,
        scores
      };
    } else {
      return res.status(404).json({ success: false, message: 'Test bulunamadı.' });
    }

    // Save to database
    const insertRes = await db.query(
      'INSERT INTO personality_results (user_id, test_type, result_data) VALUES ($1, $2, $3) RETURNING id',
      [userId, type, resultData]
    );

    res.json({
      success: true,
      result: resultData,
      id: insertRes.rows[0].id
    });

  } catch (err) {
    console.error('[personalityController] submitTest error:', err);
    res.status(500).json({ success: false, message: 'Sonuçlar kaydedilemedi.' });
  }
};

/**
 * GET /api/personality/history
 * Get user's past test results
 */
exports.getHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const historyRes = await db.query(
      'SELECT id, test_type, result_data, created_at FROM personality_results WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    // Group by test type
    const mbtiHistory = historyRes.rows.filter(r => r.test_type === 'mbti');
    const colorHistory = historyRes.rows.filter(r => r.test_type === 'color');

    res.json({
      success: true,
      mbti: mbtiHistory,
      color: colorHistory
    });
  } catch (err) {
    console.error('[personalityController] getHistory error:', err);
    res.status(500).json({ success: false, message: 'Geçmiş veriler alınamadı.' });
  }
};
