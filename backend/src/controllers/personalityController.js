const db = require('../config/db');

// --- 4-Color Personality Test (DISC Based) ---

const COLOR_TEST = {
  id: 'color',
  title: 'Ruhunun Renkleri',
  description: 'Dört temel renk üzerinden davranışlarını, iletişim tarzını ve içsel motivasyonlarını keşfet.',
  questions: [
    {
      id: 'c1',
      text: 'Bir grup projesinde çalışırken ilk odaklandığın şey nedir?',
      options: [
        { text: 'Hemen harekete geçmek ve hedefe ulaşmak', value: 'red' },
        { text: 'Herkesin fikrini almak ve uyumu sağlamak', value: 'green' },
        { text: 'Detaylı bir plan yapmak ve analiz etmek', value: 'blue' },
        { text: 'Yeni fikirler bulmak ve enerji katmak', value: 'yellow' }
      ]
    },
    {
      id: 'c2',
      text: 'Baskı ve stres altında hissettiğinde genellikle nasıl tepki verirsin?',
      options: [
        { text: 'Daha sessizleşir ve içime kapanırım', value: 'green' },
        { text: 'Hemen bir çözüm bulmaya ve kontrolü ele almaya çalışırım', value: 'red' },
        { text: 'Detaylara boğulur ve hata yapmaktan korkarım', value: 'blue' },
        { text: 'Aceleci davranır ve durumu şakaya vurmaya çalışırım', value: 'yellow' }
      ]
    },
    {
      id: 'c3',
      text: 'İnsanlarla iletişim kurarken tarzın nasıldır?',
      options: [
        { text: 'Heyecanlı, enerjik ve konuşkan', value: 'yellow' },
        { text: 'Dinleyici, sakin ve destekleyici', value: 'green' },
        { text: 'Net, doğrudan ve sonuca odaklı', value: 'red' },
        { text: 'Ölçülü, düşünceli ve gerçeklere dayalı', value: 'blue' }
      ]
    },
    {
      id: 'c4',
      text: 'Seni en çok ne motive eder?',
      options: [
        { text: 'Düzen, kesinlik ve kaliteyi yakalamak', value: 'blue' },
        { text: 'Başarı, zafer ve zorlukların üstesinden gelmek', value: 'red' },
        { text: 'Sosyal onay, eğlence ve yeni şeyler denemek', value: 'yellow' },
        { text: 'Güven, huzur ve başkalarına yardım etmek', value: 'green' }
      ]
    },
    {
      id: 'c5',
      text: 'Bir karar alman gerektiğinde nasıl bir yol izlersin?',
      options: [
        { text: 'İçgüdülerimle hızlıca karar veririm', value: 'yellow' },
        { text: 'Kararımın başkalarını nasıl etkileyeceğini düşünürüm', value: 'green' },
        { text: 'Tüm verileri toplar, avantaj ve dezavantajları tartar, öyle karar veririm', value: 'blue' },
        { text: 'Kararsızlık sevmem, en mantıklı olanı hemen seçerim', value: 'red' }
      ]
    },
    {
      id: 'c6',
      text: 'Çatışma veya tartışma anlarında ne yaparsın?',
      options: [
        { text: 'Tartışmadan kaçınır, orta yolu bulmaya çalışırım', value: 'green' },
        { text: 'Haklıysam sonuna kadar savunur, geri adım atmam', value: 'red' },
        { text: 'Duyguları bir kenara bırakır, gerçekler üzerinden konuşurum', value: 'blue' },
        { text: 'Gerginliği kırmak için konuyu değiştirmeye çalışırım', value: 'yellow' }
      ]
    }
  ],
  results: {
    red: {
      title: 'Güçlü Kırmızı',
      description: 'Lider, kararlı ve eylem odaklı bir yapıya sahipsin. Engeller seni korkutmaz, aksine motive eder.',
      color: '#EF4444',
      gradient: ['#EF4444', '#B91C1C'],
      strengths: ['Hızlı karar alma', 'Liderlik', 'Sonuç odaklılık', 'Cesaret'],
      weaknesses: ['Sabırsızlık', 'Bazen fazla buyurgan olma', 'Detayları gözden kaçırma'],
      relationship: 'Dürüst ve doğrudan ilişkileri seversin. Ne istediğini bilir ve net olursun.',
      stressBehavior: 'Stres altında daha kontrolcü ve öfkeli olabilirsin.',
      communication: 'Kısa, net ve hedefe yönelik iletişim kurarsın.',
      motivation: 'Başarmak, kazanmak ve kontrolü elde tutmak.'
    },
    yellow: {
      title: 'Enerjik Sarı',
      description: 'Sosyal, yaratıcı ve ilham verici bir yapın var. Girdiğin ortama enerji ve neşe katarsın.',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#D97706'],
      strengths: ['İletişim becerisi', 'İyimserlik', 'İkna kabiliyeti', 'Yaratıcılık'],
      weaknesses: ['Düzensizlik', 'Dikkat dağınıklığı', 'Bazen fazla konuşma'],
      relationship: 'Eğlenceli, dinamik ve dışa dönük ilişkiler kurarsın.',
      stressBehavior: 'Stres altında dağınık, savunmacı veya aşırı duygusal olabilirsin.',
      communication: 'Duygusal, hikayeleştirici ve canlı bir iletişim tarzın var.',
      motivation: 'Onaylanmak, sosyalleşmek ve fark edilmek.'
    },
    green: {
      title: 'Huzurlu Yeşil',
      description: 'Sakin, empatik ve destekleyici bir yapıya sahipsin. Çevrendekilere güven ve huzur verirsin.',
      color: '#10B981',
      gradient: ['#10B981', '#047857'],
      strengths: ['Empati', 'İyi dinleyici olma', 'Sabır', 'Uyum sağlama'],
      weaknesses: ['Değişime direnç', 'Hayır diyememe', 'Kendi ihtiyaçlarını erteleme'],
      relationship: 'Derin, sadık ve güvene dayalı ilişkiler kurarsın.',
      stressBehavior: 'Stres altında içe kapanır ve pasif-agresif davranışlar sergileyebilirsin.',
      communication: 'Yumuşak, dinlemeye odaklı ve yapıcı iletişim kurarsın.',
      motivation: 'Güvenlik, uyum ve başkalarına fayda sağlamak.'
    },
    blue: {
      title: 'Analitik Mavi',
      description: 'Detaycı, düzenli ve mantık odaklı bir yapın var. Kusursuzluğu ve kaliteyi hedeflersin.',
      color: '#3B82F6',
      gradient: ['#3B82F6', '#1D4ED8'],
      strengths: ['Analitik düşünme', 'Planlama', 'Detaylara hakimiyet', 'Kalite odaklılık'],
      weaknesses: ['Aşırı eleştirel olma', 'Kararsızlık', 'Duyguları ifade etmede zorlanma'],
      relationship: 'Sınırları belli, saygılı ve mantıklı ilişkiler kurarsın.',
      stressBehavior: 'Stres altında fazla eleştirel, soğuk ve mesafeli olabilirsin.',
      communication: 'Verilere dayalı, mesafeli ve yazılı iletişimi tercih eden bir yapın var.',
      motivation: 'Doğruluk, düzen ve mükemmele ulaşmak.'
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
      // Calculate percentages
      const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
      let total = 0;
      for (const key in answers) {
        if (counts[answers[key]] !== undefined) {
          counts[answers[key]]++;
          total++;
        }
      }
      
      const percentages = {
        red: total > 0 ? Math.round((counts.red / total) * 100) : 0,
        blue: total > 0 ? Math.round((counts.blue / total) * 100) : 0,
        green: total > 0 ? Math.round((counts.green / total) * 100) : 0,
        yellow: total > 0 ? Math.round((counts.yellow / total) * 100) : 0
      };

      // Find dominant color
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
        percentages,
        ...resultObj // title, description, color, gradient, strengths, etc.
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
    console.error('[Emotional Evolution ERROR]', err);
    res.status(500).json({
      success: false,
      message: 'Evolution data could not be loaded.'
    });
  }
};

/**
 * GET /api/personality/history/:id
 * Get a specific test result by ID
 */
exports.getResult = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const resultRes = await db.query(
      'SELECT id, test_type, result_data, created_at FROM personality_results WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (resultRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Sonuç bulunamadı.' });
    }

    res.json({ success: true, result: resultRes.rows[0] });
  } catch (err) {
    console.error('[personalityController] getResult error:', err);
    res.status(500).json({ success: false, message: 'Sonuç alınamadı.' });
  }
};
