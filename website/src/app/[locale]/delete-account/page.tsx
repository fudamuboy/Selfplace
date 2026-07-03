import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { generatePageMetadata } from "@/lib/metadata";
import {
  ArrowLeft,
  Trash2,
  Smartphone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("deleteAccountTitle"),
    description: t("deleteAccountDescription"),
    path: "/delete-account",
    locale,
  });
}

export default async function DeleteAccountPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations("deleteAccount");
  const tCommon = await getTranslations("common");
  
  const homeHref = locale === "en" ? "/" : `/${locale}`;

  const inAppSteps: string[] = t.raw("inApp.steps");
  const deletedItems: string[] = t.raw("deleted.items");
  const retainedItems: string[] = t.raw("retained.items");

  return (
    <Section
      spacing="lg"
      className="pt-32"
      aria-labelledby="delete-account-heading"
    >
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
        <div className="mb-14">
          <Badge variant="subtle" className="mb-5">
            <Trash2 size={12} aria-hidden="true" />
            {t("badge")}
          </Badge>
          <h1
            id="delete-account-heading"
            className="font-display text-4xl sm:text-5xl font-bold text-white mb-5 tracking-tight"
          >
            {t("headline")}
          </h1>
          <p className="text-brand-text-secondary text-lg max-w-xl leading-relaxed">
            {t("subheadline")}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {/* ── Method 1: In-App Deletion ── */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <Smartphone size={22} className="text-brand-primary" />
                </div>
                <div>
                  <Badge variant="primary" className="text-[10px] mb-1">
                    {t("recommended")}
                  </Badge>
                  <h2 className="font-display text-xl font-semibold text-white">
                    {t("inApp.title")}
                  </h2>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-brand-text-secondary mb-6">
                {t("inApp.description")}
              </p>
              <ol
                className="flex flex-col gap-3"
                aria-label="Steps to delete account in app"
              >
                {inAppSteps.map((step, i) => (
                  <li key={i} className="flex items-center gap-4">
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-primary/15 border border-brand-primary/30 flex items-center justify-center text-xs font-bold text-brand-primary"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="text-white/85 text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* ── Method 2: Email Request ── */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <Mail size={22} className="text-brand-accent" />
                </div>
                <h2 className="font-display text-xl font-semibold text-white">
                  {t("byEmail.title")}
                </h2>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-brand-text-secondary mb-5">
                {t("byEmail.description")}
              </p>
              <a
                href={`mailto:${t("byEmail.email")}?subject=${encodeURIComponent(t("byEmail.subject"))}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-semibold text-sm hover:bg-brand-primary/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                aria-label={`Send account deletion request email to ${t("byEmail.email")}`}
              >
                <Mail size={16} aria-hidden="true" />
                {t("byEmail.email")}
              </a>
              <p className="text-brand-text-secondary text-sm mt-4 flex items-start gap-2">
                <Info
                  size={14}
                  className="text-brand-text-secondary mt-0.5 flex-shrink-0"
                  aria-hidden="true"
                />
                {t("byEmail.note")}
              </p>
            </CardContent>
          </Card>

          {/* ── What gets deleted ── */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2
                  size={20}
                  className="text-green-400"
                  aria-hidden="true"
                />
                <h2 className="font-display text-xl font-semibold text-white">
                  {t("deleted.title")}
                </h2>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="flex flex-col gap-3" aria-label="Data deleted on account deletion">
                {deletedItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2
                      size={16}
                      className="text-green-400 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-white/85 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* ── What may be retained ── */}
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle
                  size={20}
                  className="text-yellow-400"
                  aria-hidden="true"
                />
                <h2 className="font-display text-xl font-semibold text-white">
                  {t("retained.title")}
                </h2>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-brand-text-secondary text-sm mb-4">
                {t("retained.description")}
              </p>
              <ul
                className="flex flex-col gap-3 mb-4"
                aria-label="Data that may be retained after deletion"
              >
                {retainedItems.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <AlertCircle
                      size={14}
                      className="text-yellow-400/70 flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-white/70 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-brand-text-secondary text-xs italic border-t border-white/5 pt-4">
                {t("retained.note")}
              </p>
            </CardContent>
          </Card>

          {/* ── Questions ── */}
          <div className="text-center py-4">
            <p className="text-brand-text-secondary text-sm mb-2">
              {t("contact.title")}
            </p>
            <p className="text-brand-text-secondary text-sm">
              {t("contact.description")}{" "}
              <a
                href={`mailto:${t("contact.email")}`}
                className="text-brand-primary hover:text-brand-accent transition-colors font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary rounded"
              >
                {t("contact.email")}
              </a>
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
