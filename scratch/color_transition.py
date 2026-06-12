import re

with open('app/personality-results.tsx', 'r') as f:
    content = f.read()

# Add color transition logic
color_transition_logic = """    const colorHex = color_family?.hex || result.result_data.dominant_color || currentTheme.colors.primary;
    const timeFrameStr = calculateTimeDiff(result.created_at, index);
    const isLatest = index === 0;
    
    // Calculate color transition string if there is a previous test
    let colorTransitionStr = null;
    if (index < history.length - 1 && color_family) {
        const prevResult = history[index + 1];
        const prevColorFamily = prevResult.result_data.color_family;
        if (prevColorFamily && prevColorFamily.name !== color_family.name) {
            colorTransitionStr = `${prevColorFamily.name} → ${color_family.name}`;
        }
    }"""

content = content.replace(
"""    const colorHex = color_family?.hex || result.result_data.dominant_color || currentTheme.colors.primary;
    const timeFrameStr = calculateTimeDiff(result.created_at, index);
    const isLatest = index === 0;""",
    color_transition_logic
)

# Update the driftCard to render colorTransitionStr
drift_card_old = """        {/* If this test has a drift reflection, render the Evrim Kartı attached below it */}
        {dominant_shift && timeFrameStr && (
          <View style={[styles.driftCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: currentTheme.colors.cardBorder }]}>
            <Text style={[styles.timeFrameText, { color: currentTheme.colors.text.secondary }]}>
              {timeFrameStr}
            </Text>
            <Text style={[styles.driftText, { color: currentTheme.colors.text.primary }]}>
              {color_family?.symbol || '✨'} {dominant_shift}
            </Text>
          </View>
        )}"""

drift_card_new = """        {/* If this test has a drift reflection, render the Evrim Kartı attached below it */}
        {(dominant_shift || colorTransitionStr) && timeFrameStr && (
          <View style={[styles.driftCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: currentTheme.colors.cardBorder }]}>
            <Text style={[styles.timeFrameText, { color: currentTheme.colors.text.secondary }]}>
              {timeFrameStr}
            </Text>
            {colorTransitionStr && (
              <Text style={[styles.colorTransitionText, { color: colorHex }]}>
                {colorTransitionStr}
              </Text>
            )}
            {dominant_shift && (
              <Text style={[styles.driftText, { color: currentTheme.colors.text.primary }]}>
                {color_family?.symbol || '✨'} {dominant_shift}
              </Text>
            )}
          </View>
        )}"""

content = content.replace(drift_card_old, drift_card_new)

# Add style for colorTransitionText
content = content.replace(
    "  driftText: {",
    "  colorTransitionText: { fontSize: 14, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },\n  driftText: {"
)

with open('app/personality-results.tsx', 'w') as f:
    f.write(content)
