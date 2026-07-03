import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Container } from "@/components/layout/Container";
import { Heart } from "lucide-react";

const footerLinks = [
  { href: "/privacy",        labelKey: "privacy"        },
  { href: "/terms",          labelKey: "terms"          },
  { href: "/contact",        labelKey: "contact"        },
  { href: "/delete-account", labelKey: "deleteAccount"  },
] as const;

export function Footer() {
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer
      className="border-t border-white/5 bg-brand-bg-deep"
      role="contentinfo"
      aria-label="Site footer"
    >
      <Container size="xl">
        <div className="py-12 sm:py-16">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-10">
            {/* Brand */}
            <div className="flex flex-col gap-2">
              <Link
                href="/"
                className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg w-fit"
                aria-label="Selfplace — Home"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cta-gradient shadow-glow-sm">
                  <span className="text-white font-display font-bold text-base leading-none">S</span>
                </div>
                <span className="font-display font-semibold text-lg text-white tracking-tight">
                  Selfplace
                </span>
              </Link>
              <p className="text-sm text-brand-text-secondary max-w-xs">
                {t("tagline")}
              </p>
            </div>

            {/* Nav links */}
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap gap-x-6 gap-y-3" role="list">
                {footerLinks.map(({ href, labelKey }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-brand-text-secondary hover:text-brand-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary rounded"
                    >
                      {nav(labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Divider */}
          <div className="border-t border-white/5 mb-8" aria-hidden="true" />

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-text-secondary">
            <p>{t("legal")}</p>
            <p className="flex items-center gap-1">
              {t("madeWith")}{" "}
              <Heart
                size={12}
                className="text-brand-primary fill-brand-primary"
                aria-label="love"
              />{" "}
              {t("forYourInnerWorld")}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
