# Selfplace Website

Official marketing website for the Selfplace app — a calm, emotionally intelligent companion for daily reflections and personal growth.

**Live URL:** https://selfplace.app

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom Selfplace design tokens
- **Animations:** Framer Motion
- **i18n:** next-intl (English, Turkish, French)
- **Deployment:** Vercel

---

## Getting Started

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

---

## Folder Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (fonts, analytics, nav, footer)
│   ├── page.tsx            # Landing page
│   ├── privacy/page.tsx    # Privacy Policy
│   ├── terms/page.tsx      # Terms of Service
│   ├── contact/page.tsx    # Contact
│   ├── delete-account/page.tsx  # Account Deletion (Google Play requirement)
│   ├── sitemap.ts          # Auto-generated sitemap.xml
│   └── robots.ts           # robots.txt
│
├── components/
│   ├── ui/                 # Atoms: Button, Card, Badge
│   ├── layout/             # Navbar, Footer, Container
│   ├── sections/           # HeroSection, FeaturesSection, etc.
│   └── analytics/          # GA4, GTM, Microsoft Clarity
│
├── i18n/                   # next-intl configuration
├── lib/                    # utils.ts, metadata.ts
└── middleware.ts            # i18n routing middleware

messages/                   # Translation files
├── en.json                 # English (default)
├── tr.json                 # Turkish
└── fr.json                 # French
```

---

## Environment Variables

Create a `.env.local` file:

```env
# Site URL (for metadata, sitemap, OG images)
NEXT_PUBLIC_SITE_URL=https://selfplace.app

# Analytics (optional — safe to leave empty in development)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx
```

---

## Adding Future Pages

### New static page
1. Create `src/app/<page-name>/page.tsx`
2. Add translations to `messages/en.json` (and tr/fr)
3. Add to `src/app/sitemap.ts` if not auto-detected

### Blog post (future)
1. Create `src/content/blog/my-post.mdx`
2. The `/blog/[slug]` route will pick it up automatically

### New locale
1. Add locale to `src/i18n/routing.ts`
2. Create `messages/<locale>.json`

---

## Deployment (Vercel)

1. Push `website/` to your repo
2. In Vercel: set **Root Directory** to `website`
3. Add environment variables in Vercel dashboard
4. Deploy — zero configuration needed

---

## Isolation

This website is **completely isolated** from the React Native app:
- Separate `package.json` (no shared dependencies)
- No imports from parent directories
- No shared configuration files

