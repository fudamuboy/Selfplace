import re

with open('backend/src/controllers/personalityController.js', 'r') as f:
    content = f.read()

# Replace getHistory
old_history = """    const mbtiHistory = historyRes.rows.filter(r => r.test_type === 'mbti');
    const colorHistory = historyRes.rows.filter(r => r.test_type === 'color');

    res.json({
      success: true,
      mbti: mbtiHistory,
      color: colorHistory
    });"""

new_history = """    const mbtiHistory = historyRes.rows.filter(r => r.test_type === 'mbti');
    const colorHistory = historyRes.rows.filter(r => r.test_type === 'color');
    const journeyHistory = historyRes.rows.filter(r => r.test_type === 'journey');

    res.json({
      success: true,
      mbti: mbtiHistory,
      color: colorHistory,
      journey: journeyHistory
    });"""

content = content.replace(old_history, new_history)

with open('backend/src/controllers/personalityController.js', 'w') as f:
    f.write(content)
