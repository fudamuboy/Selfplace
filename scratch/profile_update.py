import re

with open('app/(tabs)/profile.tsx', 'r') as f:
    content = f.read()

# Update journey text
content = content.replace("'Selfplace Deep Personality Journey', 'Duygusal kimliğini keşfet'", "'İçsel Kimlik Yolculuğu ✨', 'Duygusal kimliğini keşfet'")

# Update Duygusal Evrim subtitle
content = content.replace("'Duygusal Evrim', 'Kişilik ve duygu geçmişin'", "'Duygusal Evrim', 'Zaman içinde değişen içsel ritmin'")

with open('app/(tabs)/profile.tsx', 'w') as f:
    f.write(content)

