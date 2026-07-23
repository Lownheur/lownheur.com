import { notFound } from "next/navigation";
import type { AppLocale } from "@/i18n/routing";
import { redirectTo } from "@/lib/navigation";
import { resourceNames, type ResourceName } from "@/server/domain/resources";

function isResource(value: string): value is ResourceName {
  return resourceNames.includes(value as ResourceName);
}

export default async function LegacyResourcePage({
  params
}: {
  params: Promise<{ locale: AppLocale; resource: string }>;
}) {
  const { locale, resource } = await params;
  if (!isResource(resource)) notFound();
  redirectTo(
    "/" + locale + "/dashboard?section=" +
    (resource === "schedules" ? "calendar" : "organize") +
    "&manage=" + resource
  );
}
