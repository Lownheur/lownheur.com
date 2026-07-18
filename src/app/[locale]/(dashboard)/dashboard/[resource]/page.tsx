import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResourceManager } from "@/components/resource-manager";
import { listResources, resourceNames, type ResourceName } from "@/server/domain/resources";
import { getResourceMediaMap } from "@/server/media";

function isResource(value: string): value is ResourceName {
  return resourceNames.includes(value as ResourceName);
}

export default async function ResourcePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: AppLocale; resource: string }>;
  searchParams: Promise<{ cursor?: string; search?: string; status?: string; error?: string; dialog?: string; id?: string }>;
}) {
  const [{ locale, resource }, query] = await Promise.all([params, searchParams]);
  if (!isResource(resource)) notFound();
  const [t, user, client] = await Promise.all([
    getTranslations({ locale, namespace: "Dashboard" }),
    requireUser(locale),
    createSupabaseServerClient()
  ]);
  const [page, categories, events, goals] = await Promise.all([
    listResources(client, user.id, resource, { limit: 20, cursor: query.cursor, search: resource === "schedules" ? undefined : query.search }),
    client.from("categories").select("id,title").eq("user_id", user.id).order("title"),
    client.from("events").select("id,title").eq("user_id", user.id).order("title"),
    client.from("goals").select("id,title").eq("user_id", user.id).order("title")
  ]);

  const media = await getResourceMediaMap(client, user.id, resource, page.items);

  return <div className="dashboard-page">
    <header className="dashboard-heading"><div><span className="eyebrow">{t("resources.eyebrow")}</span><h1>{t("resources." + resource + ".title")}</h1></div><p>{t("resources." + resource + ".description")}</p></header>
    <ResourceManager
      locale={locale}
      resource={resource}
      page={page}
      search={query.search}
      categories={categories.data ?? []}
      events={events.data ?? []}
      goals={goals.data ?? []}
      media={media}
      status={query.status}
      error={query.error}
      dialog={{
        type: query.dialog === "create" || query.dialog === "edit" ? query.dialog : undefined,
        id: query.id
      }}
    />
  </div>;
}
