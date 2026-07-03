import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "tr", "fr"],
  defaultLocale: "en",
  localePrefix: "as-needed", // /en is omitted, /tr and /fr are explicit
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
