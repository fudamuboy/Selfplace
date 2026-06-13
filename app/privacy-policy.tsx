import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { GradientBackground } from '../components/GradientBackground';
import { Ionicons } from '@expo/vector-icons';
import useThemeStore from '../store/useThemeStore';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={currentTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: currentTheme.colors.text.primary }]}>Gizlilik Politikası</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.contentCard}>
            <Text style={[styles.lastUpdated, { color: currentTheme.colors.text.muted }]}>Son güncelleme: 30 Nisan 2026</Text>
            
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Bu Gizlilik Politikası, Hizmeti kullandığınızda bilgilerinizin toplanması, kullanılması ve ifşa edilmesine ilişkin politika ve prosedürlerimizi açıklar ve size gizlilik haklarınız ve yasaların sizi nasıl koruduğu hakkında bilgi verir.
            </Text>

            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Kişisel Verilerinizi Hizmeti sağlamak ve geliştirmek için kullanıyoruz. Hizmeti kullanarak, bilgilerin bu Gizlilik Politikasına uygun olarak toplanmasını ve kullanılmasını kabul etmiş olursunuz.
            </Text>

            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>Yorumlama ve Tanımlar</Text>
            <Text style={[styles.subSectionTitle, { color: currentTheme.colors.text.primary }]}>Yorumlama</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Baş harfi büyük olan kelimeler, aşağıdaki koşullar altında tanımlanan anlamlara sahiptir. Aşağıdaki tanımlar, tekil veya çoğul olarak görünseler de aynı anlama sahip olacaktır.
            </Text>

            <Text style={[styles.subSectionTitle, { color: currentTheme.colors.text.primary }]}>Tanımlar</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>Bu Gizlilik Politikasının amaçları doğrultusunda:</Text>
            
            <View style={styles.bulletList}>
              {[
                { label: 'Hesap', text: 'Hizmetimize veya Hizmetimizin bazı bölümlerine erişmeniz için size özel oluşturulan hesap anlamına gelir.' },
                { label: 'İştirak', text: 'Bir tarafı kontrol eden, bir tarafça kontrol edilen veya bir tarafla ortak kontrol altında olan bir kuruluş anlamına gelir.' },
                { label: 'Uygulama', text: 'Şirket tarafından sağlanan yazılım programı olan Selfplace anlamına gelir.' },
                { label: 'Şirket', text: '(Bu Gizlilik Politikasında "Şirket", "Biz", "Bizi" veya "Bizim" olarak anılacaktır) Selfplace anlamına gelir.' },
                { label: 'Ülke', text: 'Türkiye anlamına gelir.' },
                { label: 'Cihaz', text: 'Hizmete erişebilen bilgisayar, cep telefonu veya dijital tablet gibi herhangi bir cihaz anlamına gelir.' },
                { label: 'Kişisel Veri', text: 'Kimliği belirli veya belirlenebilir gerçek kişiye ilişkin her türlü bilgi anlamına gelir.' },
                { label: 'Hizmet', text: 'Uygulamayı ifade eder.' },
                { label: 'Hizmet Sağlayıcı', text: 'Verileri Şirket adına işleyen herhangi bir gerçek veya tüzel kişi anlamına gelir.' },
                { label: 'Kullanım Verisi', text: 'Hizmetin kullanımıyla oluşturulan veya Hizmet altyapısından otomatik olarak toplanan veriler anlamına gelir.' },
                { label: 'Siz', text: 'Hizmete erişen veya Hizmeti kullanan birey veya bu bireyin adına Hizmete eriştiği veya kullandığı şirket veya diğer yasal varlık anlamına gelir.' },
              ].map((item, index) => (
                <Text key={index} style={[styles.bulletItem, { color: currentTheme.colors.text.primary }]}>
                  <Text style={{ fontWeight: 'bold' }}>{item.label}: </Text>{item.text}
                </Text>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>Kişisel Verilerin Toplanması ve Kullanımı</Text>
            <Text style={[styles.subSectionTitle, { color: currentTheme.colors.text.primary }]}>Toplanan Veri Türleri</Text>
            
            <Text style={[styles.subSectionTitle, { color: currentTheme.colors.text.secondary, fontSize: 16 }]}>Kişisel Veri</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Hizmetimizi kullanırken, sizinle iletişim kurmak veya sizi tanımlamak için kullanılabilecek kişisel olarak tanımlanabilir bazı bilgiler sağlamanızı isteyebiliriz. Kişisel olarak tanımlanabilir bilgiler bunlarla sınırlı olmamak üzere şunları içerebilir:
            </Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary, marginLeft: 16 }]}>• E-posta adresi</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary, marginLeft: 16 }]}>• İsim ve soyisim</Text>

            <Text style={[styles.subSectionTitle, { color: currentTheme.colors.text.secondary, fontSize: 16 }]}>Kullanım Verisi</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Kullanım Verisi, Hizmeti kullanırken otomatik olarak toplanır. Cihazınızın İnternet Protokol adresi (ör. IP adresi), tarayıcı türü, tarayıcı sürümü, Hizmetimizin ziyaret ettiğiniz sayfaları, ziyaretinizin saati ve tarihi ve diğer tanılama verileri gibi bilgileri içerebilir.
            </Text>

            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>Kişisel Verilerinizin Kullanımı</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>Şirket, Kişisel Verileri aşağıdaki amaçlar için kullanabilir:</Text>
            <View style={styles.bulletList}>
              {[
                'Hizmetimizin kullanımını izlemek de dahil olmak üzere Hizmetimizi sağlamak ve sürdürmek.',
                'Hesabınızı ve kullanıcı olarak kaydınızı yönetmek.',
                'Bir sözleşmenin veya satın alma anlaşmasının ifası için.',
                'Güncellemeler veya bilgilendirici iletişimlerle ilgili olarak e-posta, SMS veya push bildirimleri yoluyla sizinle iletişime geçmek.',
                'Promosyon veya pazarlama e-postaları göndermiyoruz. Sizinle yalnızca hesapla ilgili, güvenlik, destek, şifre sıfırlama veya önemli hizmet bilgileri için iletişime geçebiliriz.',
                'Taleplerinizi yönetmek ve sorularınıza yanıt vermek.',
                'Ticari transferler, birleşmeler veya devralmalar için.',
              ].map((item, index) => (
                <Text key={index} style={[styles.bulletItem, { color: currentTheme.colors.text.primary }]}>• {item}</Text>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>Kişisel Verilerinizin Saklanması</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Şirket, Kişisel Verilerinizi yalnızca bu Gizlilik Politikasında belirtilen amaçlar için gerekli olduğu sürece saklayacaktır. Hesap bilgileri genellikle hesap ilişkiniz süresince artı 24 aya kadar saklanır.
            </Text>

            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>Kişisel Verilerinizin Güvenliği</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Kişisel Verilerinizin güvenliği Bizim için önemlidir, ancak İnternet üzerinden hiçbir iletim yönteminin veya elektronik depolama yönteminin %100 güvenli olmadığını unutmayın. Kişisel Verilerinizi korumak için ticari olarak kabul edilebilir yöntemler kullanmaya çabalasak da mutlak güvenliğini garanti edemeyiz.
            </Text>

            <Text style={[styles.sectionTitle, { color: currentTheme.colors.primary }]}>Bize Ulaşın</Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.text.primary }]}>
              Bu Gizlilik Politikası hakkında herhangi bir sorunuz varsa, bizimle iletişime geçebilirsiniz:
            </Text>
            <Text style={[styles.paragraph, { color: currentTheme.colors.primary, fontWeight: 'bold' }]}>
              E-posta yoluyla: selfplace.support@gmail.com
            </Text>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  contentCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 32,
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
    opacity: 0.9,
  },
  bulletList: {
    marginVertical: 12,
  },
  bulletItem: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
    paddingLeft: 8,
  }
});
