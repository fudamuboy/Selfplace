const db = require('../config/db');

exports.getWeeklyInsight = async (req, res) => {
  const userId = req.user.id;

  try {
    // Fetch check-ins and card responses from the last 7 days
    const [historyRes, cardRes] = await Promise.all([
      db.query(
        `SELECT mood, created_at FROM check_ins 
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
         ORDER BY created_at ASC`,
        [userId]
      ),
      db.query(
        `SELECT category, response FROM card_responses 
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      )
    ]);

    const checkIns = historyRes.rows;
    const responses = cardRes.rows;

    if (checkIns.length < 2) {
      return res.json({
        insight: "Kendini tanıma yolculuğun küçük adımlarla başlar. Birkaç check-in sonrası burada sana küçük içgörüler göstereceğim."
      });
    }

    // Logic: Analyze Card Preferences
    const favCategory = responses.filter(r => r.response === 'Deneyeceğim')
                                 .reduce((acc, curr) => {
                                   acc[curr.category] = (acc[curr.category] || 0) + 1;
                                   return acc;
                                 }, {});
    
    const topCategory = Object.keys(favCategory).reduce((a, b) => favCategory[a] > favCategory[b] ? a : b, null);

    // Logic: Mood Trends
    const moodCounts = checkIns.reduce((acc, curr) => {
      acc[curr.mood] = (acc[curr.mood] || 0) + 1;
      return acc;
    }, {});
    const topMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);

    let insight = "";

    // Refined Probabilistic Insights
    if (topCategory === 'Küçük Cesaret') {
      insight = "Bu hafta küçük cesaret davetlerine daha açık olduğun bir dönemden geçiyor olabilirsin.";
    } else if (topCategory === 'Dinlenme') {
      insight = "Son günlerde dinlenme teması senin için daha belirgin bir ihtiyaç olarak görünüyor.";
    } else if (topCategory === 'Öz-Şefkat') {
      insight = "Bazı günlerde kendine karşı biraz daha yumuşak ve şefkatli olmaya ihtiyaç duymuş olabilirsin.";
    } else if (topMood === 'Yorgun') {
      insight = "Bu hafta bedeninin veya zihninin biraz daha fazla sessizliğe ve alana ihtiyaç duyduğunu fark etmiş olabilirsin.";
    } else if (topMood === 'Mutlu') {
      insight = "Haftanın genelinde enerjinin biraz daha yükseldiğini ve yaşamın ritmine daha kolay uyum sağladığını hissetmiş olabilirsin.";
    } else {
      insight = "Bu hafta kendine biraz daha alan açmaya ve iç sesini dinlemeye ihtiyaç duymuş olabilirsin.";
    }

    res.json({
      insight,
      count: checkIns.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'İçgörü oluşturulurken bir hata oluştu.' });
  }
};
