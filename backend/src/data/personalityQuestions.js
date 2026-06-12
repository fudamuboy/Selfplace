/**
 * Selfplace Deep Personality Journey
 * 7 Dimensions:
 * - social_energy: negative = Introverted, positive = Extroverted
 * - emotional_expression: negative = Reserved, positive = Expressive
 * - conflict_style: negative = Avoidant, positive = Confrontational
 * - decision_style: negative = Logical, positive = Emotional
 * - attachment: negative = Independent, positive = Reassurance Seeking
 * - energy_rhythm: negative = Calm, positive = Intense
 * - curiosity: negative = Structured, positive = Exploratory
 */

const DIMENSIONS = [
  'social_energy',
  'emotional_expression',
  'conflict_style',
  'decision_style',
  'attachment',
  'energy_rhythm',
  'curiosity'
];

const FULL_POOL = [
  // ==========================================
  // SOCIAL ENERGY (q1 - q20)
  // ==========================================
  {
    id: "social_energy_behavioral_01",
    text: "Uzun ve yorucu bir günün ardından enerjini nasıl yenilersin?",
    dimension: "social_energy",
    type: "behavioral",
    semanticTags: ["energy_recharge", "solitude", "rest"],
    options: [
      { text: "Kendi başıma sessiz bir alana çekilerek", weights: { social_energy: -2, energy_rhythm: -1 } },
      { text: "Sevdiğim bir iki kişiyle derin bir sohbet ederek", weights: { social_energy: 0, attachment: 1 } },
      { text: "Kalabalık ve canlı bir ortama karışarak", weights: { social_energy: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "social_energy_social_01",
    text: "Kalabalık bir salona adım attığında, ruhunun yöneldiği ilk köşe hangisi olur?",
    dimension: "social_energy",
    type: "social",
    semanticTags: ["gathering", "room_entry", "crowd"],
    options: [
      { text: "Gözlerden uzak, loş ve sakin bir köşe", weights: { social_energy: -2, attachment: -1 } },
      { text: "Tanıdık yüzlerin toplandığı güvenli bir masa", weights: { social_energy: 0, attachment: 1 } },
      { text: "Merkezde, müziğin ve sohbetin en yoğun olduğu yer", weights: { social_energy: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "social_energy_behavioral_02",
    text: "Bir takside seyahat ederken şoförün sohbet açma çabasına nasıl karşılık verirsin?",
    dimension: "social_energy",
    type: "behavioral",
    semanticTags: ["taxi_chat", "small_talk", "strangers"],
    options: [
      { text: "Kısa ve mesafeli cevaplarla sessizliği korurum", weights: { social_energy: -2, emotional_expression: -1 } },
      { text: "Nezaketen dinler, arada bir onaylarım", weights: { social_energy: -1 } },
      { text: "Sohbete hemen katılır, keyifli bir diyalog kurarım", weights: { social_energy: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "social_energy_sensory_01",
    text: "Dışarıda fırtınalı bir yağmur varken yapacağın en ideal plan nedir?",
    dimension: "social_energy",
    type: "sensory",
    semanticTags: ["rainy_day", "indoor", "cosiness"],
    options: [
      { text: "Kitabım ve kahvemle tek başıma sessizce oturmak", weights: { social_energy: -2, energy_rhythm: -2 } },
      { text: "Partnerimle ya da en yakın dostumla film izlemek", weights: { social_energy: 0, attachment: 2 } },
      { text: "Evi arkadaşlarla doldurup oyunlu bir akşam geçirmek", weights: { social_energy: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "social_energy_social_02",
    text: "Bir grup projesinde liderlik rolü sana teklif edildiğinde ne hissedersin?",
    dimension: "social_energy",
    type: "social",
    semanticTags: ["leadership", "group_work", "responsibility"],
    options: [
      { text: "Geri planda kalıp kendi görevime odaklanmayı tercih ederim", weights: { social_energy: -2 } },
      { text: "Gerekirse üstlenirim ama sorumluluğu paylaşmak isterim", weights: { social_energy: 0 } },
      { text: "Heyecanla kabul eder, grubu koordine etmekten keyif alırım", weights: { social_energy: 2, conflict_style: 1 } }
    ]
  },
  {
    id: "social_energy_introspective_01",
    text: "Kendini en özgür ve maskesiz hissettiğin an hangisidir?",
    dimension: "social_energy",
    type: "introspective",
    semanticTags: ["freedom", "maskless", "authenticity"],
    options: [
      { text: "Kendi odamda, tamamen yalnız kaldığımda", weights: { social_energy: -2, attachment: -1 } },
      { text: "En yakınımın gözlerine bakıp sessizce oturduğumda", weights: { social_energy: 0, attachment: 2 } },
      { text: "Gülüp eğlendiğimiz kalabalık bir arkadaş masasında", weights: { social_energy: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "social_energy_behavioral_03",
    text: "Telefonun çaldığında ve arayan numara tanımadığın biriyse ne yaparsın?",
    dimension: "social_energy",
    type: "behavioral",
    semanticTags: ["unknown_caller", "phone_anxiety", "strangers"],
    options: [
      { text: "Açmam, önce mesaj atmasını beklerim veya internetten aratırım", weights: { social_energy: -2, curiosity: -1 } },
      { text: "Biraz tereddütle de olsa merak edip açarım", weights: { social_energy: 0, curiosity: 1 } },
      { text: "Hiç çekinmeden hemen açar, kim olduğunu sorarım", weights: { social_energy: 2 } }
    ]
  },
  {
    id: "social_energy_sensory_02",
    text: "Bir kafede otururken masaların birbirine çok yakın olması seni nasıl etkiler?",
    dimension: "social_energy",
    type: "sensory",
    semanticTags: ["cafe_spacing", "proximity", "personal_space"],
    options: [
      { text: "Rahatsız olurum, kendimi izleniyor gibi hissederim", weights: { social_energy: -2, attachment: -1 } },
      { text: "Çok umursamam ama kendi sesimi alçaltırım", weights: { social_energy: -1 } },
      { text: "Hiç rahatsız olmam, ortamın uğultusu beni besler", weights: { social_energy: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "social_energy_introspective_02",
    text: "Yeni insanlarla tanışmak zorunda kalacağın bir davete gitmeden önce zihninden ne geçer?",
    dimension: "social_energy",
    type: "introspective",
    semanticTags: ["party_anxiety", "new_people", "expectation"],
    options: [
      { text: "\"Keşke evde kalsaydım, erken kaçmanın bir yolunu bulmalıyım\"", weights: { social_energy: -2, conflict_style: -1 } },
      { text: "\"Umarım kafa dengi birkaç kişi bulup onlarla takılırım\"", weights: { social_energy: 0, attachment: 1 } },
      { text: "\"Bakalım bu akşam kimlerle tanışıp nasıl hikayeler duyacağım\"", weights: { social_energy: 2, curiosity: 2 } }
    ]
  },
  {
    id: "social_energy_behavioral_04",
    text: "Sosyal medyada paylaşım yapma veya profilini güncelleme sıklığın nedir?",
    dimension: "social_energy",
    type: "behavioral",
    semanticTags: ["social_media", "sharing_habits", "visibility"],
    options: [
      { text: "Neredeyse hiç paylaşım yapmam, sadece gözlemciyimdir", weights: { social_energy: -2, emotional_expression: -2 } },
      { text: "Sadece çok özel anlarda veya nadiren paylaşırım", weights: { social_energy: -1, emotional_expression: -1 } },
      { text: "Günlük anlarımı ve düşüncelerimi sıkça paylaşmayı severim", weights: { social_energy: 2, emotional_expression: 2 } }
    ]
  },
  {
    id: "social_energy_projection_01",
    text: "Ruhunu dinlendirmek için seçeceğin seyahat türü hangisidir?",
    dimension: "social_energy",
    type: "projection",
    semanticTags: ["travel_style", "recharge_trip", "nature"],
    options: [
      { text: "Dağ başında, kimsenin olmadığı ahşap bir kulübe", weights: { social_energy: -2, energy_rhythm: -2 } },
      { text: "Eski bir sahil kasabasında lokal pansiyonlar", weights: { social_energy: 0, curiosity: 1 } },
      { text: "Festivaller ve sokak sanatçılarıyla dolu dinamik bir metropol", weights: { social_energy: 2, energy_rhythm: 2 } }
    ]
  },
  {
    id: "social_energy_social_03",
    text: "Arkadaş grubun bir plan yaparken senin sesin nasıl duyulur?",
    dimension: "social_energy",
    type: "social",
    semanticTags: ["group_plans", "influence", "voice"],
    options: [
      { text: "Genelde sessiz kalır, çoğunluğun kararına uyarım", weights: { social_energy: -2, conflict_style: -1 } },
      { text: "Fikirlerimi söylerim ama ısrarcı olmam", weights: { social_energy: 0 } },
      { text: "Grubu yönlendirir, heyecanla alternatif planlar sunarım", weights: { social_energy: 2, curiosity: 1 } }
    ]
  },
  {
    id: "social_energy_instinctive_01",
    text: "Tanımadığın insanlarla dolu bir asansörde kaldığında nasıl bir hisse kapılırsın?",
    dimension: "social_energy",
    type: "instinctive",
    semanticTags: ["elevator", "confined_space", "strangers"],
    options: [
      { text: "Hafif bir gerginlik hisseder, gözlerimi telefonuma dikerim", weights: { social_energy: -2, conflict_style: -1 } },
      { text: "Sakin kalır, asansörün hedefine varmasını beklerim", weights: { social_energy: -1 } },
      { text: "Gülümser, gerekirse havadan sudan bir laf atarım", weights: { social_energy: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "social_energy_instinctive_02",
    text: "Bir kafede tek başına kahve içerken yan masadaki yabancı sana laf atsa ne yaparsın?",
    dimension: "social_energy",
    type: "instinctive",
    semanticTags: ["stranger_approach", "solitary_coffee", "spontaneity"],
    options: [
      { text: "Nezaketle gülümser, hemen kitabıma veya telefonuma dönerim", weights: { social_energy: -2 } },
      { text: "Kısa bir diyalog kurar ama mesafemi korurum", weights: { social_energy: -1, attachment: -1 } },
      { text: "Sohbete memnuniyetle katılır, masaları birleştirebilirim", weights: { social_energy: 2, curiosity: 1 } }
    ]
  },
  {
    id: "social_energy_behavioral_05",
    text: "Doğum gününü kutlama şeklin genelde nasıl olur?",
    dimension: "social_energy",
    type: "behavioral",
    semanticTags: ["birthday", "celebration", "social_circle"],
    options: [
      { text: "Hiç kutlamam ya da sadece en yakınımla sessizce geçiririm", weights: { social_energy: -2, attachment: -1 } },
      { text: "Küçük, samimi bir arkadaş grubuyla yemek yiyerek", weights: { social_energy: 0, attachment: 1 } },
      { text: "Herkesi davet ettiğim büyük, hareketli bir partiyle", weights: { social_energy: 2, energy_rhythm: 2 } }
    ]
  },
  {
    id: "social_energy_relational_01",
    text: "Bir partide tanıştığın ve çok iyi anlaştığın biriyle vedalaşırken nasıl davranırsın?",
    dimension: "social_energy",
    type: "relational",
    semanticTags: ["parting", "new_friend", "social_connection"],
    options: [
      { text: "\"Görüşürüz\" derim ama iletişim bilgisini istemeye çekinirim", weights: { social_energy: -2 } },
      { text: "Sosyal medya hesaplarımızı takipleşmeyi teklif ederim", weights: { social_energy: 1 } },
      { text: "Hemen telefon numarasını alır, yakın zamanda buluşma sözü isterim", weights: { social_energy: 2, attachment: 1 } }
    ]
  },
  {
    id: "social_energy_social_04",
    text: "İş yerinde veya okulda sunum yapmak durumunda kalmak seni nasıl etkiler?",
    dimension: "social_energy",
    type: "social",
    semanticTags: ["presentation", "stage_fright", "attention"],
    options: [
      { text: "Günler öncesinden strese girerim, sahneden nefret ederim", weights: { social_energy: -2, energy_rhythm: -1 } },
      { text: "Gerilirim ama görev bilinciyle profesyonelce sunarım", weights: { social_energy: 0 } },
      { text: "İnsanların odağında olmak beni motive eder, parlarım", weights: { social_energy: 2, emotional_expression: 2 } }
    ]
  },
  {
    id: "social_energy_introspective_03",
    text: "İçindeki sosyal pili şarj eden asıl kaynak hangisidir?",
    dimension: "social_energy",
    type: "introspective",
    semanticTags: ["battery", "social_battery", "inner_source"],
    options: [
      { text: "Kendi düşüncelerimle baş başa kaldığım mutlak sessizlik", weights: { social_energy: -2, energy_rhythm: -2 } },
      { text: "Sevdiğim insanlarla sessizce aynı odada bulunmak", weights: { social_energy: -1, attachment: 2 } },
      { text: "İnsanlarla kurduğum aktif diyaloglar ve kahkahalar", weights: { social_energy: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "social_energy_introspective_04",
    text: "Uzun süre yalnız kaldığında içine çöken his neye benzer?",
    dimension: "social_energy",
    type: "introspective",
    semanticTags: ["isolation", "loneliness", "solitude_effect"],
    options: [
      { text: "Huzur verici ve zihnimi arındıran derin bir dinginlik", weights: { social_energy: -2, energy_rhythm: -1 } },
      { text: "Hafif bir melankoli ama kendi başıma kalmayı severim", weights: { social_energy: -1 } },
      { text: "Huzursuzluk ve enerjimin yavaş yavaş çekilmesi", weights: { social_energy: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "social_energy_instinctive_03",
    text: "Sokakta yürürken karşıdan çok samimi olmadığın bir tanıdığının geldiğini görsen ilk tepkin ne olur?",
    dimension: "social_energy",
    type: "instinctive",
    semanticTags: ["avoiding_people", "street_encounter", "social_anxiety"],
    options: [
      { text: "Görmezden gelmek için telefonuma bakar veya yönümü değiştiririm", weights: { social_energy: -2, conflict_style: -1 } },
      { text: "Kafamla hafifçe selam verip hızla yoluma devam ederim", weights: { social_energy: -1 } },
      { text: "Gülümseyerek yanına gider, ayaküstü sohbet ederim", weights: { social_energy: 2, emotional_expression: 1 } }
    ]
  },

  // ==========================================
  // EMOTIONAL EXPRESSION (q21 - q40)
  // ==========================================
  {
    id: "emotional_expression_introspective_01",
    text: "İçinde yoğun bir duygu hissettiğinde ilk tepkin ne olur?",
    dimension: "emotional_expression",
    type: "introspective",
    semanticTags: ["initial_reaction", "internal_feelings", "self_regulation"],
    options: [
      { text: "Önce kendi içimde sakince anlamlandırmaya çalışırım", weights: { emotional_expression: -2, decision_style: -1 } },
      { text: "Hemen güvendiğim biriyle paylaşarak yükümü hafifletirim", weights: { emotional_expression: 1, attachment: 2 } },
      { text: "Duygumu açıkça dışarı vururum, bedenim ve sesimle yaşarım", weights: { emotional_expression: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "emotional_expression_relational_01",
    text: "Biri sana kalbini açtığında ve zayıflıklarını gösterdiğinde nasıl tepki verirsin?",
    dimension: "emotional_expression",
    type: "relational",
    semanticTags: ["vulnerability", "listening_ears", "closeness"],
    options: [
      { text: "Şefkatle dinlerim ama kendi duvarlarımı ve sınırlarımı korurum", weights: { emotional_expression: -1, attachment: -1 } },
      { text: "Mantıklı yönlendirmelerle ona güç verip teselli ederim", weights: { decision_style: -2 } },
      { text: "Ben de hemen kendi sırlarımı ve yaralarımı onunla paylaşırım", weights: { emotional_expression: 2, attachment: 1 } }
    ]
  },
  {
    id: "emotional_expression_relational_02",
    text: "Sevgini göstermenin en doğal ve zahmetsiz yolu sence hangisidir?",
    dimension: "emotional_expression",
    type: "relational",
    semanticTags: ["love_languages", "affection", "showing_love"],
    options: [
      { text: "Onun için bir şeyler yapmak, hayatını kolaylaştırmak", weights: { emotional_expression: -1, decision_style: -1 } },
      { text: "Sözcüklerle, şiirsel ve açık duygusal ifadelerle ilan etmek", weights: { emotional_expression: 2, decision_style: 1 } },
      { text: "Fiziksel temas kurmak ve sessizce sarılarak zaman geçirmek", weights: { attachment: 1, energy_rhythm: -1 } }
    ]
  },
  {
    id: "emotional_expression_introspective_02",
    text: "Hayatında bir şeyler derinden ters gittiğinde dışarıdan nasıl görünürsün?",
    dimension: "emotional_expression",
    type: "introspective",
    semanticTags: ["poker_face", "trouble", "outer_appearance"],
    options: [
      { text: "Sessiz ve sakin görünürüm ama içimde fırtınalar kopar", weights: { emotional_expression: -2, energy_rhythm: -1 } },
      { text: "Soğukkanlı kalırım, hemen çözüme odaklanıp işe koyulurum", weights: { emotional_expression: -1, decision_style: -2 } },
      { text: "Yüzümden ve sesimden hemen anlaşılır, duygularımı saklayamam", weights: { emotional_expression: 2 } }
    ]
  },
  {
    id: "emotional_expression_social_01",
    text: "Kendini dış dünyaya ve sosyal çevrene nasıl sunarsın?",
    dimension: "emotional_expression",
    type: "social",
    semanticTags: ["self_presentation", "social_mask", "honesty"],
    options: [
      { text: "Biraz kapalı, sadece çok güvendiklerime asıl dünyamı açarım", weights: { emotional_expression: -2, social_energy: -1 } },
      { text: "Duruma ve karşımdaki insanın enerjisine göre uyumlanırım", weights: { curiosity: 1, decision_style: -1 } },
      { text: "Tamamen açık bir kitap gibi, içim neyse dışım da odur", weights: { emotional_expression: 2, social_energy: 1 } }
    ]
  },
  {
    id: "emotional_expression_sensory_01",
    text: "Çok duygusal veya dokunaklı bir film izlerken gözyaşlarını nasıl yönetirsin?",
    dimension: "emotional_expression",
    type: "sensory",
    semanticTags: ["crying_movie", "tears", "emotional_release"],
    options: [
      { text: "Gözyaşlarımı yutarım, ağladığımı başkalarının görmesini istemem", weights: { emotional_expression: -2 } },
      { text: "Sessizce ağlarım ama çok da belli etmemeye çalışırım", weights: { emotional_expression: 0 } },
      { text: "Hıçkıra hıçkıra, hislerimi hiç gizlemeden ağlarım", weights: { emotional_expression: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "emotional_expression_conflict_style_01",
    text: "Birine kırıldığında veya darıldığında bu durumu ona nasıl hissettirirsin?",
    dimension: "emotional_expression",
    type: "conflict_style",
    semanticTags: ["resentment", "unspoken", "coldness"],
    options: [
      { text: "Sessizleşirim, aramıza mesafe koyup onun anlamasını beklerim", weights: { emotional_expression: -2, conflict_style: -2 } },
      { text: "Kırgınlığımı ima eden imalı laflar veya soğuk tavırlar takınırım", weights: { conflict_style: -1 } },
      { text: "Karşıma alıp neden kırıldığımı tüm açıklığıyla ve hislerimle konuşurum", weights: { emotional_expression: 2, conflict_style: 2 } }
    ]
  },
  {
    id: "emotional_expression_symbolic_01",
    text: "Duygularını kağıda dökmek veya sanatsal bir yolla ifade etmek senin için ne anlama gelir?",
    dimension: "emotional_expression",
    type: "symbolic",
    semanticTags: ["journaling", "creative_expression", "art"],
    options: [
      { text: "Çok yaptığım veya ihtiyaç duyduğum bir şey değildir", weights: { emotional_expression: -2, curiosity: -1 } },
      { text: "Zor zamanlarda içimi boşaltmak için iyi bir araçtır", weights: { emotional_expression: 1 } },
      { text: "Ruhumu besleyen, kendimi bulduğum vazgeçilmez bir ifade biçimidir", weights: { emotional_expression: 2, curiosity: 2 } }
    ]
  },
  {
    id: "emotional_expression_social_02",
    text: "Büyük bir sevinç veya başarı kazandığında bunu etrafındakilerle nasıl paylaşırsın?",
    dimension: "emotional_expression",
    type: "social",
    semanticTags: ["victory", "joy_sharing", "excitement"],
    options: [
      { text: "Nazar değmesin diye sessiz kalır, kendi içimde kutlarım", weights: { emotional_expression: -2, social_energy: -1 } },
      { text: "Sadece ailem ve en yakın dostlarıma haber veririm", weights: { emotional_expression: 0, attachment: 1 } },
      { text: "Çığlık çığlığa, herkesin duymasını isteyerek coşkuyla paylaşırım", weights: { emotional_expression: 2, social_energy: 2 } }
    ]
  },
  {
    id: "emotional_expression_instinctive_01",
    text: "Biri sana beklenmedik ve çok içten bir iltifatta bulunduğunda içsel refleksin ne olur?",
    dimension: "emotional_expression",
    type: "instinctive",
    semanticTags: ["compliment", "shyness", "warmth"],
    options: [
      { text: "Utanır, konuyu değiştirmeye çalışır veya ciddiye almam", weights: { emotional_expression: -2 } },
      { text: "Kuru bir \"Teşekkür ederim\" ile yetinip mesafeli kalırım", weights: { emotional_expression: -1 } },
      { text: "Gözlerim parlar, içtenlikle teşekkür eder ve ne kadar mutlu olduğumu söylerim", weights: { emotional_expression: 2, attachment: 1 } }
    ]
  },
  {
    id: "emotional_expression_symbolic_02",
    text: "Ruhunu bir renkle boyamak istesen, bu renk tonu hangisi olurdu?",
    dimension: "emotional_expression",
    type: "symbolic",
    semanticTags: ["color_metaphor", "inner_color", "self_image"],
    options: [
      { text: "Pastel ve solgun tonlar, dikkati çekmeyen gölgeler", weights: { emotional_expression: -2, social_energy: -1 } },
      { text: "Derin, dingin mavi veya yeşil tonları", weights: { emotional_expression: -1, energy_rhythm: -1 } },
      { text: "Canlı, parlak ve sıcak günbatımı renkleri", weights: { emotional_expression: 2, energy_rhythm: 2 } }
    ]
  },
  {
    id: "emotional_expression_relational_03",
    text: "Korkularından ve kaygılarından bahsetmek senin için ne kadar zordur?",
    dimension: "emotional_expression",
    type: "relational",
    semanticTags: ["fears", "sharing_fears", "intimacy"],
    options: [
      { text: "Zayıf görünmemek için korkularımı kimseye anlatmam", weights: { emotional_expression: -2, attachment: -1 } },
      { text: "Sadece çok nadir ve uç durumlarda, güvendiğim kişiye açarım", weights: { emotional_expression: -1 } },
      { text: "Korkularımı paylaşmakta hiçbir sakınca görmem, beni insan kılar", weights: { emotional_expression: 2, attachment: 1 } }
    ]
  },
  {
    id: "emotional_expression_conflict_style_02",
    text: "Öfkeni yaşama ve dışa vurma biçimini en iyi hangisi tarif eder?",
    dimension: "emotional_expression",
    type: "conflict_style",
    semanticTags: ["anger", "expression_style", "explosion"],
    options: [
      { text: "İçime atarım, sessizce eriyip gitmesini beklerim", weights: { emotional_expression: -2, conflict_style: -2 } },
      { text: "Soğuk ve iğneleyici bir dille karşı tarafı uyarırım", weights: { conflict_style: 1 } },
      { text: "Hemen parlarım, sesimi yükseltip tepkimi anında gösteririm", weights: { emotional_expression: 2, conflict_style: 2 } }
    ]
  },
  {
    id: "emotional_expression_energy_rhythm_01",
    text: "Duygusal durumun gün içindeki ani dalgalanmalara ne kadar açıktır?",
    dimension: "emotional_expression",
    type: "energy_rhythm",
    semanticTags: ["mood_swings", "emotional_stability", "tides"],
    options: [
      { text: "Çok stabildir, kolay kolay dengem şaşmaz", weights: { emotional_expression: -2, energy_rhythm: -2 } },
      { text: "Ufak tefek etkilenmeler olur ama çabuk toparlarım", weights: { energy_rhythm: 0 } },
      { text: "Çok dalgalıdır, dış etkenler veya düşünceler beni hızla değiştirir", weights: { emotional_expression: 2, energy_rhythm: 2 } }
    ]
  },
  {
    id: "emotional_expression_relational_04",
    text: "Karşındaki insanın duygusal durumunu (mutsuzluğunu, neşesini) hissetme hızın nedir?",
    dimension: "emotional_expression",
    type: "relational",
    semanticTags: ["empathy", "intuition", "reading_moods"],
    options: [
      { text: "Genelde o söylemeden veya açıkça belli etmeden fark edemem", weights: { emotional_expression: -2, decision_style: -2 } },
      { text: "Bir şeylerin değiştiğini sezerim ama sormadan emin olamam", weights: { emotional_expression: 0 } },
      { text: "Odaya girdiği ilk saniyede enerjisinden her şeyi anlarım", weights: { emotional_expression: 2, decision_style: 2 } }
    ]
  },
  {
    id: "emotional_expression_social_03",
    text: "Bir toplulukta birinin ağladığını görsen içinden gelen ilk dürtü ne olur?",
    dimension: "emotional_expression",
    type: "social",
    semanticTags: ["crying_stranger", "social_empathy", "dilemma"],
    options: [
      { text: "Görmezden gelip kendi alanımda kalmak, onu utandırmamak", weights: { emotional_expression: -2, social_energy: -1 } },
      { text: "Uzakta durup sessizce durumun düzelmesini izlemek", weights: { emotional_expression: -1 } },
      { text: "Hemen yanına gidip mendil uzatmak veya nasılsın diye sormak", weights: { emotional_expression: 2, attachment: 1 } }
    ]
  },
  {
    id: "emotional_expression_sensory_02",
    text: "Eski fotoğraf albümlerine veya eski anı eşyalarına baktığında ne hissedersin?",
    dimension: "emotional_expression",
    type: "sensory",
    semanticTags: ["nostalgia", "photos", "past_feelings"],
    options: [
      { text: "Nostaljiye çok kapılmam, sadece geçmişe dair verilerdir", weights: { emotional_expression: -2, decision_style: -2 } },
      { text: "Hafif bir tebessüm ve geçip giden zamana saygı hissederim", weights: { emotional_expression: 0 } },
      { text: "Derin bir melankoli ve özlemle gözlerim dolabilir", weights: { emotional_expression: 2, decision_style: 2 } }
    ]
  },
  {
    id: "emotional_expression_introspective_03",
    text: "Sana göre duygular, hayat yolculuğunda ne anlama gelir?",
    dimension: "emotional_expression",
    type: "introspective",
    semanticTags: ["meaning_of_emotions", "life_philosophy", "feelings_role"],
    options: [
      { text: "Bazen mantığı gölgeleyen, kontrol edilmesi gereken zaaflardır", weights: { emotional_expression: -2, decision_style: -2 } },
      { text: "Hayatın tuzu biberidir ama kararlarımızı etkilememelidir", weights: { decision_style: -1 } },
      { text: "Bizi insan yapan, hayatı asıl anlamlı kılan pusulalardır", weights: { emotional_expression: 2, decision_style: 2 } }
    ]
  },
  {
    id: "emotional_expression_relational_05",
    text: "İlişkinde partnerine sevgi dolu sözcükler söylemek sana ne hissettirir?",
    dimension: "emotional_expression",
    type: "relational",
    semanticTags: ["sweet_talk", "affection_words", "intimacy"],
    options: [
      { text: "Yapay veya fazla cıvık gelir, eylemleri tercih ederim", weights: { emotional_expression: -2 } },
      { text: "Ara sıra söylerim ama sık sık söylenirse anlamını yitirir", weights: { emotional_expression: -1 } },
      { text: "Ruhumu besler, sevgimi kelimelerle haykırmaktan zevk alırım", weights: { emotional_expression: 2, attachment: 1 } }
    ]
  },
  {
    id: "emotional_expression_contradiction_01",
    text: "Ruh halinde belirgin bir sıkıntı olduğunda bunu gizlemek için çabalar mısın?",
    dimension: "emotional_expression",
    type: "contradiction",
    semanticTags: ["masking_sadness", "inner_turmoil", "outer_facade"],
    options: [
      { text: "Her zaman saklarım, kimsenin benim için üzülmesini istemem", weights: { emotional_expression: -2, attachment: -1 } },
      { text: "Sadece iş yerinde veya yabancılara karşı saklar, evde serbest bırakırım", weights: { emotional_expression: 0 } },
      { text: "Asla saklayamam, modum düşükse bunu herkes anında fark eder", weights: { emotional_expression: 2 } }
    ]
  },

  // ==========================================
  // CONFLICT STYLE (q41 - q60)
  // ==========================================
  {
    id: "conflict_style_relational_01",
    text: "Biriyle ciddi bir fikir ayrılığı veya anlaşmazlık yaşadığında nasıl davranırsın?",
    dimension: "conflict_style",
    type: "relational",
    semanticTags: ["argument", "disagreement", "resolution_style"],
    options: [
      { text: "Sakinleşmek ve gerilimi düşürmek için hemen uzaklaşırım", weights: { conflict_style: -2, energy_rhythm: -1 } },
      { text: "Karşı tarafın hislerine odaklanır, orta yolu bulmaya çalışırım", weights: { conflict_style: -1, decision_style: 2 } },
      { text: "Sorunu hemen o an konuşup açıkça tartışarak çözmek isterim", weights: { conflict_style: 2, decision_style: -1 } }
    ]
  },
  {
    id: "conflict_style_introspective_01",
    text: "Haksız yere eleştirildiğini veya suçlandığını düşündüğünde ilk tepkin ne olur?",
    dimension: "conflict_style",
    type: "introspective",
    semanticTags: ["unjust_criticism", "blame", "self_defense"],
    options: [
      { text: "İçime kapanır, sessizce kırılır ama cevap vermem", weights: { conflict_style: -2, emotional_expression: -1 } },
      { text: "Mantıklı argümanlarla kendimi savunur, duygusallığa yer vermem", weights: { decision_style: -2, conflict_style: 1 } },
      { text: "Hemen sert bir ses tonuyla itiraz eder, sınırlarımı çizerim", weights: { conflict_style: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "conflict_style_social_01",
    text: "Çatışma veya gerginlik potansiyeli olan bir sohbette enerjin nasıldır?",
    dimension: "conflict_style",
    type: "social",
    semanticTags: ["tension", "conversation_energy", "avoidance"],
    options: [
      { text: "Gerginlik beni çok yorar, konuyu değiştirip kaçmaya çalışırım", weights: { conflict_style: -2, social_energy: -1 } },
      { text: "Ortamı sakinleştirmek için arabulucu ve yatıştırıcı olurum", weights: { conflict_style: -1, decision_style: 1 } },
      { text: "Haklı olduğumu düşünüyorsam sonuna kadar iddialı tartışırım", weights: { conflict_style: 2 } }
    ]
  },
  {
    id: "conflict_style_relational_02",
    text: "Partnerinle aranda soğuk bir mesafe hissettiğinde ilk adımın ne olur?",
    dimension: "conflict_style",
    type: "relational",
    semanticTags: ["distance_handling", "partner_coldness", "attachment_trigger"],
    options: [
      { text: "Ben de kendimi geri çeker, onun hatasını anlayıp gelmesini beklerim", weights: { conflict_style: -2, attachment: -1 } },
      { text: "Kendi işlerime ve hobilerime odaklanıp zamana bırakırım", weights: { conflict_style: -1, attachment: -2 } },
      { text: "Hemen sebebini sorar ve yakınlaşmak için konuyu açarım", weights: { conflict_style: 2, attachment: 2 } }
    ]
  },
  {
    id: "conflict_style_instinctive_01",
    text: "Sırada beklerken biri açıkça önüne geçmeye çalışırsa ne yaparsın?",
    dimension: "conflict_style",
    type: "instinctive",
    semanticTags: ["cutting_line", "public_limits", "injustice"],
    options: [
      { text: "Görmezden gelirim veya tartışmaya değmeyeceğini düşünüp susarım", weights: { conflict_style: -2 } },
      { text: "Nezaketle uyarırım ama ısrar ederse uzatmam", weights: { conflict_style: 0 } },
      { text: "Hemen sert ve net bir sesle uyarır, sıranın arkasına geçmesini söylerim", weights: { conflict_style: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "conflict_style_behavioral_01",
    text: "Bir restoranda sipariş ettiğin yemek tamamen yanlış ve soğuk gelirse tavrın ne olur?",
    dimension: "conflict_style",
    type: "behavioral",
    semanticTags: ["bad_service", "complaining", "assertiveness"],
    options: [
      { text: "Çok ses çıkarmadan yerim ya da tabağı yarım bırakıp kalkarım", weights: { conflict_style: -2 } },
      { text: "Nezaketle garsonu çağırıp durumu bildirir, değiştirmesini rica ederim", weights: { conflict_style: 1 } },
      { text: "Hesabı öderken veya yemeği geri gönderirken sertçe şikayet ederim", weights: { conflict_style: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "conflict_style_energy_rhythm_01",
    text: "Çatışma durumları sonrasında sakinleşme ve normale dönme süren ne kadardır?",
    dimension: "conflict_style",
    type: "energy_rhythm",
    semanticTags: ["calming_down", "aftermath", "letting_go"],
    options: [
      { text: "Günlerce içimde taşır, olayı zihnimde tekrar tekrar yaşarım", weights: { conflict_style: -2, energy_rhythm: 2 } },
      { text: "Birkaç saat içinde yatışır, konuyu kapatmaya çalışırım", weights: { conflict_style: 0 } },
      { text: "Hızla geçer, tartışma bittiği an her şeyi orada bırakırım", weights: { conflict_style: 2, energy_rhythm: -2 } }
    ]
  },
  {
    id: "conflict_style_introspective_02",
    text: "Hata yaptığını anladığında bunu karşı tarafa nasıl itiraf edersin?",
    dimension: "conflict_style",
    type: "introspective",
    semanticTags: ["apologizing", "pride", "admitting_mistake"],
    options: [
      { text: "Açıkça özür dilemekte zorlanırım, tavırlarımla telafi etmeye çalışırım", weights: { conflict_style: -2 } },
      { text: "Uygun bir an kollayıp kendimi savunmadan hatamı kabul ederim", weights: { conflict_style: 1 } },
      { text: "Hemen o an hatamı yüzüne karşı söyler, tüm sorumluluğu alırım", weights: { conflict_style: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "conflict_style_social_02",
    text: "Arkandan konuşan veya dedikodunu yapan bir tanıdığınla karşılaştığında ne yaparsın?",
    dimension: "conflict_style",
    type: "social",
    semanticTags: ["rumor", "confronting", "social_clash"],
    options: [
      { text: "Hiçbir şey belli etmem ama onunla ilişkimi sessizce tamamen keserim", weights: { conflict_style: -2, attachment: -1 } },
      { text: "İğneleyici ve mesafeli davranarak ona olan tavrımı belli ederim", weights: { conflict_style: 0 } },
      { text: "Doğrudan karşısına dikilir, duyduklarımı sorup hesap sorarım", weights: { conflict_style: 2 } }
    ]
  },
  {
    id: "conflict_style_instinctive_02",
    text: "Çatışma anında karşındaki insanın sesini yükseltmesi sende nasıl bir refleks uyandırır?",
    dimension: "conflict_style",
    type: "instinctive",
    semanticTags: ["yelling", "scared_vs_angry", "shouting"],
    options: [
      { text: "Korkar, geri çekilir ve konuşmayı tamamen sonlandırırım", weights: { conflict_style: -2, attachment: 1 } },
      { text: "Sakinliğimi koruyup sesini alçaltmasını talep ederim", weights: { conflict_style: 0, decision_style: -1 } },
      { text: "Ben de sesimi yükseltir, aynı tonda karşılık veririm", weights: { conflict_style: 2, energy_rhythm: 2 } }
    ]
  },
  {
    id: "conflict_style_relational_03",
    text: "Bir ilişkide \"uzlaşma\" kelimesi senin için ne ifade eder?",
    dimension: "conflict_style",
    type: "relational",
    semanticTags: ["compromise", "giving_in", "balance"],
    options: [
      { text: "Kendi isteklerimden taviz vermek, benliğimi kaybetmek", weights: { conflict_style: -2, attachment: -2 } },
      { text: "Orta yolu bulup iki tarafın da mutlu olması", weights: { conflict_style: 0 } },
      { text: "Fikirlerin çarpışıp yeni ve ortak bir doğrudan doğması", weights: { conflict_style: 2, curiosity: 1 } }
    ]
  },
  {
    id: "conflict_style_contradiction_01",
    text: "Pasif-agresif davranışlar (örneğin laf sokma, kapı çarpma) karşısında ne hissedersin?",
    dimension: "conflict_style",
    type: "contradiction",
    semanticTags: ["passive_aggressive", "hidden_anger", "reactions"],
    options: [
      { text: "Ben de aynı şekilde sessizleşir veya dolaylı tepki veririm", weights: { conflict_style: -2 } },
      { text: "Çok umursamam, çocukça bulup kendi işime bakarım", weights: { conflict_style: -1 } },
      { text: "Dayanamam, \"Açık konuş, derdin ne?\" diye doğrudan sorarım", weights: { conflict_style: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "conflict_style_behavioral_02",
    text: "Bir arkadaşın sana hiç istemediğin bir konuda tavsiye verip durduğunda ne dersin?",
    dimension: "conflict_style",
    type: "behavioral",
    semanticTags: ["unwanted_advice", "boundaries", "annoying"],
    options: [
      { text: "Dinliyormuş gibi yapar, sonra yine kendi bildiğimi yaparım", weights: { conflict_style: -2 } },
      { text: "Nezaketle teşekkür eder, kendi kararlarımdan memnun olduğumu söylerim", weights: { conflict_style: 0 } },
      { text: "Konuyu kapatmasını, bu konuda yorum istemediğimi açıkça söylerim", weights: { conflict_style: 2 } }
    ]
  },
  {
    id: "conflict_style_introspective_03",
    text: "Sence hayattaki çatışmalar kaçınılmaz mıdır yoksa beceriksizlik eseri midir?",
    dimension: "conflict_style",
    type: "introspective",
    semanticTags: ["conflict_inevitable", "philosophy", "clash"],
    options: [
      { text: "İyi yönetilirse neredeyse her çatışmadan kaçınılabilir", weights: { conflict_style: -2, decision_style: -1 } },
      { text: "Hayatın doğal bir parçasıdır ama büyütmeye gerek yoktur", weights: { conflict_style: 0 } },
      { text: "Gelişmenin ve sınırları belirlemenin gerekli ve sağlıklı bir yoludur", weights: { conflict_style: 2, curiosity: 1 } }
    ]
  },
  {
    id: "conflict_style_social_03",
    text: "Bir grup ortamında iki arkadaşının hararetli bir şekilde tartıştığını görsen ne yaparsın?",
    dimension: "conflict_style",
    type: "social",
    semanticTags: ["friends_fighting", "social_mediator", "intervention"],
    options: [
      { text: "Hiç karışmam, aralarındaki mesele der, oradan ayrılırım", weights: { conflict_style: -2, social_energy: -1 } },
      { text: "Tansiyonu düşürmek için şakalar yapar, konuyu dağıtırım", weights: { conflict_style: -1, social_energy: 1 } },
      { text: "Araya girer, mantıklı argümanlarla iki tarafı da dinleyip hakemlik yaparım", weights: { conflict_style: 1, decision_style: -2 } }
    ]
  },
  {
    id: "conflict_style_behavioral_03",
    text: "Ödünç verdiğin bir eşyanın zarar görmüş olarak geri gelmesi durumunda ne yaparsın?",
    dimension: "conflict_style",
    type: "behavioral",
    semanticTags: ["damaged_borrow", "belongings", "assertiveness"],
    options: [
      { text: "Bir şey demem ama o kişiye bir daha hiçbir şeyimi vermem", weights: { conflict_style: -2, attachment: -1 } },
      { text: "Zararı hafifçe söylerim ama telafi etmesini talep etmem", weights: { conflict_style: 0 } },
      { text: "Açıkça rahatsızlığımı belirtir, yenisini almasını veya tamir ettirmesini isterim", weights: { conflict_style: 2 } }
    ]
  },
  {
    id: "conflict_style_relational_04",
    text: "Bir ilişkide en çok hangi çatışma biçimi seni yorar?",
    dimension: "conflict_style",
    type: "relational",
    semanticTags: ["exhausting_conflict", "relationship_tension", "fights"],
    options: [
      { text: "Sürekli iğnelemeler, ima dolu laflar ve duvar örme (sessizlik)", weights: { conflict_style: -2 } },
      { text: "Ufak tefek her şeye patlayan, anlık bağrışmalı kavgalar", weights: { conflict_style: 1, energy_rhythm: 2 } },
      { text: "Sorunun ne olduğunun hiç konuşulmadığı sahte bir huzur hali", weights: { conflict_style: -1 } }
    ]
  },
  {
    id: "conflict_style_contradiction_02",
    text: "Bir konuda haklı olduğundan %100 eminsen ama tartışmanın uzayacağı belliyse ne yaparsın?",
    dimension: "conflict_style",
    type: "contradiction",
    semanticTags: ["being_right", "letting_go", "pride"],
    options: [
      { text: "\"Sen haklısın\" der, konuyu kapatırım ama içimden ona inanmam", weights: { conflict_style: -2 } },
      { text: "Sohbeti daha sakin bir zamana ertelemeyi öneririm", weights: { conflict_style: 0 } },
      { text: "Kabul edene kadar kanıtlar sunar, tartışmayı bırakmam", weights: { conflict_style: 2, decision_style: -1 } }
    ]
  },
  {
    id: "conflict_style_social_04",
    text: "Bir iş toplantısında projenin sunumu sırasında biri fikrini sertçe çürütmeye çalışırsa?",
    dimension: "conflict_style",
    type: "social",
    semanticTags: ["work_conflict", "ideas", "professionalism"],
    options: [
      { text: "Sessiz kalıp notlarımı alırım, toplantı sonrasında konuşurum", weights: { conflict_style: -2, social_energy: -1 } },
      { text: "Sakin bir dille argümanlarını dinler, mantıklı yerleri kabul ederim", weights: { conflict_style: 0, decision_style: -2 } },
      { text: "Anında sözünü keser, tezlerimi daha agresif argümanlarla savunurum", weights: { conflict_style: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "conflict_style_instinctive_03",
    text: "Evcil hayvanının veya çok sevdiğin birinin yaramazlık/hata yaptığını gördüğünde ilk tepkin?",
    dimension: "conflict_style",
    type: "instinctive",
    semanticTags: ["pet_mistake", "forgiveness", "temper"],
    options: [
      { text: "Güler geçerim, kıyamam ve hemen affederim", weights: { conflict_style: -2, decision_style: 2 } },
      { text: "Sakince uyarır, bir daha yapmaması için önlem alırım", weights: { conflict_style: 0 } },
      { text: "Sesimi yükseltir, kızdığımı net bir şekilde gösteririm", weights: { conflict_style: 2 } }
    ]
  },

  // ==========================================
  // DECISION STYLE (q61 - q80)
  // ==========================================
  {
    id: "decision_style_introspective_01",
    text: "Önemli bir karar alman gerektiğinde hangisine daha çok güvenirsin?",
    dimension: "decision_style",
    type: "introspective",
    semanticTags: ["critical_decision", "intuition_vs_logic", "mind_vs_heart"],
    options: [
      { text: "Mantığıma, geçmiş verilere ve rasyonel analizlerime", weights: { decision_style: -2, curiosity: -1 } },
      { text: "İçgüdülerime, hislerime ve kalbimin ilk sesine", weights: { decision_style: 2, curiosity: 1 } },
      { text: "Her ikisini de teraziye koyup dengeli bir sentez ararım", weights: { decision_style: 0 } }
    ]
  },
  {
    id: "decision_style_relational_01",
    text: "Bir arkadaşının hayatı darmadağın olduğunda ve sana sığındığında ona nasıl destek olursun?",
    dimension: "decision_style",
    type: "relational",
    semanticTags: ["helping_friend", "empathy_style", "logic_support"],
    options: [
      { text: "Rasyonel çözümler üretir, çıkış yolları planlarım", weights: { decision_style: -2, emotional_expression: -1 } },
      { text: "Sadece sarılır, onu yargılamadan dinler ve acısını paylaşırım", weights: { decision_style: 2, emotional_expression: 1 } },
      { text: "Onunla birlikte o acıyı derinlemesine yaşar, hislerini doğrularım", weights: { decision_style: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "decision_style_introspective_02",
    text: "Gece yalnız kalıp kafanı yastığa koyduğunda düşüncelerin genelde nereye akar?",
    dimension: "decision_style",
    type: "introspective",
    semanticTags: ["night_thoughts", "past_present", "dreaming"],
    options: [
      { text: "Gelecekteki planlara, yapılacak işlerin listesine ve mantıklı adımlara", weights: { decision_style: -2, curiosity: -1 } },
      { text: "Geçmiş anılara, keşkelerle dolu duygusal hesaplaşmalara", weights: { decision_style: 1, energy_rhythm: -1 } },
      { text: "Hayal dünyasına, fantastik senaryolara ve sonsuz olasılıklara", weights: { curiosity: 2, decision_style: 2 } }
    ]
  },
  {
    id: "decision_style_introspective_03",
    text: "Karar verme anlarında seni en çok felç eden korku hangisidir?",
    dimension: "decision_style",
    type: "introspective",
    semanticTags: ["decision_paralysis", "fear_factors", "regret"],
    options: [
      { text: "Mantıksal bir hata yapmak, yanlış veriye güvenmiş olmak", weights: { decision_style: -2 } },
      { text: "Başkalarını hayal kırıklığına uğratmak veya yalnız kalmak", weights: { attachment: 1, social_energy: 1 } },
      { text: "Sonradan pişman olmak ve yaşayacağım duygusal acıyı kaldıramamak", weights: { decision_style: 2 } }
    ]
  },
  {
    id: "decision_style_social_01",
    text: "Aşırı duygusal ortamlarda (örneğin herkesin ağladığı veya kavga ettiği bir odada) nasıl durursun?",
    dimension: "decision_style",
    type: "social",
    semanticTags: ["emotional_atmosphere", "room_vibe", "composure"],
    options: [
      { text: "Sakinleştirici, rasyonel ve dengeli bir kaya gibi dururum", weights: { decision_style: -2, energy_rhythm: -1 } },
      { text: "Ortamın enerjisi bana da sirayet eder, içim daralır veya ağlarım", weights: { decision_style: 2, emotional_expression: 1 } },
      { text: "Bunalırım, oradan bir an önce kaçıp uzaklaşmak isterim", weights: { conflict_style: -2, emotional_expression: -1 } }
    ]
  },
  {
    id: "decision_style_behavioral_01",
    text: "Büyük miktarda para harcayıp lüks bir şey alırken kararını belirleyen ne olur?",
    dimension: "decision_style",
    type: "behavioral",
    semanticTags: ["spending", "shopping_decisions", "luxury"],
    options: [
      { text: "Fiyat-performans analizi, dayanıklılık ve mantıklı bütçe hesabı", weights: { decision_style: -2, curiosity: -1 } },
      { text: "Bana hissettirdiği heyecan, estetik zevk ve o anki arzum", weights: { decision_style: 2, curiosity: 1 } },
      { text: "Uzun süre hayal edip kendime ödül verme isteğim", weights: { decision_style: 1, attachment: 1 } }
    ]
  },
  {
    id: "decision_style_projection_01",
    text: "Kariyerinde yeni bir yola girmek üzeresin. Kararını neye göre şekillendirirsin?",
    dimension: "decision_style",
    type: "projection",
    semanticTags: ["career_change", "future_success", "passion"],
    options: [
      { text: "Maddi getiri, kariyer basamakları ve geleceğin popüler sektörleri", weights: { decision_style: -2, curiosity: -1 } },
      { text: "Ruhumu ne kadar tatmin edeceği, tutkum ve çalışma ortamının huzuru", weights: { decision_style: 2, energy_rhythm: -1 } },
      { text: "Öğreneceğim yeni şeyler ve kendimi keşfetme imkanı", weights: { curiosity: 2, decision_style: 0 } }
    ]
  },
  {
    id: "decision_style_sensory_01",
    text: "Bir filmi veya kitabı bitirdiğinde onu arkadaşlarına nasıl tavsiye edersin?",
    dimension: "decision_style",
    type: "sensory",
    semanticTags: ["reviewing", "sharing_books", "opinions"],
    options: [
      { text: "Kurgunun tutarlılığını, mantık hatalarını ve teknik kalitesini överek", weights: { decision_style: -2 } },
      { text: "Beni nasıl ağlattığını, hissettirdiği o yoğun atmosferi anlatarak", weights: { decision_style: 2, emotional_expression: 2 } },
      { text: "Genel temasını ve verdiği felsefi mesajı tartışarak", weights: { curiosity: 2, decision_style: 0 } }
    ]
  },
  {
    id: "decision_style_behavioral_02",
    text: "Bir yatırım veya finansal karar aşamasındasın. Hangisi sana daha yakın gelir?",
    dimension: "decision_style",
    type: "behavioral",
    semanticTags: ["investment", "risk_money", "gut_vs_numbers"],
    options: [
      { text: "Grafikler, uzman yorumları ve somut matematiksel veriler", weights: { decision_style: -2, curiosity: -1 } },
      { text: "İçimden bir sesin o işin tutacağını söylemesi, sezgisel güven", weights: { decision_style: 2, curiosity: 2 } },
      { text: "Güvendiğim bir dostun tavsiyesi ve ortak olma fikri", weights: { attachment: 2, decision_style: 0 } }
    ]
  },
  {
    id: "decision_style_social_02",
    text: "Bir işe alım yapacak olsan, adayı seçerken hangisi ağır basardı?",
    dimension: "decision_style",
    type: "social",
    semanticTags: ["hiring", "resume_vs_vibe", "human_resource"],
    options: [
      { text: "Özgeçmişi, teknik bilgisi ve bitirdiği projeler", weights: { decision_style: -2 } },
      { text: "Bana verdiği enerji, tutkusu ve uyumlu karakteri", weights: { decision_style: 2, attachment: 1 } },
      { text: "Problem çözme zekası ve kriz anındaki soğukkanlılığı", weights: { decision_style: -1, conflict_style: 1 } }
    ]
  },
  {
    id: "decision_style_sensory_02",
    text: "Yaşayacağın evi seçerken hangi kriter senin için vazgeçilmezdir?",
    dimension: "decision_style",
    type: "sensory",
    semanticTags: ["home_choice", "living_space", "vibe"],
    options: [
      { text: "Merkeze yakınlığı, fiyatı, depreme dayanıklılığı ve pratikliği", weights: { decision_style: -2, curiosity: -1 } },
      { text: "İçeri girdiğim andaki sıcak his, ışığın açısı ve manzarası", weights: { decision_style: 2, energy_rhythm: -1 } },
      { text: "Beni yansıtan özgün mimarisi ve dekorasyon potansiyeli", weights: { curiosity: 2, decision_style: 1 } }
    ]
  },
  {
    id: "decision_style_introspective_04",
    text: "Ahlaki bir ikilemle karşılaştığında rehberin hangisi olur?",
    dimension: "decision_style",
    type: "introspective",
    semanticTags: ["moral_dilemma", "ethics", "conscience"],
    options: [
      { text: "Evrensel yasalar, kurallar ve nesnel adalet ilkeleri", weights: { decision_style: -2, curiosity: -1 } },
      { text: "Vicdanımın sesi, kalbimin sızısı ve zarar görenlerin duyguları", weights: { decision_style: 2, attachment: 1 } },
      { text: "Durumun getireceği fayda ve zararların dengeli hesabı", weights: { decision_style: -1 } }
    ]
  },
  {
    id: "decision_style_symbolic_01",
    text: "Kader kelimesi senin için ne ifade eder?",
    dimension: "decision_style",
    type: "symbolic",
    semanticTags: ["destiny", "fate", "free_will"],
    options: [
      { text: "Rastlantılardan ibaret bir illüzyon, hayatımızı biz yazarız", weights: { decision_style: -2, curiosity: 1 } },
      { text: "Bizi yönlendiren gizli bir akış, teslim olmak huzur verir", weights: { decision_style: 2, energy_rhythm: -2 } },
      { text: "Gideceğimiz ana yollar çizilmiştir ama patikaları biz seçeriz", weights: { decision_style: 0, curiosity: 1 } }
    ]
  },
  {
    id: "decision_style_relational_02",
    text: "Sevgiline veya en yakın arkadaşına hediye seçerken nasıl bir yol izlersin?",
    dimension: "decision_style",
    type: "relational",
    semanticTags: ["gift_choice", "thoughtfulness", "present"],
    options: [
      { text: "İhtiyacı olan, işine yarayacak kullanışlı bir şey alırım", weights: { decision_style: -2 } },
      { text: "Aramızdaki bir espriyi veya duygusal bir anıyı simgeleyen özel bir şey", weights: { decision_style: 2, attachment: 2 } },
      { text: "Onun tarzına uygun, estetik ve şık bir aksesuar veya kıyafet", weights: { decision_style: 1, curiosity: 1 } }
    ]
  },
  {
    id: "decision_style_contradiction_01",
    text: "Geçmişte verdiğin hatalı bir karar aklına geldiğinde ne düşünürsün?",
    dimension: "decision_style",
    type: "contradiction",
    semanticTags: ["regretting_decisions", "past_errors", "self_forgiveness"],
    options: [
      { text: "\"O anki verilerle mantıklı olan oydu, tecrübe oldu\" der geçerim", weights: { decision_style: -2, curiosity: -1 } },
      { text: "\"Neden o hissime güvenmedim?\" diye kendimi suçlar, üzülürdem", weights: { decision_style: 2, attachment: 1 } },
      { text: "O hatanın beni bugünkü ben yapan yola nasıl soktuğunu analiz ederim", weights: { curiosity: 2, decision_style: 0 } }
    ]
  },
  {
    id: "decision_style_behavioral_03",
    text: "Zor bir mantık bulmacası veya zeka sorusuyla karşılaştığında ne hissedersin?",
    dimension: "decision_style",
    type: "behavioral",
    semanticTags: ["puzzle", "logic_game", "brain_teaser"],
    options: [
      { text: "Büyük keyif alırım, çözene kadar başından kalkmam", weights: { decision_style: -2, curiosity: 2 } },
      { text: "Biraz uğraşırım ama sıkılırsam hemen bırakırım", weights: { curiosity: 0 } },
      { text: "Beni çok sarmaz, pratik olmayan soyut sorularla vakit kaybetmem", weights: { decision_style: 2, curiosity: -2 } }
    ]
  },
  {
    id: "decision_style_instinctive_01",
    text: "Bir tartışmada birinin sırf duygusal ajitasyon yaparak haklı çıkmaya çalışması sende ne uyandırır?",
    dimension: "decision_style",
    type: "instinctive",
    semanticTags: ["logical_fallacies", "emotional_manipulation", "argument_feelings"],
    options: [
      { text: "Büyük bir iritasyon, hemen konuyu mantık zeminine çekerim", weights: { decision_style: -2, conflict_style: 1 } },
      { text: "Neden bu kadar dolduğunu anlamaya çalışır, hislerini dinlerim", weights: { decision_style: 2, emotional_expression: 1 } },
      { text: "Ortamı yumuşatmak için sessiz kalır, tartışmayı bitiririm", weights: { conflict_style: -2 } }
    ]
  },
  {
    id: "decision_style_projection_02",
    text: "Geleceğini planlarken hangisi senin için daha önceliklidir?",
    dimension: "decision_style",
    type: "projection",
    semanticTags: ["future_planning", "security_vs_freedom", "ideals"],
    options: [
      { text: "Finansal güvence, sağlam bir ev ve sürprizsiz bir yaşam düzeni", weights: { decision_style: -2, curiosity: -2 } },
      { text: "Hayallerimi gerçekleştirebileceğim, heyecanımı diri tutan özgür bir hayat", weights: { decision_style: 2, curiosity: 2 } },
      { text: "Sevdiklerimle bir arada olabileceğim huzurlu bir komün yaşamı", weights: { attachment: 2, decision_style: 1 } }
    ]
  },
  {
    id: "decision_q19",
    text: "Uzman bir doktor sana bir teşhis koysa ama içindeki his tamamen başka bir şey söylese hangisini yaparsın?",
    dimension: "decision_style",
    type: "instinctive",
    semanticTags: ["doctor_instinct", "expert_advice", "body_feelings"],
    options: [
      { text: "Doktorun rasyonel bilgisine güvenir, harfiyen uyarım", weights: { decision_style: -2 } },
      { text: "İkinci bir doktora gider, bilimsel verileri karşılaştırırım", weights: { decision_style: -1, curiosity: 1 } },
      { text: "Kendi hislerimi dinler, alternatif veya hissime uyan yollar ararım", weights: { decision_style: 2, curiosity: 2 } }
    ]
  },
  {
    id: "decision_q20",
    text: "Sana göre zeka mı daha üstün bir erdemdir yoksa şefkat mi?",
    dimension: "decision_style",
    type: "introspective",
    semanticTags: ["intelligence_vs_compassion", "virtue", "humanity"],
    options: [
      { text: "Zeka, çünkü dünyayı rasyonel akıl ve teknoloji ileri taşır", weights: { decision_style: -2, curiosity: 1 } },
      { text: "Şefkat, çünkü şefkatsiz zeka dünyayı sadece yıkıma sürükler", weights: { decision_style: 2, attachment: 1 } },
      { text: "İkisinin kusursuz dengesi, yani bilgece sevgi", weights: { decision_style: 0 } }
    ]
  },

  // ==========================================
  // ATTACHMENT (q81 - q100)
  // ==========================================
  {
    id: "attachment_relational_01",
    text: "Bir ilişkide kendini en çok hangi anlarda güvende hissedersin?",
    dimension: "attachment",
    type: "relational",
    semanticTags: ["relationship_safety", "emotional_bond", "independence"],
    options: [
      { text: "Kendi alanıma ve özgürlüğüme tamamen saygı duyulduğunda", weights: { attachment: -2, social_energy: -1 } },
      { text: "Bana açıkça sevildiğimin, değer verildiğimin sürekli söylendiği anlarda", weights: { attachment: 2, emotional_expression: 1 } },
      { text: "Birlikte sessizliği huzurla paylaşabildiğimiz dingin anlarda", weights: { attachment: -1, energy_rhythm: -2 } }
    ]
  },
  {
    id: "attachment_introspective_01",
    text: "Duygusal bir yara aldığında veya hayal kırıklığı yaşadığında iyileşme sürecin nasıldır?",
    dimension: "attachment",
    type: "introspective",
    semanticTags: ["emotional_healing", "scarring", "support_seeking"],
    options: [
      { text: "Tek başıma kabuğuma çekilir, kimseyle konuşmadan zamanın geçmesini beklerim", weights: { attachment: -2, emotional_expression: -1 } },
      { text: "Görülmeye, anlaşılmaya ve şefkatle sarmalanmaya yoğun ihtiyaç duyarım", weights: { attachment: 2, emotional_expression: 1 } },
      { text: "O acıyı sonuna kadar yaşar, sonra hızla yeni bir sayfaya atlarım", weights: { energy_rhythm: 2 } }
    ]
  },
  {
    id: "attachment_relational_02",
    text: "Birlikte olduğun partnerinden beklentilerini en iyi hangisi tarif eder?",
    dimension: "attachment",
    type: "relational",
    semanticTags: ["partner_expectations", "intimacy_level", "ideal_partner"],
    options: [
      { text: "Beni boğmaması, kendi sınırlarıma ve yalnızlığıma saygı duyması", weights: { attachment: -2, social_energy: -1 } },
      { text: "Bana her an yanımda olduğunu hissettirmesi ve sürekli paylaşımda bulunması", weights: { attachment: 2, social_energy: 1 } },
      { text: "Zihinsel ve ruhsal düzeyde derin, sessiz bir uyum yakalamamız", weights: { curiosity: 1, attachment: 0 } }
    ]
  },
  {
    id: "attachment_instinctive_01",
    text: "Partnerin arkadaşlarıyla senin olmadığın bir plana gideceğini söylediğinde içinden geçen ilk his ne olur?",
    dimension: "attachment",
    type: "instinctive",
    semanticTags: ["partner_going_out", "jealousy", "separation_anxiety"],
    options: [
      { text: "Memnun olurum, bana da kendimle kalacak harika bir zaman kalır", weights: { attachment: -2, social_energy: -1 } },
      { text: "Normal karşılarım ama hafif bir eksiklik hissederim", weights: { attachment: 0 } },
      { text: "Hafif bir huzursuzluk çöker, bensiz daha mı çok eğleneceğini düşünürüm", weights: { attachment: 2 } }
    ]
  },
  {
    id: "attachment_behavioral_01",
    text: "İlişkilerinde partnerinle ne sıklıkla mesajlaşmak veya konuşmak istersin?",
    dimension: "attachment",
    type: "behavioral",
    semanticTags: ["texting_frequency", "connection_habits", "reassurance"],
    options: [
      { text: "Günde birkaç kez haberleşmek yeterlidir, sürekli telefonda olamam", weights: { attachment: -2 } },
      { text: "Gün içine yayılmış, tatlı ve acelesiz bir haber akışı isterim", weights: { attachment: 0 } },
      { text: "Gün boyu sürekli iletişimde olmak, her anı paylaşmak bana güven verir", weights: { attachment: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "attachment_behavioral_02",
    text: "Zor bir durumla (örneğin taşınma, hastalık) karşılaştığında insanlardan yardım ister misin?",
    dimension: "attachment",
    type: "behavioral",
    semanticTags: ["asking_for_help", "self_reliance", "dependency"],
    options: [
      { text: "Asla istemem, tek başıma halledene kadar kendimi yıpratırım", weights: { attachment: -2 } },
      { text: "Sadece son çare olarak, en yakınlarımdan yardım rica ederim", weights: { attachment: -1 } },
      { text: "Hiç çekinmem, yardımlaşmanın bağları güçlendirdiğine inanırım", weights: { attachment: 2, social_energy: 1 } }
    ]
  },
  {
    id: "attachment_relational_03",
    text: "Partnerinle telefon şifrelerini veya özel hesaplarını paylaşmak konusunda ne düşünürsün?",
    dimension: "attachment",
    type: "relational",
    semanticTags: ["passwords", "privacy_boundaries", "trust"],
    options: [
      { text: "Kesinlikle karşıyım, herkesin tamamen gizli bir alanı olmalıdır", weights: { attachment: -2 } },
      { text: "İhtiyaç duyulursa bakabilir ama genel olarak ayrı kalmalıdır", weights: { attachment: -1 } },
      { text: "Hiç saklayacak bir şeyim yok, şifrelerimi bilmesinde sorun görmem", weights: { attachment: 2 } }
    ]
  },
  {
    id: "attachment_introspective_02",
    text: "Bir ayrılık sonrasında eski partnerini tamamen unutma ve hayatına devam etme tarzın?",
    dimension: "attachment",
    type: "introspective",
    semanticTags: ["breakup_recovery", "letting_go", "clinging"],
    options: [
      { text: "Hızla bağlarımı koparırım, geri dönüp asla arkama bakmam", weights: { attachment: -2, energy_rhythm: 1 } },
      { text: "Acısını çekerim ama zamanla kabullenir, hayatıma odaklanırım", weights: { attachment: 0 } },
      { text: "Uzun süre kopamam, gizlice takip eder, tekrar barışma hayalleri kurarım", weights: { attachment: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "attachment_relational_04",
    text: "İçinde bir güvensizlik hissettiğinde partnerinden nasıl bir onay/reassurance beklersin?",
    dimension: "attachment",
    type: "relational",
    semanticTags: ["reassurance_needs", "insecurity", "validation"],
    options: [
      { text: "Göstermemeye çalışırım, kendi içimde bu hissi çürütürüm", weights: { attachment: -2, emotional_expression: -1 } },
      { text: "Mesafeli veya soğuk davranarak onun gelip sormasını beklerim", weights: { attachment: 1, conflict_style: -1 } },
      { text: "Açıkça sorarım: \"Beni hala seviyor musun, her şey yolunda mı?\"", weights: { attachment: 2, emotional_expression: 2 } }
    ]
  },
  {
    id: "attachment_instinctive_02",
    text: "Sana çok yakınlaşmak isteyen, sürekli seninle vakit geçiren birinin bu ilgisi sende ne hissettirir?",
    dimension: "attachment",
    type: "instinctive",
    semanticTags: ["smothering", "too_close", "fear_of_intimacy"],
    options: [
      { text: "Üzerime geliniyormuş gibi boğulma hissi ve kaçma dürtüsü yaratır", weights: { attachment: -2, conflict_style: -1 } },
      { text: "Biraz yavaşlamasını isterim ama ilgisinden de memnun olurum", weights: { attachment: 0 } },
      { text: "Çok mutlu olurum, bu yoğun yakınlık bana aradığım sevgiyi hissettirir", weights: { attachment: 2, social_energy: 1 } }
    ]
  },
  {
    id: "attachment_projection_01",
    text: "Uzun mesafeli bir ilişki (farklı şehirler/ülkeler) yaşamak senin için ne kadar mümkündür?",
    dimension: "attachment",
    type: "projection",
    semanticTags: ["long_distance", "attachment_distance", "romance"],
    options: [
      { text: "Bana çok uygundur, hem kendi hayatımı yaşarım hem de bir bağım olur", weights: { attachment: -2, social_energy: -1 } },
      { text: "Zordur ama gelecekte birleşme umudu varsa sabredebilirim", weights: { attachment: 0 } },
      { text: "İmkansızdır, fiziksel yakınlık ve günlük temas olmadan bağ kuramam", weights: { attachment: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "attachment_behavioral_03",
    text: "Yeni tanıştığın birine hayatının en derin sırlarını ne kadar sürede açabilirsin?",
    dimension: "attachment",
    type: "behavioral",
    semanticTags: ["trust_speed", "vulnerability_timing", "strangers"],
    options: [
      { text: "Yıllar geçse bile bazı sırlarımı asla kimseye söylemem", weights: { attachment: -2, emotional_expression: -2 } },
      { text: "Ancak aylarca süren derin bir dostluk ve güvenden sonra", weights: { attachment: -1 } },
      { text: "Eğer iyi bir enerji aldıysam birkaç gün içinde her şeyimi anlatabilirim", weights: { attachment: 2, emotional_expression: 2 } }
    ]
  },
  {
    id: "attachment_social_01",
    text: "Partnerinin ailesi ve arkadaşlarıyla tanışmak konusunda ne kadar isteklisindir?",
    dimension: "attachment",
    type: "social",
    semanticTags: ["meeting_family", "social_integration", "commitment"],
    options: [
      { text: "Mümkün olduğunca geciktiririm, o kadar yakınlaşmak beni gerer", weights: { attachment: -2, social_energy: -1 } },
      { text: "İlişki ciddileşince, doğal akışında kabul ederim", weights: { attachment: 0 } },
      { text: "Erkenden tanışmak, onun hayatının bir parçası olmak beni heyecanlandırır", weights: { attachment: 2, social_energy: 2 } }
    ]
  },
  {
    id: "attachment_symbolic_01",
    text: "Sence mükemmel bir ilişki hangisine benzer?",
    dimension: "attachment",
    type: "symbolic",
    semanticTags: ["ideal_relationship", "love_metaphor", "partnership"],
    options: [
      { text: "Kendi gökyüzünde uçan iki bağımsız kuşun yollarının kesişmesi", weights: { attachment: -2, curiosity: 2 } },
      { text: "Fırtınalı denizlerde birbirine sığınan iki yelkenli", weights: { attachment: 1, energy_rhythm: -1 } },
      { text: "Tek bir bedende birleşen, birbirinden hiç ayrılmayan iki ruh", weights: { attachment: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "attachment_introspective_03",
    text: "Partnerinin bir gün seni terk edeceği veya artık sevmeyeceği korkusu zihnini ne sıklıkla kurcalar?",
    dimension: "attachment",
    type: "introspective",
    semanticTags: ["abandonment_fear", "insecurity_triggers", "overthinking"],
    options: [
      { text: "Neredeyse hiç kurcalamaz, kendime ve bağıma güvenirim", weights: { attachment: -2 } },
      { text: "Ara sıra, ilişkimizde bir soğukluk olduğunda aklıma gelir", weights: { attachment: 0 } },
      { text: "Çok sık bu korkuyu yaşarım, en küçük bir mesafede paniklerim", weights: { attachment: 2, conflict_style: -1 } }
    ]
  },
  {
    id: "attachment_instinctive_03",
    text: "Bir arkadaşın planı son dakikada iptal ettiğinde içinde uyanan ilk ses ne der?",
    dimension: "attachment",
    type: "instinctive",
    semanticTags: ["cancelation_reaction", "rejection", "friendship"],
    options: [
      { text: "\"Harika, evde kalıp dinlenebileceğim\" der, hiç umursamam", weights: { attachment: -2, social_energy: -1 } },
      { text: "\"Önemli bir işi çıkmıştır\" der, anlayışla karşılarım", weights: { attachment: 0 } },
      { text: "\"Beni yeterince önemsemiyor, bilerek yaptı\" der, kırılırım", weights: { attachment: 2, conflict_style: 1 } }
    ]
  },
  {
    id: "attachment_sensory_01",
    text: "Evinde yalnız kalma süren uzadığında hissettiğin şey hangisidir?",
    dimension: "attachment",
    type: "sensory",
    semanticTags: ["home_alone", "isolation_feeling", "stillness"],
    options: [
      { text: "Huzurlu bir özgürlük ve pillerimin dolduğunu hissetmek", weights: { attachment: -2, social_energy: -1 } },
      { text: "İlk günler güzeldir ama sonra bir boşluk hissi çöker", weights: { attachment: 0 } },
      { text: "Hızla yalnızlık acısına dönüşür, bir ses duymak isterim", weights: { attachment: 2, social_energy: 1 } }
    ]
  },
  {
    id: "attachment_contradiction_01",
    text: "Partnerine karşı duyduğun öfkeyi göstermek konusunda nasılsındır?",
    dimension: "attachment",
    type: "contradiction",
    semanticTags: ["anger_in_love", "conflict_attachment", "withholding"],
    options: [
      { text: "Onu kaybetmekten korktuğum için öfkemi içime gömerim", weights: { attachment: 2, conflict_style: -2 } },
      { text: "Sakinleşince konuşurum, öfkeyle bağları yıpratmak istemem", weights: { attachment: 0, conflict_style: -1 } },
      { text: "Öfkemi anında kusarım, beni seven her halimle kabul etmeli derim", weights: { attachment: -1, conflict_style: 2 } }
    ]
  },
  {
    id: "attachment_introspective_04",
    text: "Bir ilişkide \"bağımlılık\" kelimesine bakışın nasıldır?",
    dimension: "attachment",
    type: "introspective",
    semanticTags: ["dependency_view", "attachment_theory", "closeness"],
    options: [
      { text: "Zararlı bir pranga, insan her zaman kendine yetebilmelidir", weights: { attachment: -2, decision_style: -1 } },
      { text: "Abartılmadığı sürece sevginin doğal bir yan ürünüdür", weights: { attachment: 0 } },
      { text: "Aşk zaten tatlı bir bağımlılıktır, iki kişinin tek olmasıdır", weights: { attachment: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "attachment_relational_05",
    text: "İlişkilerinde partnerinin senin üzerindeki kararlara (ne giyeceğin, nereye gideceğin) karışması?",
    dimension: "attachment",
    type: "relational",
    semanticTags: ["partner_control", "boundaries_clash", "freedom_needs"],
    options: [
      { text: "Büyük bir öfkeyle karşı çıkarım, sınırlarımı kimseye çiğnetmem", weights: { attachment: -2, conflict_style: 2 } },
      { text: "Fikir vermesini severim ama son kararı her zaman ben veririm", weights: { attachment: -1 } },
      { text: "Hoşuma gider, onun beni sahiplendiğini ve düşündüğünü hissederim", weights: { attachment: 2 } }
    ]
  },

  // ==========================================
  // ENERGY RHYTHM (q101 - q120)
  // ==========================================
  {
    id: "energy_rhythm_behavioral_01",
    text: "Hayatındaki ritmi genel olarak nasıl tanımlarsın?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["life_pace", "rhythm_profile", "flow"],
    options: [
      { text: "Durağan, sessiz, öngörülebilir ve telaşsız", weights: { energy_rhythm: -2, curiosity: -1 } },
      { text: "Duruma göre değişen, esnek ve dengeli", weights: { energy_rhythm: 0 } },
      { text: "Dalgalı, tutkulu, hızlı ve heyecan dolu", weights: { energy_rhythm: 2, curiosity: 1 } }
    ]
  },
  {
    id: "energy_rhythm_relational_01",
    text: "Aşkı veya çok derin bir bağı yaşarken içindeki tempo nasıldır?",
    dimension: "energy_rhythm",
    type: "relational",
    semanticTags: ["love_tempo", "intensity_romance", "romance_speed"],
    options: [
      { text: "Sakin ama çok derin, zamanla sessizce büyüyen ve kopmayan", weights: { energy_rhythm: -2, emotional_expression: -1 } },
      { text: "Yavaş gelişen, güven adımlarıyla örülen sakin bir tempo", weights: { energy_rhythm: -1, attachment: -1 } },
      { text: "Yoğun, hızlı, tutkulu ve adeta yangın gibi başlayan", weights: { energy_rhythm: 2, attachment: 1 } }
    ]
  },
  {
    id: "energy_rhythm_sensory_01",
    text: "Hayatının genel arka plan müziği olsaydı, tınısı hangisine daha yakın olurdu?",
    dimension: "energy_rhythm",
    type: "sensory",
    semanticTags: ["life_soundtrack", "music_vibes", "metaphor"],
    options: [
      { text: "Sakin, derin piyano veya hüzünlü akustik melodiler", weights: { energy_rhythm: -2, emotional_expression: -1 } },
      { text: "Sürekli değişen, bazen sakin bazen coşkulu senfoniler", weights: { energy_rhythm: 0, curiosity: 1 } },
      { text: "Hareketli, neşeli, hızlı vuruşlar ve ritmik baslar", weights: { energy_rhythm: 2, social_energy: 1 } }
    ]
  },
  {
    id: "energy_rhythm_sensory_02",
    text: "Sessizlik senin ruhunda nasıl bir yankı bulur?",
    dimension: "energy_rhythm",
    type: "sensory",
    semanticTags: ["silence_effect", "stillness", "mind_noise"],
    options: [
      { text: "Huzur veren, pillerimi dolduran güvenli bir sığınak", weights: { energy_rhythm: -2, social_energy: -2 } },
      { text: "Zihnimin derinliklerine açılan felsefi bir tefekkür kapısı", weights: { curiosity: 1, decision_style: -1 } },
      { text: "Beni rahatsız eden, hemen müzik veya sesle doldurmam gereken bir boşluk", weights: { energy_rhythm: 2, social_energy: 1 } }
    ]
  },
  {
    id: "energy_rhythm_behavioral_02",
    text: "Sabahları uyandığında enerjinin yükselme hızı nasıldır?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["morning_energy", "wakeup", "daily_start"],
    options: [
      { text: "Çok yavaş, kendime gelmek için saatlerce sessizliğe ihtiyaç duyarım", weights: { energy_rhythm: -2, social_energy: -1 } },
      { text: "Normal, kahvemi içtikten sonra güne hazır olurum", weights: { energy_rhythm: 0 } },
      { text: "Hızla uyanır, hemen yataktan fırlayıp güne aktif başlarım", weights: { energy_rhythm: 2, social_energy: 1 } }
    ]
  },
  {
    id: "energy_rhythm_behavioral_03",
    text: "Aynı anda birden fazla işi yürütmek (multitasking) sende nasıl bir etki yaratır?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["multitasking", "focus_vs_chaos", "working_rhythm"],
    options: [
      { text: "Beni felç eder, tek bir işe odaklanıp onu sakince bitirmek isterim", weights: { energy_rhythm: -2, curiosity: -1 } },
      { text: "Beni yorar ama mecbur kalırsam idare edebilirim", weights: { energy_rhythm: 0 } },
      { text: "Beni besler, adrenalin verir, tempo beni uyanık tutar", weights: { energy_rhythm: 2, curiosity: 1 } }
    ]
  },
  {
    id: "energy_rhythm_instinctive_01",
    text: "İnternet yavaşladığında veya bir sayfa yüklenmediğinde içinden geçen ilk tepki?",
    dimension: "energy_rhythm",
    type: "instinctive",
    semanticTags: ["slow_internet", "patience", "delays"],
    options: [
      { text: "Derin bir nefes alır, beklerim veya başka bir şeyle ilgilenirim", weights: { energy_rhythm: -2, conflict_style: -1 } },
      { text: "Hafifçe homurdanır, sayfayı yenileyip dururum", weights: { energy_rhythm: 0 } },
      { text: "Sinirlenir, telefonu/mouse'u fırlatmak isterim, tahammülüm sıfırdır", weights: { energy_rhythm: 2, conflict_style: 1 } }
    ]
  },
  {
    id: "energy_rhythm_behavioral_04",
    text: "Otobüse veya trene yetişmek için koşman gerektiğinde ne yaparsın?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["catching_train", "rush", "pacing_life"],
    options: [
      { text: "Koşmam, kaçarsa bir sonrakini beklerim, aceleye gerek yok derim", weights: { energy_rhythm: -2, decision_style: 1 } },
      { text: "Hafifçe hızlanırım ama kendimi hırpalamam", weights: { energy_rhythm: 0 } },
      { text: "Nefesim kesilene kadar depar atarım, o trene kesinlikle binmeliyim", weights: { energy_rhythm: 2, curiosity: 1 } }
    ]
  },
  {
    id: "energy_rhythm_sensory_03",
    text: "Yemek yeme hızını ve yemeğe bakışını en iyi hangisi açıklar?",
    dimension: "energy_rhythm",
    type: "sensory",
    semanticTags: ["eating_speed", "savoring", "hunger"],
    options: [
      { text: "Çok yavaş, her lokmanın tadını çıkararak ve sohbet ederek", weights: { energy_rhythm: -2, social_energy: 0 } },
      { text: "Normal bir tempoda, doymak ve keyif almak arasında dengeli", weights: { energy_rhythm: 0 } },
      { text: "Hızla yer bitiririm, yemek yemek benim için bir yakıt ikmalidir", weights: { energy_rhythm: 2, decision_style: -1 } }
    ]
  },
  {
    id: "energy_rhythm_introspective_01",
    text: "İçindeki yaratıcı veya üretken enerjinin gelişi nasıldır?",
    dimension: "energy_rhythm",
    type: "introspective",
    semanticTags: ["creative_spurt", "productivity", "inspiration"],
    options: [
      { text: "Düzenli, her gün aynı saatte çalışarak ortaya çıkan disiplinli akış", weights: { energy_rhythm: -2, curiosity: -2 } },
      { text: "Zaman zaman gelen ama genelde kontrol edebildiğim bir ritim", weights: { energy_rhythm: 0 } },
      { text: "Beklenmedik anlarda gelen, beni uykusuz bırakan ani ilham patlamaları", weights: { energy_rhythm: 2, curiosity: 2 } }
    ]
  },
  {
    id: "energy_rhythm_behavioral_05",
    text: "Günde kaç fincan kahve veya çay gibi uyarıcılara ihtiyaç duyarsın?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["stimulants", "caffeine", "energy_level"],
    options: [
      { text: "Neredeyse hiç kullanmam, kendi doğal enerjim bana yeter", weights: { energy_rhythm: -2 } },
      { text: "Keyif için günde 1-2 fincan içerim", weights: { energy_rhythm: 0 } },
      { text: "Sürekli ayakta kalmak ve odaklanmak için gün boyu tüketirim", weights: { energy_rhythm: 2, decision_style: -1 } }
    ]
  },
  {
    id: "energy_rhythm_instinctive_02",
    text: "Trafik sıkışıklığında kaldığında içindeki enerjinin durumu ne olur?",
    dimension: "energy_rhythm",
    type: "instinctive",
    semanticTags: ["traffic_rage", "stuck_in_car", "stress_rhythm"],
    options: [
      { text: "Müziği açar, kendi dünyama dalarım, yapacak bir şey yok derim", weights: { energy_rhythm: -2, conflict_style: -1 } },
      { text: "Sıkılırım ama sabrederim, arada saate bakarım", weights: { energy_rhythm: 0 } },
      { text: "Direksiyona vurur, korna basar ve söylenip dururum", weights: { energy_rhythm: 2, conflict_style: 2 } }
    ]
  },
  {
    id: "energy_rhythm_behavioral_06",
    text: "Gittiğin bir tatilde günlerini nasıl planlarsın?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["vacation_planning", "holiday_rhythm", "leisure"],
    options: [
      { text: "Sadece şezlongda yatmak, hiçbir şey yapmadan saatlerce denizi izlemek", weights: { energy_rhythm: -2, curiosity: -1 } },
      { text: "Birkaç tarihi yer gezip sonra sakince dinlenmek", weights: { energy_rhythm: 0 } },
      { text: "Sabahtan geceye kadar her saati dolu, ekstrem sporlu bir macera", weights: { energy_rhythm: 2, curiosity: 2 } }
    ]
  },
  {
    id: "energy_rhythm_behavioral_07",
    text: "Acil ve çok sıkışık bir son teslim tarihi (deadline) önünde durduğunda nasıl çalışırsın?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["deadline_stress", "working_under_pressure", "focus"],
    options: [
      { text: "Panik olurum, verimim düşer, sakin bir çalışma ortamı ararım", weights: { energy_rhythm: -2, decision_style: 1 } },
      { text: "Planlı bir şekilde bölerek, paniklemeden bitirmeye çalışırım", weights: { energy_rhythm: 0, decision_style: -1 } },
      { text: "Adrenalin beni aşırı odaklar, son dakikada mucizeler yaratırım", weights: { energy_rhythm: 2 } }
    ]
  },
  {
    id: "energy_rhythm_introspective_02",
    text: "Sence hayatın hızı şu an senin iç ritmine ne kadar uygundur?",
    dimension: "energy_rhythm",
    type: "introspective",
    semanticTags: ["life_speed", "inner_alignment", "exhaustion"],
    options: [
      { text: "Çok hızlı, her şey üzerime geliyor ve yavaşlamak istiyorum", weights: { energy_rhythm: -2, emotional_expression: -1 } },
      { text: "Dengeli, hayatın akışıyla kendi ritmim uyum içinde", weights: { energy_rhythm: 0 } },
      { text: "Çok yavaş, daha fazla aksiyon ve dinamizm arıyorum", weights: { energy_rhythm: 2, curiosity: 1 } }
    ]
  },
  {
    id: "energy_rhythm_symbolic_01",
    text: "Ruhunu bir nehre benzetsen, bu nehir nasıl akardı?",
    dimension: "energy_rhythm",
    type: "symbolic",
    semanticTags: ["river_metaphor", "inner_flow", "nature_symbols"],
    options: [
      { text: "Geniş bir ovada, neredeyse hiç hareket etmiyormuş gibi süzülen dingin bir nehir", weights: { energy_rhythm: -2, social_energy: -1 } },
      { text: "Kayalar arasından kıvrılan, tatlı şırıltılarla akan berrak bir dere", weights: { energy_rhythm: 0, curiosity: 1 } },
      { text: "Dağlardan çağlayan, önüne çıkan her şeyi sürükleyen coşkulu bir şelale", weights: { energy_rhythm: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "energy_rhythm_behavioral_08",
    text: "Bir seyahate çıkmadan önce valizini ne zaman hazırlarsın?",
    dimension: "energy_rhythm",
    type: "behavioral",
    semanticTags: ["packing", "trip_prep", "anxiety_rhythm"],
    options: [
      { text: "Günler öncesinden liste yapar, eksiksiz hazırlarım", weights: { energy_rhythm: -2, curiosity: -2 } },
      { text: "Gidişten bir önceki akşam sakince toplarım", weights: { energy_rhythm: 0 } },
      { text: "Evden çıkmadan son 1 saatte her şeyi valize tıkıştırırım", weights: { energy_rhythm: 2, curiosity: 2 } }
    ]
  },
  {
    id: "energy_rhythm_instinctive_03",
    text: "Bir konuşma sırasında karşındaki insanın çok yavaş ve lafı uzatarak konuşması sende ne uyandırır?",
    dimension: "energy_rhythm",
    type: "instinctive",
    semanticTags: ["slow_talkers", "patience_limits", "irritation"],
    options: [
      { text: "Hiç sorun değil, sabırla dinler ve sözünü kesmem", weights: { energy_rhythm: -2, conflict_style: -1 } },
      { text: "İçimden sıkılırım ama belli etmemeye çalışırım", weights: { energy_rhythm: -1 } },
      { text: "Lafı ağzından almak isterim, cümlesini ben tamamlarım", weights: { energy_rhythm: 2, conflict_style: 2 } }
    ]
  },
  {
    id: "energy_rhythm_sensory_04",
    text: "Yorucu bir haftanın ardından yapacağın pazar kahvaltısının süresi?",
    dimension: "energy_rhythm",
    type: "sensory",
    semanticTags: ["sunday_breakfast", "weekend_unwind", "slow_living"],
    options: [
      { text: "Saatlerce süren, gazete okunup çay tazelenen sonsuz bir ritüel", weights: { energy_rhythm: -2, social_energy: -1 } },
      { text: "Normal, 1 saat içinde keyifle yenip kalkan bir kahvaltı", weights: { energy_rhythm: 0 } },
      { text: "Hızlıca atıştırıp hemen dışarı çıkmak, günü kaçırmamak", weights: { energy_rhythm: 2, social_energy: 1 } }
    ]
  },
  {
    id: "energy_rhythm_contradiction_01",
    text: "Hayatında ani ve köklü bir değişim (şehir, iş değişikliği) yapma fikri sende nasıl bir enerji yaratır?",
    dimension: "energy_rhythm",
    type: "contradiction",
    semanticTags: ["big_change", "relocation_energy", "vitality"],
    options: [
      { text: "Büyük bir endişe, düzenimin bozulmasından çok korkarım", weights: { energy_rhythm: -2, curiosity: -2 } },
      { text: "Tereddütlü ama gerekli görünürse kendimi hazırlarım", weights: { energy_rhythm: 0 } },
      { text: "Adrenalin ve taze bir kan, yenilenmiş ve çok canlı hissederim", weights: { energy_rhythm: 2, curiosity: 2 } }
    ]
  },

  // ==========================================
  // CURIOSITY (q121 - q140)
  // ==========================================
  {
    id: "curiosity_behavioral_01",
    text: "Yeni bir yere seyahat ettiğinde nasıl bir yol izlersin?",
    dimension: "curiosity",
    type: "behavioral",
    semanticTags: ["travel_style_route", "exploring_new", "spontaneity_travel"],
    options: [
      { text: "Her şeyi önceden planlar, gezilecek yerleri ve otelleri rezerve ederim", weights: { curiosity: -2, decision_style: -1 } },
      { text: "Sadece ana hatları belirler, gerisini yerel tavsiyelere göre keşfederim", weights: { curiosity: 1 } },
      { text: "Tamamen akışa bırakır, o an içimden gelen yöne doğru kaybolurum", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_introspective_01",
    text: "Hayatındaki belirsizliklerle karşılaştığında ilk hissettiğin ne olur?",
    dimension: "curiosity",
    type: "introspective",
    semanticTags: ["handling_uncertainty", "fear_vs_mystery", "unstable_ground"],
    options: [
      { text: "Huzursuzluk ve kaygı, hemen kontrolü ele alıp plan yapmak isterim", weights: { curiosity: -2, decision_style: -1 } },
      { text: "Biraz gerilirim ama zamanla yeni duruma uyum sağlayabileceğimi bilirim", weights: { curiosity: 0 } },
      { text: "Heyecan ve merak, yeni olasılıkların kapıda olduğunu hissederim", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_behavioral_02",
    text: "Günlük hayatındaki rutinler senin için ne ifade eder?",
    dimension: "curiosity",
    type: "behavioral",
    semanticTags: ["routines_view", "safety_net", "monotony"],
    options: [
      { text: "Güven, huzur ve zihinsel dinginlik veren sarsılmaz bir temel", weights: { curiosity: -2 } },
      { text: "Hayatı kolaylaştıran araçlar ama araya küçük heyecanlar katmayı severim", weights: { curiosity: 1 } },
      { text: "Boğucu prangalar, sürekli rutinleri yıkıp değişim ararım", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_behavioral_03",
    text: "Risk almak konusunda genel tavrın nasıldır?",
    dimension: "curiosity",
    type: "behavioral",
    semanticTags: ["risk_taking", "safety_first", "gamble"],
    options: [
      { text: "Mümkün olduğunca garantici olmayı seçer, maceralardan kaçınırım", weights: { curiosity: -2, decision_style: -1 } },
      { text: "Mantıklı bir fayda-risk analizi yaptıktan sonra adım atabilirim", weights: { decision_style: -2, curiosity: 1 } },
      { text: "Eğer sonunda yoğun bir his veya büyük bir deneyim varsa doğrudan dalarım", weights: { curiosity: 2, decision_style: 2 } }
    ]
  },
  {
    id: "curiosity_sensory_01",
    text: "Daha önce hiç duymadığın, egzotik ve çok farklı malzemeler içeren bir yemeği denemek?",
    dimension: "curiosity",
    type: "sensory",
    semanticTags: ["exotic_food", "taste_adventure", "weird_eating"],
    options: [
      { text: "Asla yemem, midemi riske atmam, bildiğim tatları tercih ederim", weights: { curiosity: -2 } },
      { text: "Kokusu ve görünümü çok itici değilse bir çatal alıp denerim", weights: { curiosity: 1 } },
      { text: "Heyecanla denerim, yeni tatlar keşfetmek benim için bir sanattır", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_sensory_02",
    text: "Kütüphanede veya kitapçıda gezinirken hangi raf seni mıknatıs gibi çeker?",
    dimension: "curiosity",
    type: "sensory",
    semanticTags: ["books_shelves", "reading_taste", "genre_choice"],
    options: [
      { text: "Tarih, biyografi veya kişisel gelişim gibi somut bilgi veren raflar", weights: { curiosity: -2, decision_style: -1 } },
      { text: "Şiir, klasik romanlar ve felsefe kitaplarının olduğu derin köşeler", weights: { curiosity: 1, decision_style: 1 } },
      { text: "Bilimkurgu, mitoloji veya gizemli/çözülmemiş olaylar rafları", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_behavioral_04",
    text: "Evinde bozulan bir elektronik aleti (örneğin kahve makinesi) ne yaparsın?",
    dimension: "curiosity",
    type: "behavioral",
    semanticTags: ["fixing_things", "do_it_yourself", "mechanics"],
    options: [
      { text: "Hemen yetkili servisi ararım, hiç anlamadığım işlere kalkışmam", weights: { curiosity: -2 } },
      { text: "İnternetten birkaç video izler, basit bir şeyse yapmaya çalışırım", weights: { curiosity: 1 } },
      { text: "İçini açar, çalışma mekanizmasını çözüp kendim tamir etmeye bayılırım", weights: { curiosity: 2 } }
    ]
  },
  {
    id: "curiosity_projection_01",
    text: "Sence uzayda yaşamın izlerini aramak veya başka gezegenlere gitmek?",
    dimension: "curiosity",
    type: "projection",
    semanticTags: ["space_travel", "cosmos", "future_humanity"],
    options: [
      { text: "Gereksiz bir para kaybı, önce dünyadaki sorunları çözmeliyiz", weights: { curiosity: -2, decision_style: -1 } },
      { text: "Bilimsel gelişim için gerekli ama benim hayatımı çok etkilemez", weights: { curiosity: 0 } },
      { text: "İnsanlığın asıl geleceği, orada olmak için her şeyimi verebilirdim", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_behavioral_05",
    text: "Tanıdık ve sürekli kullandığın bir markanın yeni bir ürünü çıktığında ne yaparsın?",
    dimension: "curiosity",
    type: "behavioral",
    semanticTags: ["brand_loyalty", "new_products", "buying_habits"],
    options: [
      { text: "Eski ürünümden memnun olduğum sürece yenisini denemem", weights: { curiosity: -2 } },
      { text: "Kullanıcı yorumlarını okur, iyiyse belki alırım", weights: { curiosity: 0 } },
      { text: "Hemen alır denerim, yenilikleri ilk deneyimleyen olmayı severim", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_introspective_02",
    text: "Ruhunun derinliklerinde yatan en büyük arzun hangisidir?",
    dimension: "curiosity",
    type: "introspective",
    semanticTags: ["deepest_desires", "inner_motivation", "destiny_metaphor"],
    options: [
      { text: "Huzurlu, güvenli ve sevdiklerimle çevrili sakin bir limana sığınmak", weights: { curiosity: -2, attachment: 2 } },
      { text: "Kendi yeteneklerimi parlatıp toplumda saygın bir yer edinmek", weights: { social_energy: 1, decision_style: -1 } },
      { text: "Dünyanın gizemlerini çözmek, hiç bilinmeyen yollardan yürümek", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_introspective_03",
    text: "Çocukken en çok hangi soruyu sorardın?",
    dimension: "curiosity",
    type: "introspective",
    semanticTags: ["childhood_questions", "why_questions", "origin"],
    options: [
      { text: "\"Nasıl yapılıyor?\" (Kuralları ve yapım aşamalarını anlamak için)", weights: { curiosity: -1, decision_style: -1 } },
      { text: "\"Neden?\" (Her şeyin altındaki gizli sebebi ve anlamı sorgulamak için)", weights: { curiosity: 2, decision_style: 1 } },
      { text: "\"Başka ne var?\" (Sınırların ötesini görmek ve keşfetmek için)", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  },
  {
    id: "curiosity_symbolic_01",
    text: "Ormanda yürürken haritada görünmeyen, eski ve terk edilmiş bir patika görsen ne yaparsın?",
    dimension: "curiosity",
    type: "symbolic",
    semanticTags: ["forest_path", "mystery_road", "exploration_symbol"],
    options: [
      { text: "Girmem, güvenliğim için ana yoldan sapmamayı tercih ederim", weights: { curiosity: -2, decision_style: -1 } },
      { text: "Biraz ilerisine bakar, tehlikeli görünmüyorsa devam ederim", weights: { curiosity: 1 } },
      { text: "Heyecanla dalarım, sonunun nereye çıkacağını görmem gerekir", weights: { curiosity: 2, energy_rhythm: 2 } }
    ]
  },
  {
    id: "curiosity_social_01",
    text: "Tamamen yabancı bir kültürden ve dilden insanlarla dolu bir masaya otursan ne yaparsın?",
    dimension: "curiosity",
    type: "social",
    semanticTags: ["foreign_culture", "language_barrier", "cultural_exchange"],
    options: [
      { text: "Çekingen kalırım, yanlış bir şey yapmamak için sadece izlerim", weights: { curiosity: -2, social_energy: -2 } },
      { text: "Beden diliyle selamlaşır, basit kelimelerle iletişim kurmaya çalışırım", weights: { curiosity: 1, social_energy: 0 } },
      { text: "Kültürlerini, geleneklerini öğrenmek için sorular yağdırırım", weights: { curiosity: 2, social_energy: 2 } }
    ]
  },
  {
    id: "curiosity_introspective_04",
    text: "Yeni bir felsefi akım veya karmaşık bir fizik teorisi duyduğunda ilk refleksin?",
    dimension: "curiosity",
    type: "introspective",
    semanticTags: ["philosophy_theory", "intellectual_taste", "complex_ideas"],
    options: [
      { text: "Beni aşan soyut konular der, geçiştiririm", weights: { curiosity: -2 } },
      { text: "Hafifçe inceler, genel hatlarını bilmek isterim", weights: { curiosity: 1 } },
      { text: "Makaleler okur, videolar izler, zihnimi o teoriyle günlerce yorarım", weights: { curiosity: 2, decision_style: -1 } }
    ]
  },
  {
    id: "curiosity_sensory_03",
    text: "Eski tarihi kalıntıları veya antik harabeleri gezerken aklından ne geçer?",
    dimension: "curiosity",
    type: "sensory",
    semanticTags: ["ruins", "historical_places", "past_mysteries"],
    options: [
      { text: "Sadece eski taşlar derim, mimariyi incelerim", weights: { curiosity: -2 } },
      { text: "Burada yaşamış insanların hayatlarını hayal etmeye çalışırım", weights: { curiosity: 1, decision_style: 1 } },
      { text: "O dönemdeki gizemleri, yaşanmış aşkları ve savaşları hissedip ürperirim", weights: { curiosity: 2, emotional_expression: 1 } }
    ]
  },
  {
    id: "curiosity_behavioral_06",
    text: "Sıra dışı veya tuhaf koleksiyonlar yapmak (örneğin deniz kabukları, antika anahtarlar) ilgini çeker mi?",
    dimension: "curiosity",
    type: "behavioral",
    semanticTags: ["collections", "hobbies", "quirky_habits"],
    options: [
      { text: "Gereksiz toz tutan eşyalar derim, minimalizmi severim", weights: { curiosity: -2 } },
      { text: "Estetik duran birkaç objeyi biriktirebilirim", weights: { curiosity: 1 } },
      { text: "Hikayesi olan ilginç nesneleri aramaya ve biriktirmeye bayılırım", weights: { curiosity: 2 } }
    ]
  },
  {
    id: "curiosity_social_02",
    text: "Sence kurallar ve toplumsal normlar ne için vardır?",
    dimension: "curiosity",
    type: "social",
    semanticTags: ["rules_views", "society_norms", "order_vs_freedom"],
    options: [
      { text: "Toplumun güvenliği ve düzeni için sarsılmadan uyulması gereken duvarlar", weights: { curiosity: -2, decision_style: -1 } },
      { text: "Gerektiğinde esnetilebilecek genel kılavuzlar", weights: { curiosity: 0 } },
      { text: "Sorgulanması ve aşılması gereken, özgürlüğü kısıtlayan engeller", weights: { curiosity: 2, conflict_style: 1 } }
    ]
  },
  {
    id: "curiosity_symbolic_02",
    text: "Rüyalarına ve onların anlamlarına ne kadar değer verirsin?",
    dimension: "curiosity",
    type: "symbolic",
    semanticTags: ["dreams_meaning", "subconscious", "mystery"],
    options: [
      { text: "Beynin gün içindeki verileri temizlemesidir, üzerinde durmam", weights: { curiosity: -2, decision_style: -2 } },
      { text: "Bazen ilginç bulur, uyanınca hatırlarım", weights: { curiosity: 1 } },
      { text: "Bilinçaltımın bana fısıldadığı sembolik mesajlar olarak derinlemesine yorarırım", weights: { curiosity: 2, decision_style: 2 } }
    ]
  },
  {
    id: "curiosity_behavioral_07",
    text: "Yeni bir işe başlarken senin için en çekici olan aşama hangisidir?",
    dimension: "curiosity",
    type: "behavioral",
    semanticTags: ["starting_new_job", "first_steps", "excitement_curve"],
    options: [
      { text: "İşi tamamen öğrenip rutine bağladığım ve ustalaştığım o güvenli dönem", weights: { curiosity: -2 } },
      { text: "İlk zorlukları aşıp sistemin nasıl çalıştığını çözdüğüm an", weights: { curiosity: 1 } },
      { text: "Hiçbir şey bilmediğim, her gün yeni bir şey keşfettiğim o ilk başlangıç heyecanı", weights: { curiosity: 2, energy_rhythm: 2 } }
    ]
  },
  {
    id: "curiosity_projection_02",
    text: "Eğer zaman makinen olsaydı hangi yöne seyahat etmek isterdin?",
    dimension: "curiosity",
    type: "projection",
    semanticTags: ["time_travel", "past_vs_future", "destination"],
    options: [
      { text: "Gitmeyi tercih etmem, bugünü ve anı yaşamak en doğrusudur", weights: { curiosity: -2 } },
      { text: "Geçmişe, tarihi olayları canlı canlı izlemek ve kökenlerimi görmek için", weights: { curiosity: 1, decision_style: 1 } },
      { text: "Geleceğe, insanlığın nereye vardığını ve teknolojinin sınırlarını görmek için", weights: { curiosity: 2, energy_rhythm: 1 } }
    ]
  }
];

const BASE_ARCHETYPES = [
  {
    id: "moonwater",
    name: "Gölge Suyu (Moonwater)",
    description: "Sakin, derin ve yansıtıcı. Sessizce hisseden, kendi alanını koruyan ama sevdiklerine sonsuz şefkat sunan bir yapı.",
    conditions: { social_energy: -1, energy_rhythm: -1, emotional_expression: -1 }
  },
  {
    id: "wildfire",
    name: "Ateş Ruhu (Wildfire)",
    description: "Tutkulu, hızlı ve dışa dönük. Duygularını yoğun yaşayan, coşkulu ve girdiği ortamı aydınlatan bir enerji.",
    conditions: { social_energy: 1, energy_rhythm: 1, emotional_expression: 1 }
  },
  {
    id: "earthanchor",
    name: "Köklenmiş Çınar (Earth Anchor)",
    description: "Mantıklı, sakin, güven veren. Fırtınalarda savrulmayan, sevdiklerine güvenli bir liman olan kararlı bir duruş.",
    conditions: { decision_style: -1, conflict_style: -1, energy_rhythm: -1 }
  },
  {
    id: "windseeker",
    name: "Rüzgar Gezgini (Wind Seeker)",
    description: "Meraklı, özgür, keşfetmeyi seven. Bağlanmaktan çok deneyimlemeyi seçen, sınırları sevmeyen bir hava enerjisi.",
    conditions: { curiosity: 1, attachment: -1, social_energy: 1 }
  },
  {
    id: "starweaver",
    name: "Yıldız Dokuyucu (Star Weaver)",
    description: "Hayalperest, içe dönük ve idealist. Dünyayı olduğu gibi değil, olabileceği gibi gören zengin bir iç dünya.",
    conditions: { decision_style: 1, curiosity: 1, social_energy: -1 }
  }
];

module.exports = {
  DIMENSIONS,
  FULL_POOL,
  BASE_ARCHETYPES
};
