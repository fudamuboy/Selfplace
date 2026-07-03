import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { baseSiteMetadata } from "@/lib/metadata";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = baseSiteMetadata;

export const viewport: Viewport = {
  themeColor: "#0F111A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

/**
 * Minimal root layout — only sets up HTML/body/fonts.
 * The full layout (nav, footer, next-intl, analytics) lives in [locale]/layout.tsx.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="animated-bg noise-overlay antialiased">
        {children}
      </body>
    </html>
  );
}
