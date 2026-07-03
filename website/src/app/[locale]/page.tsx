import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { ScreenshotsSection } from "@/components/sections/ScreenshotsSection";
import { DownloadSection } from "@/components/sections/DownloadSection";
import { generatePageMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("defaultTitle"),
    description: t("defaultDescription"),
    path: "/",
  });
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <DownloadSection />
    </>
  );
}
