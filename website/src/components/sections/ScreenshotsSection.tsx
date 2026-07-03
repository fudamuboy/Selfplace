"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Container, Section } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

const screenshots = [
  { key: "home",      src: "/screenshots/home.png",      captionKey: "home"      },
  { key: "checkin",   src: "/screenshots/checkin.png",   captionKey: "checkin"   },
  { key: "journal",   src: "/screenshots/journal.png",   captionKey: "journal"   },
  { key: "astrology", src: "/screenshots/astrology.png", captionKey: "astrology" },
] as const;

export function ScreenshotsSection() {
  const t = useTranslations("screenshots");
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Section id="screenshots" spacing="lg" aria-label="App screenshots">
      <Container size="xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="subtle" className="mb-5">✦ {t("badge")}</Badge>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold mb-5 tracking-tight">
            {t("headline").split("\n").map((line, i) => (
              <span key={i} className="block">
                {i === 1 ? <span className="gradient-text">{line}</span> : line}
              </span>
            ))}
          </h2>
          <p className="text-brand-text-secondary text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            {t("subheadline")}
          </p>
        </motion.div>

        {/* Screenshots gallery */}
        <div className="flex flex-col items-center gap-10">
          {/* Main screenshot */}
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
            aria-live="polite"
            aria-atomic="true"
          >
            {/* Glow behind the phone */}
            <div
              className="absolute inset-0 -z-10 blur-3xl opacity-40"
              style={{
                background: "radial-gradient(ellipse at center, rgba(167,139,250,0.5) 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />
            <div className="relative w-[260px] sm:w-[300px] mx-auto">
              <Image
                src={screenshots[activeIndex].src}
                alt={t(`captions.${screenshots[activeIndex].captionKey}`)}
                width={600}
                height={1200}
                className="w-full h-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                priority={activeIndex === 0}
                quality={90}
              />
            </div>
            {/* Caption */}
            <p className="text-center text-sm text-brand-text-secondary mt-4">
              {t(`captions.${screenshots[activeIndex].captionKey}`)}
            </p>
          </motion.div>

          {/* Thumbnail selector */}
          <div
            className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center"
            role="tablist"
            aria-label="Screenshot selector"
          >
            {screenshots.map(({ key, src, captionKey }, i) => (
              <button
                key={key}
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={t(`captions.${captionKey}`)}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "relative rounded-2xl overflow-hidden transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                  i === activeIndex
                    ? "ring-2 ring-brand-primary shadow-glow-sm scale-105 w-[72px] sm:w-20"
                    : "opacity-50 hover:opacity-75 w-[60px] sm:w-16"
                )}
              >
                <Image
                  src={src}
                  alt=""
                  aria-hidden="true"
                  width={80}
                  height={160}
                  className="w-full h-auto object-cover"
                  quality={60}
                />
              </button>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex gap-2" aria-hidden="true">
            {screenshots.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "rounded-full transition-all duration-300 focus-visible:outline-none",
                  i === activeIndex
                    ? "w-6 h-2 bg-brand-primary"
                    : "w-2 h-2 bg-white/20 hover:bg-white/40"
                )}
                aria-label={`Go to screenshot ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
