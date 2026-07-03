import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "src/content");

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  published: boolean;
  content: string;
}

export interface FAQItem {
  question: string;
  order: number;
  category: string;
  content: string;
}

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  content: string;
}

export function getBlogPosts(locale: string = "en"): BlogPost[] {
  let dir = path.join(CONTENT_DIR, "blog", locale);
  if (!fs.existsSync(dir)) {
    dir = path.join(CONTENT_DIR, "blog", "en");
  }
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  
  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const filePath = path.join(dir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      return {
        slug: data.slug || file.replace(".mdx", ""),
        title: data.title || "",
        date: data.date || "",
        excerpt: data.excerpt || "",
        author: data.author || "",
        tags: data.tags || [],
        published: data.published ?? true,
        content,
      } as BlogPost;
    })
    .filter((post) => post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getBlogPostBySlug(slug: string, locale: string = "en"): BlogPost | null {
  const posts = getBlogPosts(locale);
  const post = posts.find((p) => p.slug === slug);
  if (!post && locale !== "en") {
    const enPosts = getBlogPosts("en");
    return enPosts.find((p) => p.slug === slug) || null;
  }
  return post || null;
}

export function getFAQs(locale: string = "en"): FAQItem[] {
  let dir = path.join(CONTENT_DIR, "faq", locale);
  if (!fs.existsSync(dir)) {
    dir = path.join(CONTENT_DIR, "faq", "en");
  }
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  
  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const filePath = path.join(dir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      return {
        question: data.question || "",
        order: data.order || 99,
        category: data.category || "general",
        content,
      } as FAQItem;
    })
    .sort((a, b) => a.order - b.order);
}

export function getChangelogs(locale: string = "en"): ChangelogItem[] {
  let dir = path.join(CONTENT_DIR, "changelog", locale);
  if (!fs.existsSync(dir)) {
    dir = path.join(CONTENT_DIR, "changelog", "en");
  }
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir);
  
  return files
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const filePath = path.join(dir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContent);
      return {
        version: data.version || "",
        date: data.date || "",
        title: data.title || "",
        content,
      } as ChangelogItem;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
