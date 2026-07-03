import type { MetadataRoute } from "next";
import { getBlogPosts } from "@/lib/mdx";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://selfplace.app";

// Static routes (one per locale)
const staticRoutes = [
  "/",
  "/privacy",
  "/terms",
  "/contact",
  "/delete-account",
  "/blog",
  "/faq",
  "/changelog",
];
const locales = ["en", "tr", "fr"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // Generate entries for static routes
  for (const route of staticRoutes) {
    for (const locale of locales) {
      const localePath = locale === "en" ? route : `/${locale}${route}`;
      entries.push({
        url: `${BASE_URL}${localePath}`,
        lastModified: new Date(),
        changeFrequency: route === "/" ? "weekly" : "monthly",
        priority: route === "/" ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${BASE_URL}${l === "en" ? route : `/${l}${route}`}`,
            ])
          ),
        },
      });
    }
  }

  // Generate entries for dynamic blog posts
  const posts = getBlogPosts();
  for (const post of posts) {
    for (const locale of locales) {
      const route = `/blog/${post.slug}`;
      const localePath = locale === "en" ? route : `/${locale}${route}`;
      entries.push({
        url: `${BASE_URL}${localePath}`,
        lastModified: new Date(post.date),
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [
              l,
              `${BASE_URL}${l === "en" ? route : `/${l}${route}`}`,
            ])
          ),
        },
      });
    }
  }

  return entries;
}
