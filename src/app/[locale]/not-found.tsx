import { getLocale, getTranslations } from "next-intl/server";
import { NotFoundView } from "@/components/not-found-view";

export default async function NotFound() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "NotFound" });
  const href = locale === "en" ? "/en" : "/fr";
  return (
    <NotFoundView
      title={t("title")}
      description={t("description")}
      primaryLabel={t("back")}
      primaryHref={href}
    />
  );
}
