"use client";

import { usePathname, useRouter, Link } from "@/i18n/routing";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Apple } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/#features",    labelKey: "features" },
  { href: "/blog",         labelKey: "blog"      },
  { href: "/faq",          labelKey: "faq"       },
  { href: "/changelog",    labelKey: "changelog" },
  { href: "/contact",      labelKey: "contact"   },
] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen]         = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLocaleChange = (newLocale: "en" | "tr" | "fr") => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled
          ? "bg-brand-bg-deep/80 backdrop-blur-xl border-b border-white/5 shadow-lg"
          : "bg-transparent"
      )}
      role="banner"
    >
      <Container size="xl">
        <nav
          className="flex h-16 items-center justify-between sm:h-20"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded-lg"
            aria-label="Selfplace — Home"
          >
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-cta-gradient shadow-glow-sm group-hover:shadow-glow-md transition-shadow duration-300">
              <span className="text-white font-display font-bold text-lg leading-none select-none">
                S
              </span>
            </div>
            <span className="font-display font-semibold text-xl text-white tracking-tight hidden sm:block">
              Selfplace
            </span>
          </Link>

          {/* Desktop nav links */}
          <ul className="hidden md:flex items-center gap-1" role="list">
            {navLinks.map(({ href, labelKey }) => {
              const isActive = pathname === href || (href.startsWith("/#") && pathname === "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                      isActive
                        ? "text-brand-primary bg-brand-primary/10"
                        : "text-brand-text-secondary hover:text-white hover:bg-white/5"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            {/* Desktop Language Switcher */}
            <div className="hidden md:flex items-center gap-1 border-r border-white/10 pr-4 mr-1" role="group" aria-label="Language selection">
              {(["en", "tr", "fr"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLocaleChange(l)}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-all duration-200 uppercase font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary",
                    locale === l
                      ? "text-brand-primary bg-brand-primary/10"
                      : "text-brand-text-secondary hover:text-white hover:bg-white/5"
                  )}
                  aria-current={locale === l ? "true" : undefined}
                  aria-label={`Switch to ${l === "en" ? "English" : l === "tr" ? "Turkish" : "French"}`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <a
              href="https://apps.apple.com/tr/app/selfplace/id6767690390?l=tr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("getApp")}
              className="hidden md:inline-flex items-center gap-2 h-10 px-5 text-sm font-semibold rounded-full bg-cta-gradient text-brand-bg-deep shadow-glow-sm hover:shadow-glow-md hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              <Apple size={15} aria-hidden="true" />
              {t("getApp")}
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full text-brand-text-secondary hover:text-white hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            onClick={() => setIsOpen((v) => !v)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? (
              <X size={20} aria-hidden="true" />
            ) : (
              <Menu size={20} aria-hidden="true" />
            )}
          </button>
        </nav>
      </Container>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-brand-bg-deep/95 backdrop-blur-xl border-b border-white/5"
          >
            <Container size="xl">
              <ul className="flex flex-col py-4 gap-1" role="list">
                {navLinks.map(({ href, labelKey }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex px-4 py-3 rounded-xl text-base font-medium text-brand-text-secondary hover:text-white hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      {t(labelKey)}
                    </Link>
                  </li>
                ))}
                {/* Mobile Language Switcher */}
                <li className="flex items-center justify-center gap-4 py-3 border-t border-white/5 mt-2" role="group" aria-label="Language selection">
                  {(["en", "tr", "fr"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLocaleChange(l)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-all duration-200 uppercase font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                        locale === l
                          ? "text-brand-primary bg-brand-primary/10 font-bold"
                          : "text-brand-text-secondary hover:text-white hover:bg-white/5"
                      )}
                      aria-current={locale === l ? "true" : undefined}
                    >
                      {l === "en" ? "English" : l === "tr" ? "Türkçe" : "Français"}
                    </button>
                  ))}
                </li>
                <li className="pt-2">
                  <a
                    href="https://apps.apple.com/tr/app/selfplace/id6767690390?l=tr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 h-12 w-full rounded-full bg-cta-gradient text-brand-bg-deep font-semibold text-base shadow-glow-sm hover:shadow-glow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    aria-label={t("getApp")}
                  >
                    <Apple size={18} aria-hidden="true" />
                    {t("getApp")}
                  </a>
                </li>
              </ul>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
