"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const nextLocale: AppLocale = locale === "fr" ? "en" : "fr";

  return (
    <button
      className="icon-button language-button"
      type="button"
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      aria-label={locale === "fr" ? "Switch to English" : "Passer en français"}
      title={locale === "fr" ? "English" : "Français"}
    >
      {nextLocale}
    </button>
  );
}
