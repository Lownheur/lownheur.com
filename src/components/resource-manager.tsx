import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { ResourceName, ResourcePage, ResourceRecord } from "@/server/domain/resources";
import { LocalDateTimeField } from "./local-datetime-field";
import {
  createResourceAction,
  deleteResourceAction,
  updateResourceAction
} from "@/app/[locale]/(dashboard)/dashboard/actions";

type Option = { id: string; title: string };

const resourcePaths = { categories: "/dashboard/categories", events: "/dashboard/events", goals: "/dashboard/goals", schedules: "/dashboard/schedules" } as const;

function value(row: ResourceRecord | undefined, key: string) {
  const field = row?.[key];
  return typeof field === "string" ? field : "";
}

async function ResourceFields({
  resource,
  row,
  categories,
  events,
  goals
}: {
  resource: ResourceName;
  row?: ResourceRecord;
  categories: Option[];
  events: Option[];
  goals: Option[];
}) {
  const t = await getTranslations("Dashboard");

  if (resource === "schedules") {
    const target = value(row, "event_id")
      ? "event:" + value(row, "event_id")
      : value(row, "goal_id")
        ? "goal:" + value(row, "goal_id")
        : "";
    return <>
      <label><span>{t("fields.target")}</span><select className="form-input" name="target" defaultValue={target} required><option value="">—</option><optgroup label={t("nav.events")}>{events.map((item) => <option value={"event:" + item.id} key={item.id}>{item.title}</option>)}</optgroup><optgroup label={t("nav.goals")}>{goals.map((item) => <option value={"goal:" + item.id} key={item.id}>{item.title}</option>)}</optgroup></select></label>
      <LocalDateTimeField name="startsAt" label={t("fields.startsAt")} defaultValue={value(row, "starts_at")} required />
      <LocalDateTimeField name="endsAt" label={t("fields.endsAt")} defaultValue={value(row, "ends_at")} />
      <label><span>{t("fields.status")}</span><select className="form-input" name="status" defaultValue={value(row, "status") || "scheduled"}>{["scheduled", "completed", "cancelled"].map((status) => <option value={status} key={status}>{t("statuses." + status)}</option>)}</select></label>
    </>;
  }

  return <>
    {resource !== "categories" ? <label><span>{t("fields.category")}</span><select className="form-input" name="categoryId" defaultValue={value(row, "category_id")} required><option value="">—</option>{categories.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label> : null}
    <label><span>{t("fields.title")}</span><input className="form-input" name="title" defaultValue={value(row, "title")} maxLength={120} required /></label>
    <label className="form-wide"><span>{t("fields.description")}</span><textarea className="form-input" name="description" defaultValue={value(row, "description")} maxLength={5000} rows={3} /></label>
    {resource === "goals" ? <label><span>{t("fields.status")}</span><select className="form-input" name="status" defaultValue={value(row, "status") || "todo"}>{["todo", "in_progress", "achieved", "abandoned"].map((status) => <option value={status} key={status}>{t("statuses." + status)}</option>)}</select></label> : null}
  </>;
}

export async function ResourceManager({
  locale,
  resource,
  page,
  search,
  categories,
  events,
  goals,
  status,
  error
}: {
  locale: AppLocale;
  resource: ResourceName;
  page: ResourcePage;
  search?: string;
  categories: Option[];
  events: Option[];
  goals: Option[];
  status?: string;
  error?: string;
}) {
  const t = await getTranslations("Dashboard");
  const isSearchable = resource !== "schedules";

  return <div className="resource-layout">
    <section className="dashboard-panel resource-create">
      <h2>{t("actions.create")}</h2>
      <form className="resource-form" action={createResourceAction}>
        <input type="hidden" name="locale" value={locale} /><input type="hidden" name="resource" value={resource} />
        <ResourceFields resource={resource} categories={categories} events={events} goals={goals} />
        <button className="button button-primary" type="submit">{t("actions.create")}</button>
      </form>
    </section>
    <section className="resource-list">
      {status && ["created", "updated", "deleted"].includes(status) ? <p className="form-notice form-success" role="status">{t("status." + status)}</p> : null}
      {error ? <p className="form-notice form-error" role="alert">{t("errors." + error)}</p> : null}
      {isSearchable ? <form className="resource-search"><label className="sr-only" htmlFor="resource-search">{t("actions.search")}</label><input id="resource-search" className="form-input" type="search" name="search" defaultValue={search} placeholder={t("actions.searchPlaceholder")} /><button className="button" type="submit">{t("actions.search")}</button></form> : null}
      {page.items.length ? page.items.map((row) => {
        const label = value(row, "title") || new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value(row, "starts_at")));
        const state = value(row, "status");
        return <article className="resource-card" key={row.id}>
          <div className="resource-card-summary"><div><h2>{label}</h2>{value(row, "description") ? <p>{value(row, "description")}</p> : null}</div>{state ? <span className="status-pill">{t("statuses." + state)}</span> : null}</div>
          <details><summary>{t("actions.edit")}</summary><form className="resource-form" action={updateResourceAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="resource" value={resource} /><input type="hidden" name="id" value={row.id} /><ResourceFields resource={resource} row={row} categories={categories} events={events} goals={goals} /><button className="button button-primary" type="submit">{t("actions.save")}</button></form></details>
          <form action={deleteResourceAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="resource" value={resource} /><input type="hidden" name="id" value={row.id} /><button className="button button-danger" type="submit">{t("actions.delete")}</button></form>
        </article>;
      }) : <div className="empty-state"><strong>{t("resources." + resource + ".empty")}</strong></div>}
      {page.nextCursor ? <Link className="button pagination-next" href={{ pathname: resourcePaths[resource], query: { ...(search ? { search } : {}), cursor: page.nextCursor } }}>{t("actions.next")}</Link> : null}
    </section>
  </div>;
}
