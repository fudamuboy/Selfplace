import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  GoogleAnalytics,
  GoogleTagManager,
  MicrosoftClarity,
} from "@/components/analytics/Analytics";
import { baseSiteMetadata } from "@/lib/metadata";

export const metadata: Metadata = baseSiteMetadata;

// ── JSON-LD Structured Data ─────────────────────────────────────────────────
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://selfplace.app/#website",
      url: "https://selfplace.app",
      name: "Selfplace",
      description:
        "Selfplace is a calm, emotionally intelligent app for daily reflections, mood check-ins, and personal growth.",
      inLanguage: ["en", "tr", "fr"],
      publisher: { "@id": "https://selfplace.app/#organization" },
    },
    {
      "@type": "Organization",
      "@id": "https://selfplace.app/#organization",
      name: "Selfplace",
      url: "https://selfplace.app",
      logo: {
        "@type": "ImageObject",
        url: "https://selfplace.app/icons/icon-512.png",
        width: 512,
        height: 512,
      },
      contactPoint: {
        "@type": "ContactPoint",
        email: "selfplace.support@gmail.com",
        contactType: "customer support",
      },
    },
    {
      "@type": "MobileApplication",
      "@id": "https://selfplace.app/#app",
      name: "Selfplace",
      description:
        "Daily emotional check-ins, AI insights, astrology, and guided reflections for your inner world.",
      operatingSystem: "iOS",
      applicationCategory: "HealthApplication",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      url: "https://apps.apple.com/tr/app/selfplace/id6767690390?l=tr",
    },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale — show 404 for unknown locales
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Analytics — env-var gated, only renders when IDs are set */}
      <GoogleTagManager />
      <GoogleAnalytics />
      <MicrosoftClarity />

      <NextIntlClientProvider locale={locale} messages={messages}>
        {/* Skip to content — accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-brand-primary focus:text-brand-bg-deep focus:rounded-full focus:font-semibold focus:shadow-glow-sm"
        >
          Skip to main content
        </a>

        <Navbar />

        <main id="main-content" tabIndex={-1}>
          {children}
        </main>

        <Footer />
      </NextIntlClientProvider>
    </>
  );
}
