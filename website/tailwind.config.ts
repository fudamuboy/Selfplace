import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Selfplace Brand Colors ──────────────────────────────────────
      colors: {
        brand: {
          // Backgrounds
          "bg-deep":    "#0F111A",
          "bg-mid":     "#1E1B4B",
          // Primary
          primary:      "#A78BFA", // Lavender Purple
          "primary-dim":"#8B5CF6", // Deeper violet
          // Accent
          accent:       "#C084FC", // Thistle Purple
          // Text
          "text-primary":   "#FFFFFF",
          "text-secondary": "#94A3B8",
          "text-muted":     "rgba(148,163,184,0.4)",
          // Surfaces
          card:         "rgba(255,255,255,0.05)",
          "card-border":"rgba(255,255,255,0.10)",
          // Glow
          glow:         "rgba(139,92,246,0.25)",
          // Moods (matches mobile app)
          happy:        "#FCD34D",
          calm:         "#A5AD94",
          tired:        "#93C5FD",
          sad:          "#F87171",
          anxious:      "#F9A8D4",
        },
      },

      // ── Typography ──────────────────────────────────────────────────
      fontFamily: {
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },

      // ── Background Gradients ────────────────────────────────────────
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #0F111A 0%, #1E1B4B 50%, #0F111A 100%)",
        "hero-gradient":
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(167,139,250,0.18) 0%, transparent 70%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)",
        "cta-gradient":
          "linear-gradient(135deg, #A78BFA 0%, #C084FC 100%)",
        "shimmer":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
      },

      // ── Box Shadows / Glow effects ──────────────────────────────────
      boxShadow: {
        "glow-sm":  "0 0 15px rgba(167,139,250,0.25)",
        "glow-md":  "0 0 30px rgba(167,139,250,0.30)",
        "glow-lg":  "0 0 60px rgba(167,139,250,0.20)",
        "card":     "0 4px 24px rgba(0,0,0,0.40)",
        "card-hover": "0 8px 40px rgba(0,0,0,0.50), 0 0 20px rgba(167,139,250,0.15)",
      },

      // ── Animations ──────────────────────────────────────────────────
      keyframes: {
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(167,139,250,0.3)" },
          "50%":       { boxShadow: "0 0 40px rgba(167,139,250,0.6)" },
        },
        "shimmer-slide": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "star-twinkle": {
          "0%, 100%": { opacity: "0.3" },
          "50%":       { opacity: "1" },
        },
      },
      animation: {
        "float":        "float 6s ease-in-out infinite",
        "pulse-glow":   "pulse-glow 3s ease-in-out infinite",
        "shimmer":      "shimmer-slide 2.5s linear infinite",
        "fade-up":      "fade-up 0.6s ease-out both",
        "fade-in":      "fade-in 0.4s ease-out both",
        "scale-in":     "scale-in 0.4s ease-out both",
        "star-twinkle": "star-twinkle 3s ease-in-out infinite",
      },

      // ── Border Radius ───────────────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },

      // ── Backdrop blur ───────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
      },

      // ── Prose (for MDX content pages) ───────────────────────────────
      typography: {
        DEFAULT: {
          css: {
            color:           "#94A3B8",
            "max-width":     "none",
            h1:              { color: "#FFFFFF", fontFamily: "var(--font-outfit)" },
            h2:              { color: "#FFFFFF", fontFamily: "var(--font-outfit)" },
            h3:              { color: "#FFFFFF", fontFamily: "var(--font-outfit)" },
            h4:              { color: "#FFFFFF" },
            strong:          { color: "#FFFFFF" },
            a: {
              color:           "#A78BFA",
              textDecoration:  "none",
              "&:hover":       { color: "#C084FC", textDecoration: "underline" },
            },
            blockquote:      { borderLeftColor: "#A78BFA", color: "#94A3B8" },
            "ul > li::marker": { color: "#A78BFA" },
            "ol > li::marker": { color: "#A78BFA" },
            hr:              { borderColor: "rgba(255,255,255,0.1)" },
            code:            { color: "#C084FC", background: "rgba(192,132,252,0.1)", padding: "2px 6px", borderRadius: "4px" },
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
