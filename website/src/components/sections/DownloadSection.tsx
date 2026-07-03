"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Apple } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container, Section } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

function AppStoreButton({ className }: { className?: string }) {
  const t = useTranslations("hero");
  return (
    <a
      href="https://apps.apple.com/tr/app/selfplace/id6767690390?l=tr"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("appStore")}
      className={cn(
        "inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary group",
        "bg-white text-brand-bg-deep hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] shadow-glow-sm hover:shadow-glow-md",
        className
      )}
    >
      <Apple size={28} className="flex-shrink-0" aria-hidden="true" />
      <div className="flex flex-col items-start text-left">
        <span className="text-[10px] font-medium uppercase tracking-widest opacity-70 leading-none mb-0.5">
          Download on the
        </span>
        <span className="text-lg font-display font-bold leading-tight tracking-tight">
          App Store
        </span>
      </div>
    </a>
  );
}

function GooglePlayButton({ className }: { className?: string }) {
  const t = useTranslations("download");
  return (
    <div
      aria-label={t("googlePlaySoon")}
      className={cn(
        "inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl cursor-not-allowed select-none",
        "bg-white/5 border border-white/10 text-white/40",
        className
      )}
      title={t("googlePlaySoon")}
    >
      {/* Google Play SVG */}
      <svg
        viewBox="0 0 24 24"
        className="w-7 h-7 flex-shrink-0 opacity-40"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M3.18 23.76c.3.17.64.24.99.2l13.12-11.76L13.9 8.9 3.18 23.76zm15.14-13.7L15.42 12l2.9 1.94 2.54-1.44a1.3 1.3 0 000-2.26l-2.54-1.18zm-5.07 5.4L2 22.83c.12.1.26.17.43.2.27.04.55-.02.77-.16l11.25-6.37-1.2-1.04zm-9.93-12.3l-.01.01L3.3.69A1.15 1.15 0 002 .5C1.4.8 1 1.44 1 2.17v19.66c0 .73.4 1.37 1 1.67l.01.01 11.02-14.59L3.32 3.16z"
        />
      </svg>
      <div className="flex flex-col items-start text-left">
        <span className="text-[10px] font-medium uppercase tracking-widest leading-none mb-0.5 opacity-60">
          Coming soon to
        </span>
        <span className="text-lg font-display font-bold leading-tight tracking-tight opacity-40">
          Google Play
        </span>
      </div>
    </div>
  );
}

export function DownloadSection() {
  const t = useTranslations("download");

  return (
    <Section id="download" spacing="xl" aria-label="Download the app">
      <Container size="md">
        <motion.div
          className="relative text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Background glow card */}
          <div
            className="relative glass-card rounded-4xl p-10 sm:p-16 overflow-hidden"
          >
            {/* Inner glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(167,139,250,0.12) 0%, transparent 70%)",
              }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center gap-6">
              <Badge variant="subtle">
                🌿 {t("badge")}
              </Badge>

              <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                {t("headline").split("\n").map((line, i) => (
                  <span key={i} className="block">
                    {i === 1 ? <span className="gradient-text">{line}</span> : line}
                  </span>
                ))}
              </h2>

              <p className="text-brand-text-secondary text-lg max-w-md leading-relaxed">
                {t("subheadline")}
              </p>

              {/* Store buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <AppStoreButton />
                <GooglePlayButton />
              </div>

              {/* Fine print */}
              <div className="flex items-center gap-6 text-sm text-brand-text-secondary pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-calm" aria-hidden="true" />
                  {t("free")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" aria-hidden="true" />
                  {t("premium")}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </Container>
    </Section>
  );
}
