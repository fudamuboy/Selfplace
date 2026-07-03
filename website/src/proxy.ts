import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except static files and Next.js internals
  matcher: [
    "/((?!_next|_vercel|favicon|og-image|icons|screenshots|apple-touch-icon|robots|sitemap|manifest).*)",
  ],
};
