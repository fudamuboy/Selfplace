import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { generatePageMetadata } from "@/lib/metadata";
import { getChangelogs } from "@/lib/mdx";
import { ArrowLeft, History, Zap } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("changelogTitle"),
    description: t("changelogDescription"),
    path: "/changelog",
    locale,
  });
}

export default async function ChangelogPage({ params }: PageProps) {
  const { locale } = await params;
  const logs = getChangelogs(locale);
  const t = await getTranslations("changelog");
  const tCommon = await getTranslations("common");

  const homeHref = locale === "en" ? "/" : `/${locale}`;

  return (
    <Section spacing="lg" className="pt-32" aria-labelledby="changelog-heading">
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
            <History size={12} aria-hidden="true" />
            {t("title")}
          </Badge>
          <h1
            id="changelog-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight"
          >
            {locale === "en" ? (
              <>
                Product <span className="gradient-text">Changelog</span>
              </>
            ) : locale === "tr" ? (
              <>
                Değişiklik <span className="gradient-text">Günlüğü</span>
              </>
            ) : (
              <>
                Journal des <span className="gradient-text">Modifications</span>
              </>
            )}
          </h1>
          <p className="text-brand-text-secondary text-lg sm:text-xl max-w-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Timeline list */}
        <div className="relative border-l border-white/5 pl-6 sm:pl-8 ml-4 flex flex-col gap-10">
          {logs.length === 0 ? (
            <p className="text-brand-text-secondary text-center py-10">
              {t("noLogs")}
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.version} className="relative group">
                {/* Timeline node */}
                <span className="absolute -left-[37px] sm:-left-[45px] top-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary transition-colors group-hover:bg-brand-primary/20">
                  <Zap size={10} className="fill-brand-primary/30" />
                </span>

                <Card variant="glass" className="relative">
                  <CardContent className="flex flex-col gap-4">
                    {/* Header: Version & Date */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-semibold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-2.5 py-0.5 rounded-full mr-3">
                          v{log.version}
                        </span>
                        <span className="text-sm font-medium text-brand-text-secondary">
                          {t("releasedOn")} {log.date}
                        </span>
                      </div>
                      <h2 className="font-display text-lg font-bold text-white sm:text-right">
                        {log.title}
                      </h2>
                    </div>

                    {/* Markdown details list */}
                    <article className="prose prose-invert max-w-none text-brand-text-secondary text-sm sm:text-base leading-relaxed">
                      <MDXRemote source={log.content} />
                    </article>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </Container>
    </Section>
  );
}
