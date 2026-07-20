import type { AppLocale } from "@/i18n/routing";

export function preferredLocale(acceptLanguage: string | null): AppLocale {
  if (!acceptLanguage) return "fr";
  const preferences = acceptLanguage
    .split(",")
    .map((entry) => {
      const [language, ...parameters] = entry.trim().toLowerCase().split(";");
      const quality = parameters
        .map((parameter) => parameter.trim())
        .find((parameter) => parameter.startsWith("q="));
      return {
        language,
        quality: quality ? Number(quality.slice(2)) || 0 : 1
      };
    })
    .sort((left, right) => right.quality - left.quality);

  for (const preference of preferences) {
    if (preference.language === "fr" || preference.language.startsWith("fr-")) return "fr";
    if (preference.language === "en" || preference.language.startsWith("en-")) return "en";
  }
  return "fr";
}
