import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { generatePageMetadata } from "@/lib/metadata";
import { getFAQs } from "@/lib/mdx";
import { ArrowLeft, HelpCircle, ChevronDown } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("faqTitle"),
    description: t("faqDescription"),
    path: "/faq",
    locale,
  });
}

export default async function FAQPage({ params }: PageProps) {
  const { locale } = await params;
  const faqs = getFAQs(locale);
  const t = await getTranslations("faq");
  const tCommon = await getTranslations("common");

  const homeHref = locale === "en" ? "/" : `/${locale}`;

  return (
    <Section spacing="lg" className="pt-32" aria-labelledby="faq-heading">
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
        <div className="mb-14 text-center sm:text-left">
          <Badge variant="subtle" className="mb-5">
            <HelpCircle size={12} aria-hidden="true" />
            FAQ
          </Badge>
          <h1
            id="faq-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight animate-fade-in"
          >
            {locale === "en" ? (
              <>
                Frequently Asked <span className="gradient-text">Questions</span>
              </>
            ) : locale === "tr" ? (
              <>
                Sıkça Sorulan <span className="gradient-text">Sorular</span>
              </>
            ) : (
              <>
                Foire Aux <span className="gradient-text">Questions</span>
              </>
            )}
          </h1>
          <p className="text-brand-text-secondary text-lg sm:text-xl max-w-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* FAQ List */}
        <div className="flex flex-col gap-4">
          {faqs.length === 0 ? (
            <p className="text-brand-text-secondary text-center py-10">
              {t("noQuestions")}
            </p>
          ) : (
            faqs.map((faq, i) => (
              <Card key={i} variant="glass" className="overflow-hidden">
                <details className="group" open={i === 0}>
                  <summary className="flex items-center justify-between p-6 font-display font-semibold text-base sm:text-lg text-white hover:text-brand-primary cursor-pointer transition-colors list-none focus-visible:outline-none">
                    <span className="pr-4">{faq.question}</span>
                    <ChevronDown
                      size={18}
                      className="text-brand-text-secondary group-open:rotate-180 transition-transform duration-300 flex-shrink-0"
                    />
                  </summary>
                  <div className="px-6 pb-6 pt-0 border-t border-white/5">
                    <article className="prose prose-invert max-w-none pt-4 text-brand-text-secondary text-sm sm:text-base leading-relaxed">
                      <MDXRemote source={faq.content} />
                    </article>
                  </div>
                </details>
              </Card>
            ))
          )}
        </div>
      </Container>
    </Section>
  );
}
