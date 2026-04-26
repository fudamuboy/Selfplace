-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Reflection Questions table
CREATE TABLE IF NOT EXISTS reflection_questions (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL
);

-- Check-ins table
CREATE TABLE IF NOT EXISTS check_ins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  mood VARCHAR(50) NOT NULL,
  reflection_question TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invitation Cards table
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Card Responses table for personalization
CREATE TABLE IF NOT EXISTS card_responses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  card_id INTEGER REFERENCES cards(id),
  response VARCHAR(50) NOT NULL, -- 'Deneyeceğim', 'Daha sonra', 'Bana göre değil'
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seeding Reflection Questions
INSERT INTO reflection_questions (text) VALUES
('Bugün seni en çok ne etkiledi?'),
('Bugün kendine nasıl davrandın?'),
('Son zamanlarda aklında kalan bir şey var mı?'),
('Bugün kendine karşı biraz daha nazik olabildin mi?'),
('Bugün neye ihtiyaç duyduğunu fark ettin mi?'),
('Şu an bedeninde ne hissediyorsun?'),
('Bugün seni gülümseten küçük bir şey oldu mu?'),
('Kendine bugün bir teşekkür etsen, bu ne için olurdu?')
ON CONFLICT DO NOTHING;

-- Seeding Invitation Cards
INSERT INTO cards (title, content, category) VALUES
-- Self-Love
('Küçük Bir Nezaket', 'Bugün kendin için küçük ve nazik bir şey yap.', 'Öz-Şefkat'),
('İç Sesin', 'İç sesinle biraz daha yumuşak konuşmayı dene.', 'Öz-Şefkat'),
-- Make Space
('Sessizlik Anı', 'Bugün kendine 20 dakikalık sessiz bir alan aç.', 'Alan Aç'),
('Küçük Bir Seçim', 'Bir konuda kendini ikinci plana atmadan küçük bir seçim yap.', 'Alan Aç'),
-- Small Courage
('Nazik Bir Başlangıç', 'Ertelediğin küçük bir şeye bugün nazikçe başla.', 'Küçük Cesaret'),
('Sessiz İfade', 'Genelde içinde tuttuğun bir düşünceyi sakin bir şekilde ifade etmeyi dene.', 'Küçük Cesaret'),
-- Lightness / Play
('Çocukluk Anısı', 'Çocukken sevdiğin bir şeyi küçük de olsa tekrar hatırla.', 'Hafiflik'),
('Amaçsız Yürüyüş', 'Amaçsız kısa bir yürüyüş yapmayı dene.', 'Hafiflik'),
-- Reflection
('Tetikleyici', 'Bugün seni tetikleyen şey ne olabilir?', 'Derinleş'),
('Zihin Akışı', 'Son zamanlarda fazla düşündüğün bir şey var mı?', 'Derinleş'),
-- Rest / Compassion
('Dinlenme Hakkı', 'Bugün dinlenmeyi hak ettiğin bir şey olarak görmeyi dene.', 'Dinlenme'),
('Kısa Bir Mola', 'Kendine kısa bir mola vermek için izin ver.', 'Dinlenme')
ON CONFLICT DO NOTHING;
