import re

with open('backend/src/services/emotionalContextBuilder.js', 'r') as f:
    content = f.read()

# Replace colorTest with journeyTest
content = content.replace("let colorTest = null;", "let journeyTest = null;")
content = content.replace("db.query(\"SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'color' ORDER BY created_at DESC LIMIT 1\", [userId])", "db.query(\"SELECT result_data FROM personality_results WHERE user_id = $1 AND test_type = 'journey' ORDER BY created_at DESC LIMIT 1\", [userId])")

# Replace variable assignments
content = content.replace("colorTest = colorRes.rows[0]?.result_data || null;", "journeyTest = colorRes.rows[0]?.result_data || null;")

# In the dossier construction (around line 301)
old_dossier_if = """    if (colorTest) {
      dossier += `DISC Kişilik Rengi: Dominant ${colorTest.dominantColor} (${colorTest.title}). Güçlü Yönler: ${colorTest.strengths?.join(', ')}. Stres Eğilimi: ${colorTest.stressBehavior}.\\n`;
    }"""

new_dossier_if = """    if (journeyTest) {
      dossier += `\\n[KİŞİLİK EĞİLİMLERİ]\\n`;
      dossier += `- Arketip: ${journeyTest.archetype_name} (${journeyTest.baseArchetype})\\n`;
      
      const s = journeyTest.scores || {};
      if (s.emotional_expression < 0) dossier += `- Duygularını önce kendi içinde işlemeye eğilimli\\n`;
      else if (s.emotional_expression > 0) dossier += `- Duygularını açıkça ve hemen dışa vurmaya yatkın\\n`;
      
      if (s.conflict_style < 0) dossier += `- Gerilim ve çatışma anlarında geri çekilmeye/sessizleşmeye yatkın\\n`;
      else if (s.conflict_style > 0) dossier += `- Çatışmaları anında çözmeye ve yüzleşmeye yatkın\\n`;

      if (s.attachment > 0) dossier += `- İlişkilerde güvence ve duygusal netlik arayışı yüksek\\n`;
      else if (s.attachment < 0) dossier += `- Kendi alanına ve bağımsızlığına oldukça düşkün\\n`;

      if (s.energy_rhythm < 0) dossier += `- Sakin ve öngörülebilir bir hayat ritmini tercih ediyor\\n`;
      else if (s.energy_rhythm > 0) dossier += `- Yoğun, dinamik ve coşkulu bir ritme sahip\\n`;
    }"""

content = content.replace(old_dossier_if, new_dossier_if)

with open('backend/src/services/emotionalContextBuilder.js', 'w') as f:
    f.write(content)
