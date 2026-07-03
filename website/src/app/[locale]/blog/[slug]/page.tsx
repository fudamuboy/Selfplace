import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container, Section } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { generatePageMetadata } from "@/lib/metadata";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/mdx";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const locales = ["en", "tr", "fr"];
  return locales.flatMap((locale) => {
    const posts = getBlogPosts(locale);
    return posts.map((post) => ({
      locale,
      slug: post.slug,
    }));
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = getBlogPostBySlug(slug, locale);

  if (!post) {
    return {};
  }

  return generatePageMetadata({
    title: `${post.title} — Selfplace Blog`,
    description: post.excerpt,
    path: `/blog/${slug}`,
    locale,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const post = getBlogPostBySlug(slug, locale);
  const t = await getTranslations("blog");

  if (!post) {
    notFound();
  }

  const blogHref = locale === "en" ? "/blog" : `/${locale}/blog`;

  return (
    <Section spacing="lg" className="pt-32" aria-labelledby="post-heading">
      <Container size="md">
        {/* Back link */}
        <Link
          href={blogHref}
          className="inline-flex items-center gap-2 text-sm text-brand-text-secondary hover:text-brand-primary transition-colors mb-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
          aria-label={t("backToBlog")}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t("backToBlog")}
        </Link>

        {/* Post header */}
        <div className="mb-12">
          {post.tags.length > 0 && (
            <div className="flex gap-2 mb-4">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="subtle">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <h1
            id="post-heading"
            className="font-display text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight leading-tight"
          >
            {post.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-brand-text-secondary border-b border-white/5 pb-8">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {post.date}
            </span>
            <span className="flex items-center gap-1.5">
              <User size={14} />
              {post.author}
            </span>
          </div>
        </div>

        {/* Post Content */}
        <article
          className="prose prose-invert max-w-none"
          aria-label="Blog post content"
        >
          <MDXRemote source={post.content} />
        </article>
      </Container>
    </Section>
  );
}
