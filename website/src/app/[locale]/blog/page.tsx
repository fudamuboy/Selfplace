import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { generatePageMetadata } from "@/lib/metadata";
import { getBlogPosts } from "@/lib/mdx";
import { ArrowLeft, BookOpen, Calendar, User } from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("blogTitle"),
    description: t("blogDescription"),
    path: "/blog",
    locale,
  });
}

export default async function BlogPage({ params }: PageProps) {
  const { locale } = await params;
  const posts = getBlogPosts(locale);
  const t = await getTranslations("blog");
  const tCommon = await getTranslations("common");
  
  const homeHref = locale === "en" ? "/" : `/${locale}`;

  return (
    <Section spacing="lg" className="pt-32" aria-labelledby="blog-heading">
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
            <BookOpen size={12} aria-hidden="true" />
            {t("title")}
          </Badge>
          <h1
            id="blog-heading"
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-tight"
          >
            {locale === "en" ? (
              <>
                Our <span className="gradient-text">Blog</span>
              </>
            ) : (
              <span className="gradient-text">{t("title")}</span>
            )}
          </h1>
          <p className="text-brand-text-secondary text-lg sm:text-xl max-w-xl leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Blog Post List */}
        <div className="grid gap-6">
          {posts.length === 0 ? (
            <p className="text-brand-text-secondary text-center py-10">
              {t("noPosts")}
            </p>
          ) : (
            posts.map((post) => {
              const postUrl = locale === "en" ? `/blog/${post.slug}` : `/${locale}/blog/${post.slug}`;
              return (
                <Link
                  key={post.slug}
                  href={postUrl}
                  className="block group focus-visible:outline-none"
                >
                  <Card
                    variant="glass"
                    hover
                    className="group-focus-visible:ring-2 group-focus-visible:ring-brand-primary"
                  >
                    <CardContent className="flex flex-col gap-4">
                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-brand-text-secondary">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {post.author}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white group-hover:text-brand-primary transition-colors">
                        {post.title}
                      </h2>

                      {/* Excerpt */}
                      <p className="text-brand-text-secondary text-sm sm:text-base leading-relaxed">
                        {post.excerpt}
                      </p>

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] uppercase tracking-wider font-semibold bg-white/5 border border-white/10 px-2 py-0.5 rounded text-brand-text-secondary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </Container>
    </Section>
  );
}
