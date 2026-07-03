"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowDown, Star, Apple } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/layout/Container";

// Floating particle config
const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  size: Math.random() * 2 + 1,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 4 + 2,
  delay: Math.random() * 5,
  opacity: Math.random() * 0.5 + 0.1,
}));

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.7 } },
};

export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
      aria-label="Hero section"
    >
      {/* Ambient star particles */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              width:  p.size,
              height: p.size,
              left:   `${p.x}%`,
              top:    `${p.y}%`,
              opacity: p.opacity,
            }}
            animate={{ opacity: [p.opacity, p.opacity * 3, p.opacity] }}
            transition={{
              duration: p.duration,
              delay:    p.delay,
              repeat:   Infinity,
              ease:     "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Hero glow orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(192,132,252,0.07) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      <Container size="lg" className="relative z-10 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center gap-6 sm:gap-8"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <Badge variant="subtle" className="gap-2">
              <Apple size={12} aria-hidden="true" />
              {t("badge")}
            </Badge>
          </motion.div>

          {/* Mascot */}
          <motion.div
            variants={itemVariants}
            className="relative"
            aria-hidden="true"
          >
            <motion.div
              className="relative w-28 h-28 sm:w-36 sm:h-36 mx-auto"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)" }}
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Mascot body — stylised SVG blob */}
              <svg
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-[0_0_30px_rgba(167,139,250,0.6)]"
                role="img"
                aria-label="Selfplace mascot"
              >
                <defs>
                  <radialGradient id="body-grad" cx="40%" cy="30%" r="60%">
                    <stop offset="0%" stopColor="#C084FC" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </radialGradient>
                  <radialGradient id="eye-l-grad" cx="50%" cy="30%" r="60%">
                    <stop offset="0%" stopColor="#EDE9FE" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Body blob */}
                <path
                  d="M60 10 C30 10, 10 32, 10 60 C10 88, 30 110, 60 110 C90 110, 110 88, 110 60 C110 32, 90 10, 60 10 Z"
                  fill="url(#body-grad)"
                  filter="url(#glow)"
                />
                {/* Eyes */}
                <circle cx="43" cy="50" r="9" fill="#1E1B4B" />
                <circle cx="77" cy="50" r="9" fill="#1E1B4B" />
                <circle cx="46" cy="47" r="3.5" fill="white" />
                <circle cx="80" cy="47" r="3.5" fill="white" />
                {/* Blush cheeks */}
                <ellipse cx="34" cy="63" rx="7" ry="4" fill="rgba(249,168,212,0.5)" />
                <ellipse cx="86" cy="63" rx="7" ry="4" fill="rgba(249,168,212,0.5)" />
                {/* Smile */}
                <path d="M50 72 Q60 82 70 72" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                {/* Ear tufts */}
                <circle cx="25" cy="25" r="7" fill="#9333EA" />
                <circle cx="95" cy="25" r="7" fill="#9333EA" />
              </svg>
            </motion.div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] max-w-4xl"
          >
            {t("headline").split("\n").map((line, i) => (
              <span key={i} className="block">
                {i === 0 ? (
                  line
                ) : (
                  <span className="gradient-text">{line}</span>
                )}
              </span>
            ))}
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={itemVariants}
            className="text-brand-text-secondary text-lg sm:text-xl max-w-2xl leading-relaxed"
          >
            {t("subheadline")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4 pt-2"
          >
            {/* Primary CTA — App Store */}
            <a
              href="https://apps.apple.com/tr/app/selfplace/id6767690390?l=tr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("ctaDownload")}
              className="inline-flex items-center justify-center gap-2 h-14 px-8 text-lg font-semibold rounded-full min-w-48 bg-cta-gradient text-brand-bg-deep shadow-glow-sm hover:shadow-glow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Apple size={18} aria-hidden="true" />
              {t("ctaDownload")}
            </a>
            {/* Secondary CTA — Learn More */}
            <Link
              href="#features"
              aria-label={t("ctaLearn")}
              className="inline-flex items-center justify-center gap-2 h-14 px-8 text-lg font-semibold rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 backdrop-blur-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              {t("ctaLearn")}
              <ArrowDown size={16} aria-hidden="true" />
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 text-sm text-brand-text-secondary"
            aria-label="Social proof"
          >
            <div className="flex" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className="text-yellow-400 fill-yellow-400"
                />
              ))}
            </div>
            <span>{t("trustedBy")}</span>
          </motion.div>
        </motion.div>
      </Container>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <ArrowDown size={20} className="text-brand-text-secondary" />
      </motion.div>
    </section>
  );
}
