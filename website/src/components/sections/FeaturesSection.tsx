"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Heart,
  Sparkles,
  Brain,
  Star,
  Layers,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Container, Section } from "@/components/layout/Container";

const featureIcons = [
  { key: "checkin",   icon: Heart,    color: "text-brand-happy",   bg: "bg-brand-happy/10"   },
  { key: "mascot",    icon: Sparkles, color: "text-brand-primary", bg: "bg-brand-primary/10" },
  { key: "ai",        icon: Brain,    color: "text-brand-accent",  bg: "bg-brand-accent/10"  },
  { key: "astrology", icon: Star,     color: "text-brand-tired",   bg: "bg-brand-tired/10"   },
  { key: "cards",     icon: Layers,   color: "text-brand-calm",    bg: "bg-brand-calm/10"    },
  { key: "privacy",   icon: Lock,     color: "text-brand-anxious", bg: "bg-brand-anxious/10" },
] as const;

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function FeaturesSection() {
  const t = useTranslations("features");
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <Section id="features" spacing="lg" aria-label="Features">
      <Container size="xl">
        {/* Header */}
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="subtle" className="mb-5">
            <Sparkles size={12} aria-hidden="true" />
            {t("badge")}
          </Badge>
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

        {/* Feature grid */}
        <motion.div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
          role="list"
          aria-label="Feature list"
        >
          {featureIcons.map(({ key, icon: Icon, color, bg }) => (
            <motion.div key={key} variants={cardVariants} role="listitem">
              <Card
                variant="glass"
                hover
                className="h-full group"
              >
                <CardContent className="flex flex-col gap-4">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
                    aria-hidden="true"
                  >
                    <Icon size={22} className={color} />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="font-display font-semibold text-lg text-white mb-2 tracking-tight">
                      {t(`items.${key}.title`)}
                    </h3>
                    <p className="text-brand-text-secondary text-sm leading-relaxed">
                      {t(`items.${key}.description`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </Section>
  );
}
