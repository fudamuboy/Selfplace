import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { generatePageMetadata } from "@/lib/metadata";
import { ArrowLeft, FileText } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("termsTitle"),
    description: t("termsDescription"),
    path: "/terms",
    locale,
  });
}

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("terms");
  const tCommon = await getTranslations("common");
  const homeHref = locale === "en" ? "/" : `/${locale}`;
  const deleteHref = locale === "en" ? "/delete-account" : `/${locale}/delete-account`;
  const privacyHref = locale === "en" ? "/privacy" : `/${locale}/privacy`;

  return (
    <Section spacing="lg" className="pt-32" aria-labelledby="terms-heading">
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
            <FileText size={12} aria-hidden="true" />
            Legal
          </Badge>
          <h1
            id="terms-heading"
            className="font-display text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight"
          >
            {t("title")}
          </h1>
          <p className="text-brand-text-secondary text-sm italic">
            {t("lastUpdated")}
          </p>
        </div>

        {/* Content */}
        <article
          className="prose prose-invert max-w-none"
          aria-label="Terms of Service content"
        >
          {locale === "tr" ? (
            <>
              <p>
                Selfplace&apos;e erişerek ve uygulamayı kullanarak bu Kullanım Koşullarına bağlı kalmayı kabul etmiş olursunuz. Bu koşullardan herhangi birini kabul etmiyorsanız, lütfen uygulamayı kullanmayın.
              </p>

              <h2>1. Kabul</h2>
              <p>
                Selfplace uygulamasını kullanarak, bu Kullanım Koşullarını ve Gizlilik Politikamızı okuduğunuzu, anladığınızı ve bunlara bağlı kalmayı kabul ettiğinizi beyan edersiniz. Bu koşullar uygulamanın tüm kullanıcıları için geçerlidir.
              </p>

              <h2>2. Hizmet Açıklaması</h2>
              <p>
                Selfplace, kullanıcıların günlük yansımalarını kaydetmelerine ve öz farkındalıklarını artırmalarına yardımcı olan dijital bir günlük ve yansıma uygulamasıdır.
              </p>
              <p>
                <strong>ÖNEMLİ:</strong> Selfplace bir terapi, tıbbi teşhis, klinik tedavi veya profesyonel psikolojik danışmanlık hizmeti DEĞİLDİR. Uygulamanın içeriği ve yapay zeka tarafından oluşturulan analizler yalnızca bilgilendirme ve kişisel gelişim amaçlıdır. Ciddi psikolojik zorluklar yaşıyorsanız lütfen uzman bir profesyonele danışın.
              </p>

              <h2>3. Kullanıcı Hesapları</h2>
              <p>
                Uygulamayı kullanmak için bir hesap oluşturmanız gerekebilir. Hesap kimlik bilgilerinizin gizliliğini korumaktan siz sorumlusunuz. Hesabınızın yetkisiz kullanımını veya herhangi bir güvenlik ihlalini fark etmeniz durumunda derhal bize bildirmelisiniz.
              </p>

              <h2>4. Yansımalarınız ve İçeriğiniz</h2>
              <p>
                Uygulamaya girdiğiniz notlar ve yansımalar size aittir. Selfplace, bu içeriği yalnızca size hizmet sağlamak, analizler gerçekleştirmek ve kişiselleştirilmiş içgörüler oluşturmak için kullanır. Verileriniz rızanız olmadan asla üçüncü şahıslarla paylaşılmaz.
              </p>

              <h2>5. Yapay Zeka (YZ) Kullanımı</h2>
              <p>
                Uygulama, yansımalarınızı analiz etmek için yapay zeka teknolojilerini kullanır. Yapay zeka tarafından üretilen sonuçlar bazen hatalı veya eksik olabilir. Bu içgörüleri hayatınızda uygularken her zaman kendi muhakemenizi kullanmalı ve gerektiğinde profesyonel destek almalısınız.
              </p>

              <h2>6. Gizlilik ve Veri</h2>
              <p>
                Verilerinizin nasıl işlendiği ve korunduğu hakkında detaylı bilgi için lütfen{" "}
                <Link href={privacyHref}>Gizlilik Politikamızı</Link> inceleyin.
              </p>

              <h2>7. Hesap ve Veri Silme</h2>
              <p>
                Uygulama içindeki Ayarlar → Gizlilik ve Veri bölümünden veya{" "}
                <Link href={deleteHref}>Hesap Silme sayfamızı</Link> ziyaret ederek tüm verilerinizi silebilir veya hesabınızı kalıcı olarak kapatabilirsiniz. Bu işlem geri alınamaz.
              </p>

              <h2>8. Abonelikler ve Uygulama İçi Satın Almalar</h2>
              <p>
                Selfplace, uygulama içi abonelikler aracılığıyla premium özellikler sunar. Abonelikler Apple App Store aracılığıyla yönetilir ve Apple&apos;ın koşul ve politikalarına tabidir. Abonelikler, mevcut fatura döneminin bitiminden en az 24 saat önce iptal edilmediği sürece otomatik olarak yenilenir.
              </p>
              <p>
                Bir aboneliği iptal etmek için cihazınızın Ayarlar → Apple Kimliği → Abonelikler bölümüne gidin.
              </p>

              <h2>9. Yasaklanmış Kullanımlar</h2>
              <p>Şunları yapmamayı kabul edersiniz:</p>
              <ul>
                <li>
                  Hizmeti yasa dışı herhangi bir amaçla veya herhangi bir düzenlemeyi ihlal edecek şekilde kullanmak
                </li>
                <li>
                  Hizmetin herhangi bir bölümüne yetkisiz erişim sağlamaya çalışmak
                </li>
                <li>
                  Uygulamanın herhangi bir bölümünü tersine mühendislik işlemine tabi tutmak, kaynak koda dönüştürmek veya parçalara ayırmak
                </li>
                <li>
                  Hizmeti zararlı, saldırgan veya uygunsuz içerik iletmek için kullanmak
                </li>
              </ul>

              <h2>10. Fikri Mülkiyet</h2>
              <p>
                Tüm içerik, tasarım, kod ve markalama dahil olmak üzere Selfplace uygulaması, Selfplace&apos;in münhasır mülkiyetindedir. Yetkisiz çoğaltılması veya dağıtılması yasaktır.
              </p>

              <h2>11. Sorumluluk Reddi ve Sorumluluğun Sınırlandırılması</h2>
              <p>
                Hizmet &quot;olduğu gibi&quot; sunulmaktadır. Geçerli yasaların izin verdiği azami ölçüde, Selfplace, hizmeti kullanımınızdan kaynaklanan dolaylı, arızi, özel veya cezai zararlardan sorumlu tutulamaz.
              </p>

              <h2>12. Apple Standart Son Kullanıcı Lisans Sözleşmesi (EULA)</h2>
              <p>
                Bu uygulamayı kullanarak Apple&apos;ın Standart Son Kullanıcı Lisans Sözleşmesi&apos;ne (EULA) tabi olduğunuzu kabul edersiniz. Daha fazla bilgi için lütfen{" "}
                <a
                  href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apple&apos;ın EULA sayfasını
                </a>{" "}
                ziyaret edin.
              </p>

              <h2>13. Koşullardaki Değişiklikler</h2>
              <p>
                Selfplace, bu Kullanım Koşullarını zaman zaman güncelleme hakkını saklı tutar. Önemli değişiklikler yapıldığında uygulama üzerinden bildirim yapılacaktır. Değişikliklerden sonra Selfplace&apos;i kullanmaya devam etmeniz, yeni koşulları kabul ettiğiniz anlamına gelir.
              </p>

              <h2>14. Uygulanacak Hukuk</h2>
              <p>
                Bu Koşullar, kanunlar ihtilafı hükümlerine bakılmaksızın Türkiye Cumhuriyeti kanunlarına göre yönetilecek ve yorumlanacaktır.
              </p>

              <h2>15. İletişim</h2>
              <p>
                Sorularınız ve geri bildirimleriniz için bize her zaman şu adresten ulaşabilirsiniz:
              </p>
              <ul>
                <li>
                  <a href="mailto:selfplace.support@gmail.com">
                    selfplace.support@gmail.com
                  </a>
                </li>
              </ul>
            </>
          ) : locale === "fr" ? (
            <>
              <p>
                En accédant à Selfplace et en l&apos;utilisant, vous acceptez d&apos;être lié par les présentes Conditions d&apos;Utilisation. Si vous n&apos;acceptez pas l&apos;une de ces conditions, veuillez ne pas utiliser l&apos;application.
              </p>

              <h2>1. Acceptation</h2>
              <p>
                En utilisant l&apos;application Selfplace, vous reconnaissez avoir lu, compris et accepté d&apos;être lié par ces Conditions d&apos;Utilisation et notre Politique de Confidentialité. Ces conditions s&apos;appliquent à tous les utilisateurs de l&apos;application.
              </p>

              <h2>2. Description du Service</h2>
              <p>
                Selfplace est une application de journal intime et de réflexion numérique qui aide les utilisateurs à enregistrer leurs réflexions quotidiennes et à accroître leur conscience de soi.
              </p>
              <p>
                <strong>IMPORTANT :</strong> Selfplace n&apos;est PAS un service de thérapie, de diagnostic médical, de traitement clinique ou de conseil psychologique professionnel. Le contenu de l&apos;application et les analyses générées par l&apos;IA sont uniquement destinés à des fins de développement personnel et d&apos;information. Si vous rencontrez des difficultés psychologiques graves, veuillez consulter un professionnel qualifié.
              </p>

              <h2>3. Comptes Utilisateurs</h2>
              <p>
                Vous devrez peut-être créer un compte pour utiliser l&apos;application. Vous êtes responsable de la confidentialité de vos identifiants de compte. Vous devez nous informer immédiatement de toute violation de sécurité ou utilisation non autorisée de votre compte.
              </p>

              <h2>4. Vos Réflexions et Contenu</h2>
              <p>
                Les notes et réflexions que vous saisissez dans l&apos;application vous appartiennent. Selfplace utilise ce contenu uniquement pour vous fournir le service, effectuer des analyses et générer des analyses personnalisées. Vos données ne sont jamais partagées avec des tiers sans votre consentement.
              </p>

              <h2>5. Utilisation de l&apos;Intelligence Artificielle (IA)</h2>
              <p>
                L&apos;application utilise les technologies d&apos;IA pour analyser vos réflexions. Les résultats générés par l&apos;IA peuvent parfois être inexacts ou incomplets. Lorsque vous appliquez ces analyses dans votre vie, vous devez toujours faire preuve de jugement et rechercher un soutien professionnel si nécessaire.
              </p>

              <h2>6. Confidentialité et Données</h2>
              <p>
                Pour obtenir des informations détaillées sur le traitement et la protection de vos données, veuillez consulter notre{" "}
                <Link href={privacyHref}>Politique de Confidentialité</Link>.
              </p>

              <h2>7. Suppression de Compte et de Données</h2>
              <p>
                Vous pouvez supprimer toutes vos données ou fermer votre compte définitivement à tout moment via Paramètres → Confidentialité et données dans l&apos;application, ou en visitant notre{" "}
                <Link href={deleteHref}>page de suppression de compte</Link>. Cette action est irréversible.
              </p>

              <h2>8. Abonnements et Achats In-App</h2>
              <p>
                Selfplace propose des fonctionnalités premium via des abonnements intégrés à l&apos;application. Les abonnements sont gérés via l&apos;App Store d&apos;Apple et sont soumis aux conditions et politiques d&apos;Apple. Les abonnements se renouvellent automatiquement à moins d&apos;être annulés au moins 24 heures avant la fin de la période de facturation en cours.
              </p>
              <p>
                Pour annuler un abonnement, accédez aux Réglages de votre appareil → Identifiant Apple → Abonnements.
              </p>

              <h2>9. Utilisations Interdites</h2>
              <p>Vous acceptez de ne pas :</p>
              <ul>
                <li>
                  Utiliser le service à des fins illégales ou en violation de toute réglementation
                </li>
                <li>
                  Tenter d&apos;accéder sans autorisation à toute partie du service
                </li>
                <li>
                  Faire de l&apos;ingénierie inverse, décompiler ou désassembler toute partie de l&apos;application
                </li>
                <li>
                  Utiliser le service pour transmettre du contenu nuisible, offensant ou inapproprié
                </li>
              </ul>

              <h2>10. Propriété Intellectuelle</h2>
              <p>
                L&apos;application Selfplace, y compris tout le contenu, le design, le code et la marque, est la propriété exclusive de Selfplace. Toute reproduction ou distribution non autorisée est interdite.
              </p>

              <h2>11. Limites de Responsabilité</h2>
              <p>
                Le service est fourni &quot;en l&apos;état&quot;, sans garantie d&apos;aucune sorte. Dans la mesure maximale autorisée par la loi applicable, Selfplace ne sera pas responsable des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs découlant de votre utilisation du service.
              </p>

              <h2>12. Contrat de Licence Utilisateur Final Apple (EULA)</h2>
              <p>
                En utilisant cette application, vous reconnaissez que vous êtes soumis au contrat de licence utilisateur final standard (EULA) d&apos;Apple. Pour plus d&apos;informations, veuillez visiter{" "}
                <a
                  href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  la page EULA d&apos;Apple
                </a>.
              </p>

              <h2>13. Modifications des Conditions</h2>
              <p>
                Selfplace se réserve le droit de mettre à jour ces conditions d&apos;utilisation de temps à autre. En cas de modifications importantes, une notification sera fournie via l&apos;application. Votre utilisation continue de Selfplace après toute modification constitue votre acceptation des nouvelles conditions.
              </p>

              <h2>14. Loi Applicable</h2>
              <p>
                Les présentes Conditions seront régies et interprétées conformément aux lois de la Turquie, sans égard à ses dispositions en matière de conflit de lois.
              </p>

              <h2>15. Contactez-nous</h2>
              <p>
                Pour toute question et commentaire, vous pouvez toujours nous joindre à :
              </p>
              <ul>
                <li>
                  <a href="mailto:selfplace.support@gmail.com">
                    selfplace.support@gmail.com
                  </a>
                </li>
              </ul>
            </>
          ) : (
            <>
              <p>
                By accessing and using Selfplace, you accept and agree to be bound
                by these Terms of Service. If you do not agree to any of these
                terms, please do not use the application.
              </p>

              <h2>1. Acceptance</h2>
              <p>
                By using the Selfplace application, you acknowledge that you have
                read, understood, and agree to be bound by these Terms of Service
                and our Privacy Policy. These terms apply to all users of the
                application.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                Selfplace is a digital journaling and reflection application that
                helps users record their daily reflections and increase
                self-awareness.
              </p>
              <p>
                <strong>IMPORTANT:</strong> Selfplace is NOT a therapy, medical
                diagnosis, clinical treatment, or professional psychological
                counseling service. The application&apos;s content and AI-generated
                insights are for informational and personal development purposes
                only. If you are experiencing serious psychological difficulties,
                please consult a qualified professional.
              </p>

              <h2>3. User Accounts</h2>
              <p>
                You may need to create an account to use the application. You are
                responsible for maintaining the confidentiality of your account
                credentials. You must notify us immediately upon becoming aware of
                any breach of security or unauthorized use of your account.
              </p>

              <h2>4. Your Reflections and Content</h2>
              <p>
                The notes and reflections you enter into the application belong to
                you. Selfplace uses this content only to provide you with the
                service, perform analyses, and generate personalized insights. Your
                data is never shared with third parties without your consent.
              </p>

              <h2>5. Artificial Intelligence (AI) Usage</h2>
              <p>
                The application uses AI technologies to analyze your reflections.
                Results generated by AI may sometimes be inaccurate or incomplete.
                When applying these insights in your life, you should always use
                your own judgment and seek professional support when necessary.
              </p>

              <h2>6. Privacy and Data</h2>
              <p>
                For detailed information on how your data is processed and
                protected, please review our{" "}
                <Link href={privacyHref}>Privacy Policy</Link>.
              </p>

              <h2>7. Account and Data Deletion</h2>
              <p>
                You may delete all your data or close your account permanently at
                any time through Settings → Privacy &amp; Data within the app, or
                by visiting our{" "}
                <Link href={deleteHref}>Account Deletion page</Link>. This
                action is irreversible.
              </p>

              <h2>8. Subscriptions and In-App Purchases</h2>
              <p>
                Selfplace offers premium features through in-app subscriptions.
                Subscriptions are managed through the Apple App Store and are
                subject to Apple&apos;s terms and policies. Subscriptions
                automatically renew unless cancelled at least 24 hours before the
                end of the current billing period.
              </p>
              <p>
                To cancel a subscription, go to your device&apos;s Settings →
                Apple ID → Subscriptions.
              </p>

              <h2>9. Prohibited Uses</h2>
              <p>You agree not to:</p>
              <ul>
                <li>
                  Use the service for any unlawful purpose or in violation of any
                  regulations
                </li>
                <li>
                  Attempt to gain unauthorized access to any portion of the service
                </li>
                <li>
                  Reverse engineer, decompile, or disassemble any part of the
                  application
                </li>
                <li>
                  Use the service to transmit harmful, offensive, or inappropriate
                  content
                </li>
              </ul>

              <h2>10. Intellectual Property</h2>
              <p>
                The Selfplace application, including all content, design, code, and
                branding, is the exclusive property of Selfplace. Unauthorized
                reproduction or distribution is prohibited.
              </p>

              <h2>11. Disclaimers and Limitation of Liability</h2>
              <p>
                The service is provided &quot;as is&quot; without warranties of any
                kind. To the maximum extent permitted by applicable law, Selfplace
                shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages arising from your use of the
                service.
              </p>

              <h2>12. Apple Standard End User License Agreement (EULA)</h2>
              <p>
                By using this application, you acknowledge that you are subject to
                Apple&apos;s Standard End User License Agreement (EULA). For more
                information, please visit{" "}
                <a
                  href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apple&apos;s EULA page
                </a>
                .
              </p>

              <h2>13. Changes to Terms</h2>
              <p>
                Selfplace reserves the right to update these Terms of Service from
                time to time. When significant changes are made, notification will
                be provided through the application. Your continued use of
                Selfplace after any changes constitutes your acceptance of the new
                terms.
              </p>

              <h2>14. Governing Law</h2>
              <p>
                These Terms shall be governed and construed in accordance with the
                laws of Turkey, without regard to its conflict of law provisions.
              </p>

              <h2>15. Contact Us</h2>
              <p>
                For questions and feedback, you can always reach us at:
              </p>
              <ul>
                <li>
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
