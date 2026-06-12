import re

with open('app/personality-result-detail.tsx', 'r') as f:
    content = f.read()

# 1. Update interface
content = content.replace("scores: Record<string, number>;", "scores: Record<string, number>;\n    drift_insight?: string;")

# 2. Extract drift_insight
content = content.replace(
    "communication_energy,", 
    "communication_energy,\n    drift_insight,"
)

# 3. Add Drift UI section
drift_ui = """
        {/* Drift Insight (Evrimsel Gözlem) */}
        {drift_insight && (
          <Animated.View entering={FadeInDown.duration(1200).delay(400)} style={[styles.driftCard, { backgroundColor: currentTheme.colors.cardBackground, shadowColor: accentColor }]}>
            <View style={styles.driftHeader}>
              <Ionicons name="sparkles" size={18} color={accentColor} style={{ marginRight: 8 }} />
              <Text style={[styles.driftTitle, { color: accentColor }]}>Evrimsel Gözlem</Text>
            </View>
            <Text style={[styles.driftText, { color: currentTheme.colors.text.primary }]}>
              {drift_insight}
            </Text>
          </Animated.View>
        )}
"""

content = content.replace("{/* Dynamic Dimensions */}", drift_ui + "\n        {/* Dynamic Dimensions */}")

# 4. Add Styles
styles = """
  driftCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 5,
  },
  driftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driftTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  driftText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 26,
    fontWeight: '400',
  },
  card: {"""

content = content.replace("  card: {", styles)

with open('app/personality-result-detail.tsx', 'w') as f:
    f.write(content)

