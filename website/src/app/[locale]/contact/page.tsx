import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { generatePageMetadata } from "@/lib/metadata";
import { ArrowLeft, Mail, Clock, Trash2, ArrowRight } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("contactTitle"),
    description: t("contactDescription"),
    path: "/contact",
    locale,
  });
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("contact");
  const tCommon = await getTranslations("common");
  
  const homeHref = locale === "en" ? "/" : `/${locale}`;
  const deleteHref = locale === "en" ? "/delete-account" : `/${locale}/delete-account`;

  return (
    <Section spacing="lg" className="pt-32" aria-labelledby="contact-heading">
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
            <Mail size={12} aria-hidden="true" />
            {t("supportBadge")}
          </Badge>
          <h1
            id="contact-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight"
          >
            {t("headline").split("\n").map((line, i) => (
              <span key={i} className="block">
                {i === 1 ? <span className="gradient-text">{line}</span> : line}
              </span>
            ))}
          </h1>
          <p className="text-brand-text-secondary text-lg sm:text-xl max-w-xl leading-relaxed">
            {t("subheadline")}
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid gap-5 sm:gap-6">
          {/* Email card */}
          <Card variant="glass">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div
                className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <Mail size={24} className="text-brand-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-1">
                  {t("emailLabel")}
                </p>
                <a
                  href={`mailto:${t("email")}`}
                  className="text-xl sm:text-2xl font-display font-semibold text-white hover:text-brand-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                  aria-label={`Send email to ${t("email")}`}
                >
                  {t("email")}
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Response time card */}
          <Card variant="glass">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div
                className="w-14 h-14 rounded-2xl bg-brand-calm/10 flex items-center justify-center flex-shrink-0"
                aria-hidden="true"
              >
                <Clock size={24} className="text-brand-calm" />
              </div>
              <div>
                <p className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-1">
                  {t("responseTimeLabel")}
                </p>
                <p className="text-xl font-display font-semibold text-white">
                  {t("responseTime")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delete account link card */}
          <Link href={deleteHref} className="block group focus-visible:outline-none">
            <Card
              variant="bordered"
              hover
              className="group-focus-visible:ring-2 group-focus-visible:ring-brand-primary"
            >
              <CardContent className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div
                    className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Trash2 size={22} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-text-secondary uppercase tracking-wider mb-1">
                      {t("deleteAccount")}
                    </p>
                    <p className="text-white font-medium">
                      {t("deleteAccountLink")}
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={20}
                  className="text-brand-text-secondary group-hover:text-brand-primary transition-colors flex-shrink-0"
                  aria-hidden="true"
                />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Additional note */}
        <div className="mt-12 text-center">
          <p className="text-brand-text-secondary text-sm">
            {t.rich("privacyNote", {
              privacyLink: (chunks) => (
                <Link
                  href={locale === "en" ? "/privacy" : `/${locale}/privacy`}
                  className="text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary rounded"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </Container>
    </Section>
  );
}
