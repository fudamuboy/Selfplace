import re

with open('app/(tabs)/profile.tsx', 'r') as f:
    content = f.read()

# Replace the two tests with one unified test
content = re.sub(
    r'\{renderMenuItem\(\'color-palette-outline\'.*?\)\}\n\s*\{renderMenuItem\(\'compass-outline\'.*?\)\}',
    r"{renderMenuItem('compass-outline', 'Selfplace Deep Personality Journey', 'Duygusal kimliğini keşfet', () => router.push('/personality-test/journey'))}",
    content
)

with open('app/(tabs)/profile.tsx', 'w') as f:
    f.write(content)
