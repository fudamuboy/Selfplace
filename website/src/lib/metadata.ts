import type { Metadata } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://selfplace.app";

const SITE_NAME = "Selfplace";

export interface MetadataParams {
  title: string;
  description: string;
  path?: string;
  image?: string;
  locale?: string;
}

/**
 * Generate consistent per-page metadata with Open Graph and Twitter cards.
 */
export function generatePageMetadata({
  title,
  description,
  path = "",
  image = "/og-image.png",
  locale = "en",
}: MetadataParams): Metadata {
  const url = `${BASE_URL}${path}`;
  const ogImage = `${BASE_URL}${image}`;

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: url,
      languages: {
        en: `${BASE_URL}${path}`,
        tr: `${BASE_URL}/tr${path}`,
        fr: `${BASE_URL}/fr${path}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${title}`,
        },
      ],
      locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      creator: "@selfplaceapp",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * Base site metadata applied to the root layout.
 */
export const baseSiteMetadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: `%s — ${SITE_NAME}`,
    default: `${SITE_NAME} — Your Inner World, Finally Understood`,
  },
  description:
    "Selfplace is a calm, emotionally intelligent app for daily reflections, mood check-ins, and personal growth. Available on the App Store.",
  keywords: [
    "emotional wellness",
    "mood tracker",
    "daily reflection",
    "mental health app",
    "journaling",
    "astrology",
    "self-awareness",
    "mindfulness",
    "AI companion",
    "selfplace",
  ],
  authors: [{ name: "Selfplace" }],
  creator: "Selfplace",
  publisher: "Selfplace",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};
