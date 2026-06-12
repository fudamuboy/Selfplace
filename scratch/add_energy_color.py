import re

with open('app/personality-result-detail.tsx', 'r') as f:
    content = f.read()

# 1. Update interface TestResult.result_data to include color_family
new_interface = """    scores: Record<string, number>;
    drift_insight?: string;
    color_family?: {
      name: string;
      hex: string;
      symbol: string;
      description: string;
    };"""
content = content.replace("    scores: Record<string, number>;\n    drift_insight?: string;", new_interface)

# 2. Extract color_family
content = content.replace("    drift_insight,\n", "    drift_insight,\n    color_family,\n")

# 3. Insert the card
color_card = """
        {/* Color Identity (Enerji Rengin) */}
        {color_family && (
          <Animated.View entering={FadeInDown.duration(600).delay(150)} style={[styles.card, { backgroundColor: currentTheme.colors.cardBackground, borderColor: currentTheme.colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>{color_family.symbol}</Text>
              <Text style={[styles.cardTitle, { color: currentTheme.colors.text.primary, marginBottom: 0 }]}>
                Senin Enerji Rengin
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color_family.hex, marginRight: 12, shadowColor: color_family.hex, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: {width: 0, height: 0} }} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: color_family.hex }}>
                {color_family.name}
              </Text>
            </View>
            
            <Text style={[styles.cardText, { color: currentTheme.colors.text.secondary }]}>
              {color_family.description.includes('introspective') ? 'İçsel derinliğin ve sakin ritmin seni bu renge yaklaştırıyor. Duygularını kendi içinde, sessiz bir bağ kurarak yaşıyorsun.' :
               color_family.description.includes('expressive') ? 'Yoğun duygusal ifade ve yüksek içsel ritmin, seni sıcak ve hareketli bir enerji tonuna yaklaştırıyor.' :
               color_family.description.includes('grounding') ? 'Sakinleştirici doğan ve duygusal dengen, seni çevrene güven veren toprak ve doğa tonlarına yaklaştırıyor.' :
               color_family.description.includes('curious') ? 'Zihinsel merakın ve coşkulu enerjin, seni aydınlık ve dışa dönük bir enerji frekansına taşıyor.' :
               'Soyut ve şiirsel iç dünyan, seni hayal gücünün ve derin düşüncenin renklerine yaklaştırıyor.'}
            </Text>
          </Animated.View>
        )}
"""

content = content.replace("{/* Dynamic Dimensions */}", color_card + "\n        {/* Dynamic Dimensions */}")

with open('app/personality-result-detail.tsx', 'w') as f:
    f.write(content)
