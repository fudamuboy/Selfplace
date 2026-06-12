const db = require('./db');

/**
 * Ensures the database schema is up to date.
 * This runs on every server startup to prevent 'column does not exist' errors.
 */
exports.runMigrations = async () => {
  console.log('[MIGRATION] Acquiring database migration advisory lock...');
  await db.query('SELECT pg_advisory_lock(7429183)');
  console.log('[MIGRATION] Migration advisory lock acquired.');

  try {
    // 1. Rename users.password_hash if it exists (migration to 'password')
    const checkUserCols = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'password_hash'
    `);
    
    if (checkUserCols.rows.length > 0) {
      console.log('[MIGRATION] Renaming users.password_hash to users.password');
      await db.query('ALTER TABLE users RENAME COLUMN password_hash TO password');
    }

    // 2. Ensure reset password and terms columns exist
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS birth_date DATE,
      ADD COLUMN IF NOT EXISTS zodiac_sign VARCHAR(50),
      ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE
    `);


    // 3. Ensure check_ins table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS check_ins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        mood VARCHAR(50) NOT NULL,
        reflection_question TEXT,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Ensure daily_reflections table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS daily_reflections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at DATE DEFAULT CURRENT_DATE,
        UNIQUE (user_id, created_at)
      )
    `);

    // 5. Ensure card_responses table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS card_responses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_id INTEGER,
        response VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Ensure weekly_insights table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS weekly_insights (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 7. Ensure advanced_check_ins table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS advanced_check_ins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        check_in_id INTEGER REFERENCES check_ins(id) ON DELETE CASCADE,
        question_id VARCHAR(100),
        question_text TEXT,
        answer TEXT,
        answers JSONB, -- Keep for future flexibility
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      ALTER TABLE advanced_check_ins 
      ADD COLUMN IF NOT EXISTS check_in_id INTEGER REFERENCES check_ins(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS question_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS question_text TEXT,
      ADD COLUMN IF NOT EXISTS answer TEXT
    `);

    // 8. Ensure journal_entries table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Ensure journal_drawings table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS journal_drawings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        journal_entry_id INTEGER REFERENCES journal_entries(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Ensure personality_tests and results tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS personality_tests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        test_type VARCHAR(100) NOT NULL,
        answers JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS personality_results (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        test_type VARCHAR(100) NOT NULL,
        result_data JSONB NOT NULL,
        traits JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure result_data and traits exist if it was created with an older schema
    await db.query(`
      ALTER TABLE personality_results 
      ADD COLUMN IF NOT EXISTS result_data JSONB,
      ADD COLUMN IF NOT EXISTS traits JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    `);

    // Safely drop NOT NULL constraint from traits if it exists from older schema
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name='personality_results' AND column_name='traits'
        ) THEN
          ALTER TABLE personality_results ALTER COLUMN traits DROP NOT NULL;
        END IF;
      END $$;
    `);

    // 11. Ensure AI chat tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        summary TEXT,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // 12. Ensure Astrology tables exist
    const checkAstroCols = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'astrology_events' AND column_name = 'message_tr'
    `);
    if (checkAstroCols.rows.length > 0) {
      console.log('[MIGRATION] Old astrology_events schema detected. Rebuilding table...');
      await db.query('DROP TABLE astrology_events');
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS astrology_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL, -- 'moon_phase', 'retrograde', 'transit', 'season'
        event_name VARCHAR(100) NOT NULL,
        description TEXT,
        date_start TIMESTAMP WITH TIME ZONE,
        date_end TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS zodiac_profiles (
        sign VARCHAR(50) PRIMARY KEY,
        element VARCHAR(20),
        modality VARCHAR(20),
        ruling_planet VARCHAR(50),
        strengths JSONB,
        weaknesses JSONB,
        core_needs TEXT,
        stress_response TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS weekly_guidance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        zodiac_sign VARCHAR(50),
        guidance_text TEXT NOT NULL,
        themes JSONB,
        event_seed VARCHAR(100),
        content_hash VARCHAR(64),
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `);

    try {
      await db.query('ALTER TABLE weekly_guidance ADD COLUMN IF NOT EXISTS event_seed VARCHAR(100)');
      await db.query('ALTER TABLE weekly_guidance ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64)');
    } catch (e) {
      console.log('[MIGRATION] ALTER weekly_guidance error (might be expected):', e.message);
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS daily_whisper (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        zodiac_sign VARCHAR(50),
        whisper_text TEXT NOT NULL,
        mood_context VARCHAR(50),
        emotional_weather VARCHAR(50),
        content_hash VARCHAR(64),
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_daily_whisper_user ON daily_whisper(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_daily_whisper_expires ON daily_whisper(expires_at)');

    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES ai_conversations(id) ON DELETE CASCADE,
        sender VARCHAR(50) NOT NULL, -- 'user' or 'ai'
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Ensure card_responses has local_date for daily ritual
    await db.query(`
      ALTER TABLE card_responses 
      ADD COLUMN IF NOT EXISTS local_date DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS completion_status VARCHAR(50) DEFAULT 'Seçildi'
    `);

    // Ensure invitation_cards table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS invitation_cards (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);



    // Ensure zodiac_guidance table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS zodiac_guidance (
        id SERIAL PRIMARY KEY,
        zodiac_sign VARCHAR(50) NOT NULL,
        guidance_tr TEXT NOT NULL,
        period_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);



    await db.query(`
      CREATE TABLE IF NOT EXISTS emotional_memories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        memory_key VARCHAR(255) NOT NULL, -- e.g. 'friend_name', 'fear'
        memory_value TEXT NOT NULL,
        category VARCHAR(100), -- 'relationships', 'work', 'health'
        importance INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, memory_key)
      )
    `);


    await db.query(`
      CREATE TABLE IF NOT EXISTS personality_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        traits JSONB DEFAULT '{}',
        communication_style VARCHAR(100) DEFAULT 'gentle',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_reflections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- 'daily', 'weekly'
        content TEXT NOT NULL,
        insights JSONB,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS daily_emotional_states (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date DATE DEFAULT CURRENT_DATE,
        state_data JSONB NOT NULL, -- { mood_avg, fluctuations, triggers }
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);

    // 15. Ensure card_tasks and card_history tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS card_tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        duration_minutes INTEGER,
        task_type VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS card_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        card_id INTEGER REFERENCES card_tasks(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 16. Ensure subscription_status table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_status (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_type VARCHAR(50) NOT NULL DEFAULT 'free',
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS emotional_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        source_type VARCHAR(50) NOT NULL, -- 'checkin', 'card', 'journal', 'reflection', 'ai'
        emotion VARCHAR(50),
        prompt TEXT,
        content TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration fix for advanced_check_ins NOT NULL constraint on answers
    await db.query(`
      ALTER TABLE advanced_check_ins 
      ALTER COLUMN answers SET DEFAULT '[]'::jsonb;
      
      UPDATE advanced_check_ins SET answers = '[]'::jsonb WHERE answers IS NULL;
      
      ALTER TABLE advanced_check_ins 
      ALTER COLUMN answers SET NOT NULL;
    `);


    // 17. Add Indexes for Performance
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
      CREATE INDEX IF NOT EXISTS idx_check_ins_created_at ON check_ins(created_at);
      CREATE INDEX IF NOT EXISTS idx_advanced_check_ins_user_id ON advanced_check_ins(user_id);
      CREATE INDEX IF NOT EXISTS idx_advanced_check_ins_check_in_id ON advanced_check_ins(check_in_id);
      CREATE INDEX IF NOT EXISTS idx_emotional_entries_user_id ON emotional_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_emotional_entries_created_at ON emotional_entries(created_at);
      CREATE INDEX IF NOT EXISTS idx_card_responses_user_id ON card_responses(user_id);
      CREATE INDEX IF NOT EXISTS idx_card_responses_local_date ON card_responses(local_date);
    `);

    // 18. Relationship Connections & Context
    await db.query(`
      CREATE TABLE IF NOT EXISTS relationship_connections (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        connection_type VARCHAR(50) DEFAULT 'partner',
        requester_alias VARCHAR(100),
        recipient_alias VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, recipient_id)
      );

      CREATE TABLE IF NOT EXISTS relationship_context (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        communication_style VARCHAR(100),
        emotional_needs JSONB DEFAULT '[]',
        stress_response VARCHAR(100),
        conflict_tendency VARCHAR(100),
        attachment_patterns VARCHAR(100),
        disc_type VARCHAR(10),
        emotional_rhythm VARCHAR(50),
        empathy_score INTEGER DEFAULT 50 CHECK (empathy_score BETWEEN 0 AND 100),
        last_synthesis_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(connection_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS relationship_privacy_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        exclude_checkins BOOLEAN DEFAULT FALSE,
        exclude_journals BOOLEAN DEFAULT FALSE,
        exclude_cards BOOLEAN DEFAULT FALSE,
        exclude_ai_chat BOOLEAN DEFAULT FALSE,
        exclude_personality BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id, connection_id)
      );

      CREATE TABLE IF NOT EXISTS relationship_insights (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        for_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        insight_text TEXT NOT NULL,
        insight_type VARCHAR(50) DEFAULT 'empathy',
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_rel_connections_requester ON relationship_connections(requester_id);
      CREATE INDEX IF NOT EXISTS idx_rel_connections_recipient ON relationship_connections(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_rel_context_connection ON relationship_context(connection_id);
      CREATE INDEX IF NOT EXISTS idx_rel_insights_for_user ON relationship_insights(for_user_id);

      -- Early creation of couple_memories to prevent dependency race conditions on bootstrap
      CREATE TABLE IF NOT EXISTS couple_memories (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        memory_type VARCHAR(50) NOT NULL,
        summary TEXT NOT NULL,
        participants VARCHAR(20) DEFAULT 'both',
        emotional_weight INTEGER DEFAULT 3 CHECK (emotional_weight BETWEEN 1 AND 5),
        resolved BOOLEAN DEFAULT FALSE,
        last_referenced_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_couple_memories_conn ON couple_memories(connection_id);
      CREATE INDEX IF NOT EXISTS idx_couple_memories_type ON couple_memories(memory_type);
      CREATE INDEX IF NOT EXISTS idx_couple_memories_resolved ON couple_memories(resolved);

      -- 19. Relationship Phase 2 additions
      CREATE TABLE IF NOT EXISTS relationship_daily_syncs (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        synced_date DATE DEFAULT CURRENT_DATE,
        generated_text TEXT NOT NULL,
        emotional_weather VARCHAR(50) NOT NULL,
        relationship_energy VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(connection_id, synced_date)
      );

      CREATE TABLE IF NOT EXISTS relationship_rituals (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        prompt_tr TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE relationship_rituals 
      ADD COLUMN IF NOT EXISTS relationship_reflection TEXT,
      ADD COLUMN IF NOT EXISTS emotional_climate VARCHAR(100),
      ADD COLUMN IF NOT EXISTS gentle_suggestion TEXT;

      CREATE TABLE IF NOT EXISTS relationship_ritual_responses (
        id SERIAL PRIMARY KEY,
        ritual_id INTEGER REFERENCES relationship_rituals(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        response_text TEXT NOT NULL,
        include_in_synthesis BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ritual_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS relationship_timeline (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        title_tr VARCHAR(255) NOT NULL,
        description_tr TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_rel_daily_syncs_conn ON relationship_daily_syncs(connection_id);
      CREATE INDEX IF NOT EXISTS idx_rel_daily_syncs_date ON relationship_daily_syncs(synced_date);
      CREATE INDEX IF NOT EXISTS idx_rel_rituals_conn ON relationship_rituals(connection_id);
      CREATE INDEX IF NOT EXISTS idx_rel_timeline_conn ON relationship_timeline(connection_id);

      ALTER TABLE relationship_daily_syncs ADD COLUMN IF NOT EXISTS insight_feed JSONB DEFAULT '[]'::jsonb;

      ALTER TABLE relationship_daily_syncs 
      ADD COLUMN IF NOT EXISTS emotional_aura VARCHAR(100),
      ADD COLUMN IF NOT EXISTS connection_state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS relationship_rhythm VARCHAR(100),
      ADD COLUMN IF NOT EXISTS emotional_closeness INTEGER DEFAULT 50;

      ALTER TABLE couple_memories 
      ADD COLUMN IF NOT EXISTS symbol VARCHAR(50);

      CREATE TABLE IF NOT EXISTS relationship_garden (
        id SERIAL PRIMARY KEY,
        connection_id INTEGER REFERENCES relationship_connections(id) ON DELETE CASCADE,
        garden_state VARCHAR(50) DEFAULT 'peaceful_garden',
        growth_level INTEGER DEFAULT 1,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(connection_id)
      );
    `);

    // Seed astrology data
    await seedAstrologyData();

    // 17. Safe Legacy Data Reconciliation & Sync
    await db.query(`
      CREATE TABLE IF NOT EXISTS data_migrations (
        name VARCHAR(255) PRIMARY KEY,
        run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migCheck = await db.query("SELECT 1 FROM data_migrations WHERE name = 'legacy_reconciliation_v2'");
    if (migCheck.rows.length === 0) {
      console.log('[MIGRATION] Starting legacy data reconciliation to emotional_entries...');
      
      let migratedCount = 0;
      let skippedCount = 0;
      let invalidCount = 0;
      let orphanedCount = 0;

      // A. Sync Legacy Check-ins
      const checkIns = await db.query("SELECT id, user_id, mood, reflection_question, note, created_at FROM check_ins");
      for (const row of checkIns.rows) {
        if (!row.user_id) {
          orphanedCount++;
          continue;
        }
        if (!row.mood) {
          invalidCount++;
          continue;
        }

        const dupCheck1 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'checkin' AND (metadata->>'check_in_id')::int = $2",
          [row.user_id, row.id]
        );
        const dupCheck2 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'checkin' AND content = $2 AND created_at = $3",
          [row.user_id, row.note || '', row.created_at]
        );

        if (dupCheck1.rows.length > 0 || dupCheck2.rows.length > 0) {
          skippedCount++;
        } else {
          await db.query(
            "INSERT INTO emotional_entries (user_id, source_type, emotion, prompt, content, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              row.user_id,
              'checkin',
              row.mood,
              row.reflection_question || 'Günlük Check-in',
              row.note || '',
              JSON.stringify({ check_in_id: row.id }),
              row.created_at
            ]
          );
          migratedCount++;
        }
      }

      // B. Sync Legacy Card Responses
      const cardResponses = await db.query(
        "SELECT cr.id, cr.user_id, cr.card_id, cr.response, cr.category, cr.created_at, ic.title FROM card_responses cr LEFT JOIN invitation_cards ic ON cr.card_id = ic.id"
      );
      for (const row of cardResponses.rows) {
        if (!row.user_id) {
          orphanedCount++;
          continue;
        }
        if (!row.response) {
          invalidCount++;
          continue;
        }

        const dupCheck1 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'card' AND (metadata->>'card_response_id')::int = $2",
          [row.user_id, row.id]
        );
        const dupCheck2 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'card' AND content = $2 AND created_at = $3",
          [row.user_id, row.response, row.created_at]
        );

        if (dupCheck1.rows.length > 0 || dupCheck2.rows.length > 0) {
          skippedCount++;
        } else {
          await db.query(
            "INSERT INTO emotional_entries (user_id, source_type, emotion, prompt, content, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              row.user_id,
              'card',
              'Motive',
              row.title || 'Kart Daveti',
              row.response,
              JSON.stringify({ card_id: row.card_id, card_response_id: row.id, action: 'respond' }),
              row.created_at
            ]
          );
          migratedCount++;
        }
      }

      // C. Sync Legacy Journal Entries
      const journalEntries = await db.query("SELECT id, user_id, title, content, created_at FROM journal_entries");
      for (const row of journalEntries.rows) {
        if (!row.user_id) {
          orphanedCount++;
          continue;
        }
        if (!row.content) {
          invalidCount++;
          continue;
        }

        const dupCheck1 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'journal' AND (metadata->>'journal_id')::int = $2",
          [row.user_id, row.id]
        );
        const dupCheck2 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'journal' AND content = $2 AND created_at = $3",
          [row.user_id, row.content, row.created_at]
        );

        if (dupCheck1.rows.length > 0 || dupCheck2.rows.length > 0) {
          skippedCount++;
        } else {
          await db.query(
            "INSERT INTO emotional_entries (user_id, source_type, emotion, prompt, content, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              row.user_id,
              'journal',
              'Sakin',
              row.title || 'Günlük Yazısı',
              row.content,
              JSON.stringify({ journal_id: row.id }),
              row.created_at
            ]
          );
          migratedCount++;
        }
      }

      // D. Sync Legacy Daily Reflections
      const dailyReflections = await db.query("SELECT id, user_id, text, created_at FROM daily_reflections");
      for (const row of dailyReflections.rows) {
        if (!row.user_id) {
          orphanedCount++;
          continue;
        }
        if (!row.text) {
          invalidCount++;
          continue;
        }

        const dupCheck1 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'reflection' AND (metadata->>'reflection_id')::int = $2",
          [row.user_id, row.id]
        );
        const dupCheck2 = await db.query(
          "SELECT 1 FROM emotional_entries WHERE user_id = $1 AND source_type = 'reflection' AND content = $2",
          [row.user_id, row.text]
        );

        if (dupCheck1.rows.length > 0 || dupCheck2.rows.length > 0) {
          skippedCount++;
        } else {
          await db.query(
            "INSERT INTO emotional_entries (user_id, source_type, emotion, prompt, content, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [
              row.user_id,
              'reflection',
              'Sakin',
              'Günlük Küçük Yansıma',
              row.text,
              JSON.stringify({ reflection_id: row.id }),
              row.created_at
            ]
          );
          migratedCount++;
        }
      }

      await db.query("INSERT INTO data_migrations (name) VALUES ('legacy_reconciliation_v2')");

      console.log(`[MIGRATION-COMPLETED] Legacy data reconciliation summary:`);
      console.log(` - Migrated entries: ${migratedCount}`);
      console.log(` - Skipped duplicates: ${skippedCount}`);
      console.log(` - Invalid legacy rows: ${invalidCount}`);
      console.log(` - Orphaned legacy records: ${orphanedCount}`);
    } else {
      console.log('[MIGRATION] Legacy data reconciliation v2 already ran. Skipping.');
    }

    // ─── RELATIONSHIP INTELLIGENCE UPGRADE ────────────────────────────────────

    // Per-user behavioral & emotional trait memory
    await db.query(`
      CREATE TABLE IF NOT EXISTS individual_behavioral_memory (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        trait_key VARCHAR(100) NOT NULL,
        -- 'reassurance_seeking' | 'conflict_style' | 'avoidance_tendency'
        -- | 'emotional_dependency' | 'communication_preference' | 'emotional_goals'
        trait_value TEXT NOT NULL,
        confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, trait_key)
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_indiv_behav_mem_user ON individual_behavioral_memory(user_id);
    `);

    // ──────────────────────────────────────────────────────────────────────────

    console.log('[MIGRATION] Database schema checks completed successfully.');
  } catch (err) {
    console.error('[MIGRATION] Error during schema check:', err.message);
    throw err;
  } finally {
    console.log('[MIGRATION] Releasing database migration advisory lock...');
    await db.query('SELECT pg_advisory_unlock(7429183)');
    console.log('[MIGRATION] Migration advisory lock released.');
  }
};

