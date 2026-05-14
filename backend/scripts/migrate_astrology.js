const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Update Users table
    console.log('Updating users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS zodiac_sign VARCHAR(50),
      ADD COLUMN IF NOT EXISTS birth_date DATE;
    `);

    // 2. Create Astrology Events table
    console.log('Creating astrology_events table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS astrology_events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        event_type VARCHAR(100) NOT NULL, -- 'moon', 'retrograde', 'equinox', 'cultural', 'zodiac'
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE,
        message_tr TEXT NOT NULL,
        message_en TEXT,
        symbol VARCHAR(10)
      );
    `);

    // 3. Create Zodiac Guidance table
    console.log('Creating zodiac_guidance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS zodiac_guidance (
        id SERIAL PRIMARY KEY,
        zodiac_sign VARCHAR(50) NOT NULL,
        period_month INTEGER NOT NULL,
        period_year INTEGER NOT NULL,
        guidance_tr TEXT NOT NULL,
        guidance_en TEXT,
        theme VARCHAR(100),
        UNIQUE (zodiac_sign, period_month, period_year)
      );
    `);

    // 4. Seeding some major 2026/2027 events
    console.log('Seeding astrology events...');
    const events = [
      // Full Moons 2026
      { name: 'Dolunay', type: 'moon', start: '2026-05-31 00:00:00+03', msg: 'Bugün biraz iç sesini dinlemek isteyebilirsin 🌙', symbol: '🌙' },
      
      // New Moons 2026
      { name: 'Yeni Ay', type: 'moon', start: '2026-05-16 00:00:00+03', msg: 'Yeni niyetler ve taze başlangıçlar için sakin bir gün.', symbol: '🌑' },

      // Seasonal & Human Transitions
      { name: 'Yaz Gündönümü', type: 'solstice', start: '2026-06-21 00:00:00+03', msg: 'En uzun günün ışığı, içindeki enerjiyi aydınlatsın ☀️', symbol: '☀️' },
      { name: 'Bahar Yağmurları', type: 'seasonal', start: '2026-04-15 00:00:00+03', msg: 'Baharın ilk yağmuru gibi, ruhunu tazeleyecek küçük anlara yer aç.', symbol: '🌧️' },
      { name: 'Kış Sakinliği', type: 'seasonal', start: '2026-12-01 00:00:00+03', msg: 'Doğa kış uykusuna hazırlanırken, sen de biraz yavaşlamayı deneyebilirsin.', symbol: '❄️' },
      { name: 'Hıdırellez', type: 'cultural', start: '2026-05-05 00:00:00+03', msg: 'Bugün küçük niyetler kurmak için güzel bir gün olabilir 🌿', symbol: '🌿' },

      // Zodiac Transitions (Reflective Tone)
      { name: 'İkizler Mevsimi', type: 'zodiac', start: '2026-05-21 00:00:00+03', msg: 'Yeni dönem enerjisi sana bazı konularda farklı bir bakış açısı getirebilir.', symbol: '♊' },
      { name: 'Yengeç Mevsimi', type: 'zodiac', start: '2026-06-21 00:00:00+03', msg: 'Duygusal derinlik ve ev konforunun öne çıktığı, içe dönük bir dönem.', symbol: '♋' }
    ];

    for (const event of events) {
      await client.query(`
        INSERT INTO astrology_events (name, event_type, start_date, end_date, message_tr, symbol)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING;
      `, [event.name, event.type, event.start, event.end || null, event.msg, event.symbol]);
    }

    console.log('Migration completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();
