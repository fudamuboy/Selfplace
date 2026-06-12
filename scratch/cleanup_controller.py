import re

with open('backend/src/controllers/personalityController.js', 'r') as f:
    content = f.read()

# Remove COLOR_TEST and MBTI_TEST blocks
content = re.sub(r'// --- 4-Color Personality Test.*?exports\.getTest =', 'exports.getTest =', content, flags=re.DOTALL)

with open('backend/src/controllers/personalityController.js', 'w') as f:
    f.write(content)