/**
 * Seeds the astrology tables with static 2025-2026 data if they are empty.
 */
async function seedAstrologyData() {
  try {
    const profileCount = await db.query('SELECT COUNT(*) FROM zodiac_profiles');
    if (parseInt(profileCount.rows[0].count) === 0) {
      console.log('[MIGRATION] Seeding Zodiac Profiles...');
      const profiles = [
        { sign: 'Koç', element: 'Ateş', modality: 'Öncü', ruling_planet: 'Mars', strengths: '["Cesaret", "Liderlik", "Enerji"]', weaknesses: '["Sabırsızlık", "Öfke", "Acelecilik"]', core_needs: 'Harekete geçmek ve birinci olmak.', stress_response: 'Stres altında öfkeli ve fevri olabilir.' },
        { sign: 'Boğa', element: 'Toprak', modality: 'Sabit', ruling_planet: 'Venüs', strengths: '["Sabır", "Güvenilirlik", "Pratiklik"]', weaknesses: '["İnatçılık", "Değişime direnç", "Tembellik eğilimi"]', core_needs: 'Güvenlik, konfor ve istikrar.', stress_response: 'Stres altında inatçı ve içine kapanık olabilir.' },
        { sign: 'İkizler', element: 'Hava', modality: 'Değişken', ruling_planet: 'Merkür', strengths: '["İletişim", "Adaptasyon", "Merak"]', weaknesses: '["Kararsızlık", "Yüzeysellik", "Odaklanma sorunu"]', core_needs: 'Zihinsel uyarım ve çeşitlilik.', stress_response: 'Stres altında endişeli ve dağınık olabilir.' },
        { sign: 'Yengeç', element: 'Su', modality: 'Öncü', ruling_planet: 'Ay', strengths: '["Empati", "Koruyuculuk", "Sezgi"]', weaknesses: '["Aşırı duygusallık", "Geçmişe bağlılık", "Alınganlık"]', core_needs: 'Duygusal güvenlik ve aidiyet.', stress_response: 'Stres altında kabuğuna çekilir ve savunmaya geçer.' },
        { sign: 'Aslan', element: 'Ateş', modality: 'Sabit', ruling_planet: 'Güneş', strengths: '["Yaratıcılık", "Cömertlik", "Özgüven"]', weaknesses: '["Gurur", "İlgi bağımlılığı", "Otoriterlik"]', core_needs: 'Takdir edilmek ve parlamak.', stress_response: 'Stres altında kibirli veya aşırı dramatik olabilir.' },
        { sign: 'Başak', element: 'Toprak', modality: 'Değişken', ruling_planet: 'Merkür', strengths: '["Analiz", "Yardımseverlik", "Detaycılık"]', weaknesses: '["Aşırı eleştirel", "Mükemmeliyetçilik", "Endişe"]', core_needs: 'Faydalı olmak ve düzen kurmak.', stress_response: 'Stres altında aşırı eleştirel ve kaygılı olabilir.' },
        { sign: 'Terazi', element: 'Hava', modality: 'Öncü', ruling_planet: 'Venüs', strengths: '["Diplomasi", "Uyum", "Estetik"]', weaknesses: '["Kararsızlık", "Çatışmadan kaçınma", "Onay arayışı"]', core_needs: 'Uyum, denge ve adalet.', stress_response: 'Stres altında kararsızlaşır ve pasif-agresif olabilir.' },
        { sign: 'Akrep', element: 'Su', modality: 'Sabit', ruling_planet: 'Plüton', strengths: '["Tutku", "Derinlik", "Dönüşüm"]', weaknesses: '["Kıskançlık", "Kontrolcülük", "Şüphecilik"]', core_needs: 'Derin bağlar ve gerçeği bilmek.', stress_response: 'Stres altında kontrolcü ve gizemli olabilir.' },
        { sign: 'Yay', element: 'Ateş', modality: 'Değişken', ruling_planet: 'Jüpiter', strengths: '["İyimserlik", "Özgürlük", "Felsefe"]', weaknesses: '["Sorumsuzluk", "Sabırsızlık", "Patavatsızlık"]', core_needs: 'Özgürlük ve anlam arayışı.', stress_response: 'Stres altında kaçma eğilimi veya aşırı vaatlerde bulunma.' },
        { sign: 'Oğlak', element: 'Toprak', modality: 'Öncü', ruling_planet: 'Satürn', strengths: '["Disiplin", "Sorumluluk", "Kararlılık"]', weaknesses: '["Karamsarlık", "Katılık", "Aşırı çalışma"]', core_needs: 'Başarı, yapı ve saygı.', stress_response: 'Stres altında soğuk, mesafeli ve kontrolcü olabilir.' },
        { sign: 'Kova', element: 'Hava', modality: 'Sabit', ruling_planet: 'Uranüs', strengths: '["Orijinallik", "İnsancıllık", "Bağımsızlık"]', weaknesses: '["Duygusal mesafe", "İnatçılık", "Asilik"]', core_needs: 'Bireysellik ve toplumsal fayda.', stress_response: 'Stres altında izole olur ve mantığa sığınır.' },
        { sign: 'Balık', element: 'Su', modality: 'Değişken', ruling_planet: 'Neptün', strengths: '["Şefkat", "Sezgi", "Sanatsallık"]', weaknesses: '["Gerçeklerden kaçma", "Kurban psikolojisi", "Sınır çizememe"]', core_needs: 'Ruhsal bütünlük ve ilham.', stress_response: 'Stres altında kaçış yolları arar ve sınırları kaybeder.' }
      ];

      for (const p of profiles) {
        await db.query(
          'INSERT INTO zodiac_profiles (sign, element, modality, ruling_planet, strengths, weaknesses, core_needs, stress_response) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [p.sign, p.element, p.modality, p.ruling_planet, p.strengths, p.weaknesses, p.core_needs, p.stress_response]
        );
      }
    }

    const eventCount = await db.query('SELECT COUNT(*) FROM astrology_events');
    if (parseInt(eventCount.rows[0].count) === 0) {
      console.log('[MIGRATION] Seeding Astrology Events...');
      const events = [
        { type: 'moon_phase', name: 'Dolunay (Terazi)', desc: 'İlişkilerde denge ve uyum arayışının zirve yaptığı bir dönem. Alma-verme dengesini sorgulayabilirsin.', start: '2026-04-12 00:00:00', end: '2026-04-15 00:00:00' },
        { type: 'retrograde', name: 'Merkür Retrosu (Koç)', desc: 'İletişimde fevri çıkışlara dikkat et. Geçmiş kararlarını gözden geçirmek için harika bir zaman.', start: '2026-03-15 00:00:00', end: '2026-04-07 00:00:00' },
        { type: 'moon_phase', name: 'Yeni Ay (Boğa)', desc: 'Topraklanma ve yeni maddi/manevi tohumlar ekme zamanı. Güvenlik ihtiyacın artabilir.', start: '2026-05-11 00:00:00', end: '2026-05-25 00:00:00' },
        { type: 'transit', name: 'Venüs İkizler Transit', desc: 'Sosyalleşme, yeni fikirler öğrenme ve merak duygunun arttığı hafif ve neşeli bir enerji.', start: '2026-05-20 00:00:00', end: '2026-06-17 00:00:00' }
      ];

      for (const e of events) {
        await db.query(
          'INSERT INTO astrology_events (event_type, event_name, description, date_start, date_end) VALUES ($1, $2, $3, $4, $5)',
          [e.type, e.name, e.desc, e.start, e.end]
        );
      }
    }
  } catch (err) {
    console.error('[MIGRATION] Error seeding astrology data:', err);
  }
}
