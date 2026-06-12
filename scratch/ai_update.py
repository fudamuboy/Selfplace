import re

with open('backend/src/services/aiService.js', 'r') as f:
    content = f.read()

# 1. Update generatePersonalityArchetype
content = content.replace(
    '"dominant_color": "A hex color code representing their energy (e.g., \'#4FD8FF\' or \'#A78BFA\')",\n  ',
    ''
)

# 2. Update generatePersonalityDrift
old_drift_prompt = """Respond ONLY with a valid JSON object containing a "drift_insight" string field:
{
  "drift_insight": "..."
}"""

new_drift_prompt = """Respond ONLY with a valid JSON object containing the following fields:
{
  "evolution_summary": "A 2-3 sentence poetic reflection on their overall emotional journey and how their core rhythms are evolving.",
  "dominant_shift": "A 1-2 sentence specific observation of the most noticeable dimensional change (e.g., '🌙 İçindeki yoğun ritim biraz daha sakinleşmiş gibi görünüyor. Kendini ifade ederken artık daha yumuşak bir açıklık hissediliyor.')"
}"""

content = content.replace(old_drift_prompt, new_drift_prompt)

# Also update the return logic for drift
content = content.replace("return JSON.parse(result).drift_insight;", "return JSON.parse(result);")

with open('backend/src/services/aiService.js', 'w') as f:
    f.write(content)

