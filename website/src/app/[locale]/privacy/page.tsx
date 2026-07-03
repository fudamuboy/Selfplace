import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { generatePageMetadata } from "@/lib/metadata";
import { ArrowLeft, Shield } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    path: "/privacy",
    locale,
  });
}

export default async function PrivacyPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("privacy");
  const tCommon = await getTranslations("common");
  const homeHref = locale === "en" ? "/" : `/${locale}`;

  return (
    <Section spacing="lg" className="pt-32" aria-labelledby="privacy-heading">
      <Container size="md">
        {/* Back link */}
        <Link
          href={homeHref}
          className="inline-flex items-center gap-2 text-sm text-brand-text-secondary hover:text-brand-primary transition-colors mb-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
          aria-label={tCommon("backToHome")}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {tCommon("backToHome")}
        </Link>

        {/* Header */}
        <div className="mb-12">
          <Badge variant="subtle" className="mb-5">
            <Shield size={12} aria-hidden="true" />
            Legal
          </Badge>
          <h1
            id="privacy-heading"
            className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight"
          >
            {t("title")}
          </h1>
          <p className="text-brand-text-secondary text-sm italic">
            {t("lastUpdated")}
          </p>
        </div>

        {/* Localized Content */}
        <article
          className="prose prose-invert max-w-none"
          aria-label="Privacy Policy content"
        >
          {locale === "tr" ? (
            <>
              <p>
                Bu Gizlilik Politikası, Hizmeti kullandığınızda bilgilerinizin toplanması, kullanılması ve ifşa edilmesine ilişkin politika ve prosedürlerimizi açıklar ve gizlilik haklarınız ile yasaların sizi nasıl koruduğunu anlatır.
              </p>
              <p>
                Kişisel verilerinizi Hizmeti sağlamak ve iyileştirmek için kullanırız. Hizmeti kullanarak, bilgilerin bu Gizlilik Politikasına uygun olarak toplanmasını ve kullanılmasını kabul etmiş olursunuz.
              </p>

              <h2>Yorumlama ve Tanımlar</h2>
              <h3>Yorumlama</h3>
              <p>
                İlk harfi büyük olan kelimeler, aşağıdaki koşullar altında tanımlanan anlamlara sahiptir. Aşağıdaki tanımlar, tekil veya çoğul olarak görünmelerinden bağımsız olarak aynı anlama gelecektir.
              </p>
              <h3>Tanımlar</h3>
              <p>Bu Gizlilik Politikasının amaçları doğrultusunda:</p>
              <ul>
                <li>
                  <strong>Hesap</strong>, Hizmetimize veya Hizmetimizin belirli bölümlerine erişmeniz için oluşturulan benzersiz bir hesap anlamına gelir.
                </li>
                <li>
                  <strong>Uygulama</strong>, Şirket tarafından sağlanan ve sizin tarafınızdan herhangi bir elektronik cihaza indirilen Selfplace adlı yazılım programı anlamına gelir.
                </li>
                <li>
                  <strong>Şirket</strong> (bu Sözleşmede &quot;Şirket&quot;, &quot;Biz&quot;, &quot;Bize&quot; veya &quot;Bizim&quot; olarak anılır) Selfplace anlamına gelir.
                </li>
                <li>
                  <strong>Ülke</strong>, Türkiye&apos;yi ifade eder.
                </li>
                <li>
                  <strong>Cihaz</strong>, bilgisayar, cep telefonu veya dijital tablet gibi Hizmete erişebilen herhangi bir cihaz anlamına gelir.
                </li>
                <li>
                  <strong>Kişisel Veri</strong>, kimliği belirli veya belirlenebilir bir gerçek kişiye ilişkin her türlü bilgi anlamına gelir.
                </li>
                <li>
                  <strong>Hizmet</strong>, Uygulamayı ifade eder.
                </li>
                <li>
                  <strong>Hizmet Sağlayıcı</strong>, Şirket adına verileri işleyen her türlü gerçek veya tüzel kişi anlamına gelir.
                </li>
                <li>
                  <strong>Kullanım Verisi</strong>, Hizmetin kullanımından veya Hizmet altyapısının kendisinden otomatik olarak toplanan verileri ifade eder.
                </li>
                <li>
                  <strong>Siz</strong>, Hizmete erişen veya Hizmeti kullanan kişiyi ya da uygulanabildiği durumlarda, bu kişinin adına Hizmete eriştiği veya Hizmeti kullandığı şirketi veya diğer yasal kuruluşu ifade eder.
                </li>
              </ul>

              <h2>Kişisel Verilerinizin Toplanması ve Kullanılması</h2>
              <h3>Toplanan Veri Türleri</h3>
              <h4>Kişisel Veriler</h4>
              <p>
                Hizmetimizi kullanırken, Sizinle iletişim kurmak veya kimliğinizi belirlemek için kullanılabilecek belirli kişisel olarak tanımlanabilir bilgileri bize sağlamanızı isteyebiliriz. Kişisel olarak tanımlanabilir bilgiler şunları içerebilir ancak bunlarla sınırlı değildir:
              </p>
              <ul>
                <li>E-posta adresi</li>
                <li>Adı ve soyadı</li>
                <li>Kullanım Verileri</li>
              </ul>
              <h4>Kullanım Verileri</h4>
              <p>
                Kullanım Verileri, Hizmet kullanıldığında otomatik olarak toplanır. Kullanım Verileri, Cihazınızın İnternet Protokol adresi (örn. IP adresi), tarayıcı türü, tarayıcı sürümü, Hizmetimizin ziyaret ettiğiniz sayfaları, ziyaretinizin saati ve tarihi, bu sayfalarda geçirilen süre, benzersiz cihaz tanımlayıcıları ve diğer teşhis verileri gibi bilgileri içerebilir.
              </p>

              <h2>Kişisel Verilerinizin Kullanımı</h2>
              <p>Şirket, Kişisel Verileri aşağıdaki amaçlarla kullanabilir:</p>
              <ul>
                <li>
                  <strong>Hizmetimizi sağlamak ve sürdürmek</strong>, Hizmetimizin kullanımını izlemek de dahil olmak üzere.
                </li>
                <li>
                  <strong>Hesabınızı yönetmek</strong>: Hizmetin kullanıcısı olarak kaydınızı yönetmek için.
                </li>
                <li>
                  <strong>Bir sözleşmenin ifası için</strong>: Satın aldığınız ürünler, ürünler veya hizmetler için satın alma sözleşmesinin geliştirilmesi, uyumluluğu ve taahhüdü.
                </li>
                <li>
                  <strong>Sizinle iletişim kurmak</strong>: İşlevler, ürünler veya sözleşmeli hizmetlerle ilgili güncellemeler veya bilgilendirici iletişimler hakkında Sizinle e-posta, anlık bildirimler veya diğer elektronik iletişim biçimleriyle iletişim kurmak.
                  <strong> Tanıtım veya pazarlama e-postaları göndermeyiz.</strong>
                </li>
                <li>
                  <strong>Taleplerinizi yönetmek</strong>: Bize ilettiğiniz taleplerinizi yanıtlamak ve yönetmek için.
                </li>
              </ul>

              <h2>Kişisel Verilerinizin Saklanması</h2>
              <p>
                Şirket, Kişisel Verilerinizi yalnızca bu Gizlilik Politikasında belirtilen amaçlar için gerekli olduğu sürece saklayacaktır. Hesap bilgileri genellikle hesap ilişkiniz süresince ve sonrasında en fazla 24 aya kadar saklanır.
              </p>

              <h2>Kişisel Verilerinizin Güvenliği</h2>
              <p>
                Kişisel Verilerinizin güvenliği bizim için önemlidir, ancak İnternet üzerinden hiçbir iletim yönteminin veya elektronik depolama yönteminin %100 güvenli olmadığını unutmayın. Kişisel Verilerinizi korumak için ticari olarak kabul edilebilir araçları kullanmaya çalışsak da, mutlak güvenliğini garanti edemeyiz.
              </p>

              <h2>Çocukların Gizliliği</h2>
              <p>
                Hizmetimiz 13 yaşın altındaki hiç kimseye hitap etmemektedir. 13 yaşın altındaki hiç kimseden bilerek kişisel olarak tanımlanabilir bilgi toplamıyoruz. Eğer bir ebeveyn veya vasiyseniz ve çocuğunuzun bize Kişisel Veri sağladığından haberdarsanız, lütfen bizimle iletişime geçin.
              </p>

              <h2>Diğer Web Sitelerine Bağlantılar</h2>
              <p>
                Hizmetimiz, bizim tarafımızdan işletilmeyen diğer web sitelerine bağlantılar içerebilir. Üçüncü taraf bir bağlantıya tıklarsanız, o üçüncü tarafın sitesine yönlendirilirsiniz. Ziyaret ettiğiniz her sitenin Gizlilik Politikasını incelemenizi önemle tavsiye ederiz.
              </p>

              <h2>Bu Gizlilik Politikasındaki Değişiklikler</h2>
              <p>
                Gizlilik Politikamızı zaman zaman güncelleyebiliriz. Yeni Gizlilik Politikasını bu sayfada yayınlayarak ve &quot;Son güncelleme&quot; tarihini güncelleyerek herhangi bir değişikliği Size bildireceğiz.
              </p>

              <h2>Bize Ulaşın</h2>
              <p>Bu Gizlilik Politikası hakkında herhangi bir sorunuz varsa, bizimle iletişime geçebilirsiniz:</p>
              <ul>
                <li>
                  E-posta yoluyla:{" "}
                  <a href="mailto:selfplace.support@gmail.com">
                    selfplace.support@gmail.com
                  </a>
                </li>
              </ul>
            </>
          ) : locale === "fr" ? (
            <>
              <p>
                Cette politique de confidentialité décrit nos politiques et procédures sur la collecte, l&apos;utilisation et la divulgation de vos informations lorsque vous utilisez le service et vous informe de vos droits en matière de confidentialité et de la manière dont la loi vous protège.
              </p>
              <p>
                Nous utilisons vos données personnelles pour fournir et améliorer le service. En utilisant le service, vous acceptez la collecte et l&apos;utilisation d&apos;informations conformément à cette politique de confidentialité.
              </p>

              <h2>Interprétation et Définitions</h2>
              <h3>Interprétation</h3>
              <p>
                Les mots dont la lettre initiale est majuscule ont des significations définies dans les conditions suivantes. Les définitions suivantes ont la même signification, qu&apos;elles apparaissent au singulier ou au pluriel.
              </p>
              <h3>Définitions</h3>
              <p>Aux fins de la présente politique de confidentialité :</p>
              <ul>
                <li>
                  <strong>Compte</strong> désigne un compte unique créé pour vous permettre d&apos;accéder à notre service ou à des parties de notre service.
                </li>
                <li>
                  <strong>Application</strong> désigne le programme logiciel fourni par la société téléchargé par vous sur tout appareil électronique, nommé Selfplace.
                </li>
                <li>
                  <strong>Société</strong> (désignée par &quot;la Société&quot;, &quot;Nous&quot;, &quot;Notre&quot; ou &quot;Nos&quot; dans le présent accord) fait référence à Selfplace.
                </li>
                <li>
                  <strong>Pays</strong> fait référence à la Turquie.
                </li>
                <li>
                  <strong>Dispositif</strong> désigne tout appareil capable d&apos;accéder au service tel qu&apos;un ordinateur, un téléphone portable ou une tablette numérique.
                </li>
                <li>
                  <strong>Données Personnelles</strong> désigne toute information relative à une personne physique identifiée ou identifiable.
                </li>
                <li>
                  <strong>Service</strong> fait référence à l&apos;Application.
                </li>
                <li>
                  <strong>Prestataire de Services</strong> désigne toute personne physique ou morale qui traite les données pour le compte de la Société.
                </li>
                <li>
                  <strong>Données d&apos;Utilisation</strong> fait référence aux données collectées automatiquement, générées soit par l&apos;utilisation du service, soit par l&apos;infrastructure du service elle-même.
                </li>
                <li>
                  <strong>Vous</strong> désigne la personne physique qui accède au service ou l&apos;utilise, ou la société ou autre entité juridique pour le compte de laquelle cette personne accède au service ou l&apos;utilise, selon le cas.
                </li>
              </ul>

              <h2>Collecte et Utilisation de vos Données Personnelles</h2>
              <h3>Types de Données Collectées</h3>
              <h4>Données Personnelles</h4>
              <p>
                Lors de l&apos;utilisation de notre service, nous pouvons vous demander de nous fournir certaines informations personnellement identifiables qui peuvent être utilisées pour vous contacter ou vous identifier. Les informations personnellement identifiables peuvent inclure, sans s&apos;y limiter :
              </p>
              <ul>
                <li>Adresse e-mail</li>
                <li>Prénom et nom</li>
                <li>Données d&apos;utilisation</li>
              </ul>
              <h4>Données d&apos;Utilisation</h4>
              <p>
                Les données d&apos;utilisation sont collectées automatiquement lors de l&apos;utilisation du service. Les données d&apos;utilisation peuvent inclure des informations telles que l&apos;adresse de protocole Internet de votre appareil (ex. adresse IP), le type de navigateur, la version du navigateur, les pages de notre service que vous visitez, l&apos;heure et la date de votre visite, le temps passé sur ces pages, les identifiants uniques de l&apos;appareil et d&apos;autres données de diagnostic.
              </p>

              <h2>Utilisation de vos Données Personnelles</h2>
              <p>La Société peut utiliser les données personnelles aux fins suivantes :</p>
              <ul>
                <li>
                  <strong>Pour fournir et maintenir notre service</strong>, y compris pour surveiller l&apos;utilisation de notre service.
                </li>
                <li>
                  <strong>Pour gérer votre compte</strong> : gérer votre inscription en tant qu&apos;utilisateur du service.
                </li>
                <li>
                  <strong>Pour l&apos;exécution d&apos;un contrat</strong> : le développement, la conformité et la réalisation du contrat d&apos;achat pour les produits, articles ou services que vous avez achetés.
                </li>
                <li>
                  <strong>Pour vous contacter</strong> : vous contacter par e-mail, notifications push ou autres formes équivalentes de communication électronique concernant les mises à jour ou les communications d&apos;information relatives aux fonctionnalités, produits ou services contractuels.
                  <strong> Nous n&apos;envoyons pas d&apos;e-mails promotionnels ou de marketing.</strong>
                </li>
                <li>
                  <strong>Pour gérer vos demandes</strong> : répondre et gérer vos demandes auprès de nous.
                </li>
              </ul>

              <h2>Conservation de vos Données Personnelles</h2>
              <p>
                La Société ne conservera vos données personnelles que pendant la durée nécessaire aux fins énoncées dans la présente politique de confidentialité. Les informations relatives au compte sont généralement conservées pendant la durée de votre relation de compte et jusqu&apos;à 24 mois après.
              </p>

              <h2>Sécurité de vos Données Personnelles</h2>
              <p>
                La sécurité de vos données personnelles est importante pour nous, mais n&apos;oubliez pas qu&apos;aucune méthode de transmission sur Internet ou méthode de stockage électronique n&apos;est sûre à 100 %. Bien que nous nous efforcions d&apos;utiliser des moyens commercialement acceptables pour protéger vos données personnelles, nous ne pouvons garantir leur sécurité absolue.
              </p>

              <h2>Confidentialité des Enfants</h2>
              <p>
                Notre service ne s&apos;adresse pas aux enfants de moins de 13 ans. Nous ne collectons pas sciemment d&apos;informations personnellement identifiables auprès d&apos;enfants de moins de 13 ans. Si vous êtes un parent ou un tuteur et que vous apprenez que votre enfant nous a fourni des données personnelles, veuillez nous contacter.
              </p>

              <h2>Liens vers d&apos;autres Sites Web</h2>
              <p>
                Notre service peut contenir des liens vers d&apos;autres sites web qui ne sont pas exploités par nous. Si vous cliquez sur un lien tiers, vous serez dirigé vers le site de ce tiers. Nous vous conseillons vivement de consulter la politique de confidentialité de chaque site que vous visitez.
              </p>

              <h2>Modifications de cette Politique de Confidentialité</h2>
              <p>
                Nous pouvons mettre à jour notre politique de confidentialité de temps à autre. Nous vous informerons de tout changement en publiant la nouvelle politique de confidentialité sur cette page et en mettant à jour la date de &quot;Dernière mise à jour&quot;.
              </p>

              <h2>Contactez-nous</h2>
              <p>Si vous avez des questions concernant cette politique de confidentialité, vous pouvez nous contacter :</p>
              <ul>
                <li>
                  Par e-mail :{" "}
                  <a href="mailto:selfplace.support@gmail.com">
                    selfplace.support@gmail.com
                  </a>
                </li>
              </ul>
            </>
          ) : (
            <>
              <p>
                This Privacy Policy describes Our policies and procedures on the
                collection, use and disclosure of Your information when You use the
                Service and tells You about Your privacy rights and how the law
                protects You.
              </p>
              <p>
                We use Your Personal data to provide and improve the Service. By
                using the Service, You agree to the collection and use of
                information in accordance with this Privacy Policy.
              </p>

              <h2>Interpretation and Definitions</h2>
              <h3>Interpretation</h3>
              <p>
                The words of which the initial letter is capitalized have meanings
                defined under the following conditions. The following definitions
                shall have the same meaning regardless of whether they appear in
                singular or in plural.
              </p>
              <h3>Definitions</h3>
              <p>For the purposes of this Privacy Policy:</p>
              <ul>
                <li>
                  <strong>Account</strong> means a unique account created for You to
                  access our Service or parts of our Service.
                </li>
                <li>
                  <strong>Application</strong> means the software program provided
                  by the Company downloaded by You on any electronic device, named
                  Selfplace.
                </li>
                <li>
                  <strong>Company</strong> (referred to as either &quot;the
                  Company&quot;, &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot;
                  in this Agreement) refers to Selfplace.
                </li>
                <li>
                  <strong>Country</strong> refers to Turkey.
                </li>
                <li>
                  <strong>Device</strong> means any device that can access the
                  Service such as a computer, a cellphone or a digital tablet.
                </li>
                <li>
                  <strong>Personal Data</strong> is any information that relates to
                  an identified or identifiable individual.
                </li>
                <li>
                  <strong>Service</strong> refers to the Application.
                </li>
                <li>
                  <strong>Service Provider</strong> means any natural or legal
                  person who processes the data on behalf of the Company.
                </li>
                <li>
                  <strong>Usage Data</strong> refers to data collected
                  automatically, either generated by the use of the Service or from
                  the Service infrastructure itself.
                </li>
                <li>
                  <strong>You</strong> means the individual accessing or using the
                  Service, or the company, or other legal entity on behalf of which
                  such individual is accessing or using the Service, as applicable.
                </li>
              </ul>

              <h2>Collecting and Using Your Personal Data</h2>
              <h3>Types of Data Collected</h3>
              <h4>Personal Data</h4>
              <p>
                While using Our Service, We may ask You to provide Us with certain
                personally identifiable information that can be used to contact or
                identify You. Personally identifiable information may include, but
                is not limited to:
              </p>
              <ul>
                <li>Email address</li>
                <li>First name and last name</li>
                <li>Usage Data</li>
              </ul>
              <h4>Usage Data</h4>
              <p>
                Usage Data is collected automatically when using the Service. Usage
                Data may include information such as Your Device&apos;s Internet
                Protocol address (e.g. IP address), browser type, browser version,
                the pages of our Service that You visit, the time and date of Your
                visit, the time spent on those pages, unique device identifiers and
                other diagnostic data.
              </p>

              <h2>Use of Your Personal Data</h2>
              <p>The Company may use Personal Data for the following purposes:</p>
              <ul>
                <li>
                  <strong>To provide and maintain our Service</strong>, including to
                  monitor the usage of our Service.
                </li>
                <li>
                  <strong>To manage Your Account</strong>: to manage Your
                  registration as a user of the Service.
                </li>
                <li>
                  <strong>For the performance of a contract</strong>: the
                  development, compliance and undertaking of the purchase contract
                  for the products, items or services You have purchased.
                </li>
                <li>
                  <strong>To contact You</strong>: To contact You by email, push
                  notifications or other equivalent forms of electronic
                  communication regarding updates or informative communications
                  related to the functionalities, products or contracted services.
                  <strong> We do not send promotional or marketing emails.</strong>
                </li>
                <li>
                  <strong>To manage Your requests</strong>: To attend and manage
                  Your requests to Us.
                </li>
              </ul>

              <h2>Retention of Your Personal Data</h2>
              <p>
                The Company will retain Your Personal Data only for as long as is
                necessary for the purposes set out in this Privacy Policy. Account
                information is generally retained for the duration of your account
                relationship plus up to 24 months.
              </p>

              <h2>Security of Your Personal Data</h2>
              <p>
                The security of Your Personal Data is important to Us, but remember
                that no method of transmission over the Internet, or method of
                electronic storage is 100% secure. While We strive to use
                commercially acceptable means to protect Your Personal Data, We
                cannot guarantee its absolute security.
              </p>

              <h2>Children&apos;s Privacy</h2>
              <p>
                Our Service does not address anyone under the age of 13. We do not
                knowingly collect personally identifiable information from anyone
                under the age of 13. If You are a parent or guardian and You are
                aware that Your child has provided Us with Personal Data, please
                contact Us.
              </p>

              <h2>Links to Other Websites</h2>
              <p>
                Our Service may contain links to other websites that are not
                operated by Us. If You click on a third party link, You will be
                directed to that third party&apos;s site. We strongly advise You to
                review the Privacy Policy of every site You visit.
              </p>

              <h2>Changes to this Privacy Policy</h2>
              <p>
                We may update Our Privacy Policy from time to time. We will notify
                You of any changes by posting the new Privacy Policy on this page
                and updating the &quot;Last updated&quot; date.
              </p>

              <h2>Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, You can contact
                us:
              </p>
              <ul>
                <li>
                  By email:{" "}
                  <a href="mailto:selfplace.support@gmail.com">
                    selfplace.support@gmail.com
                  </a>
                </li>
              </ul>
            </>
          )}
        </article>
      </Container>
    </Section>
  );
}
