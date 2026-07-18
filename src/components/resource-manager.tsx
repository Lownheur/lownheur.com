import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import type { MediaView } from "@/server/media";
import type { ResourceName, ResourcePage, ResourceRecord } from "@/server/domain/resources";
import { ConfirmSubmitButton } from "./confirm-submit-button";
import { LocalDateTimeField } from "./local-datetime-field";
import { PrivateImage } from "./private-image";
import { ResourceDialog } from "./resource-dialog";
import { ResourceIllustration } from "./resource-illustration";
import {
  createResourceAction,
  deleteResourceAction,
  removeMediaAction,
  updateResourceAction
} from "@/app/[locale]/(dashboard)/dashboard/actions";

type Option = { id: string; title: string };
type DialogState = { type?: "create" | "edit"; id?: string };

const resourcePaths = {
  categories: "/dashboard/categories",
  events: "/dashboard/events",
  goals: "/dashboard/goals",
  schedules: "/dashboard/schedules"
} as const;

function value(row: ResourceRecord | undefined, key: string) {
  const field = row?.[key];
  return typeof field === "string" ? field : "";
}

function ExistingMedia({
  locale,
  resource,
  resourceId,
  assets,
  confirmation
}: {
  locale: AppLocale;
  resource: Exclude<ResourceName, "schedules">;
  resourceId: string;
  assets: MediaView[];
  confirmation: string;
}) {
  if (!assets.length) return null;
  return (
    <div className="dialog-media-section">
      <div className="media-gallery">
        {assets.map((asset) => (
          <figure key={asset.id}>
            <PrivateImage src={asset.url} alt={asset.alt} />
            <form action={removeMediaAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="resource" value={resource} />
              <input type="hidden" name="id" value={resourceId} />
              <input type="hidden" name="assetId" value={asset.id} />
              <ConfirmSubmitButton className="media-remove" label="×" confirmation={confirmation} />
            </form>
          </figure>
        ))}
      </div>
    </div>
  );
}

async function ResourceFields({
  locale,
  resource,
  row,
  categories,
  events,
  goals
}: {
  locale: AppLocale;
  resource: ResourceName;
  row?: ResourceRecord;
  categories: Option[];
  events: Option[];
  goals: Option[];
}) {
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  if (resource === "schedules") {
    const target = value(row, "event_id")
      ? "event:" + value(row, "event_id")
      : value(row, "goal_id")
        ? "goal:" + value(row, "goal_id")
        : "";
    return (
      <>
        <label className="form-wide">
          <span>{t("fields.target")}</span>
          <select className="form-input" name="target" defaultValue={target} required>
            <option value="">—</option>
            <optgroup label={t("nav.events")}>
              {events.map((item) => <option value={"event:" + item.id} key={item.id}>{item.title}</option>)}
            </optgroup>
            <optgroup label={t("nav.goals")}>
              {goals.map((item) => <option value={"goal:" + item.id} key={item.id}>{item.title}</option>)}
            </optgroup>
          </select>
        </label>
        <LocalDateTimeField name="startsAt" label={t("fields.startsAt")} defaultValue={value(row, "starts_at")} required />
        <LocalDateTimeField name="endsAt" label={t("fields.endsAt")} defaultValue={value(row, "ends_at")} />
        <label className="form-wide">
          <span>{t("fields.status")}</span>
          <select className="form-input" name="status" defaultValue={value(row, "status") || "scheduled"}>
            {["scheduled", "completed", "cancelled"].map((status) => <option value={status} key={status}>{t("statuses." + status)}</option>)}
          </select>
        </label>
      </>
    );
  }

  return (
    <>
      {resource !== "categories" ? (
        <label className="form-wide">
          <span>{t("fields.category")}</span>
          <select className="form-input" name="categoryId" defaultValue={value(row, "category_id")} required>
            <option value="">—</option>
            {categories.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
          </select>
        </label>
      ) : null}
      <label className="form-wide">
        <span>{t("fields.title")}</span>
        <input className="form-input" name="title" defaultValue={value(row, "title")} maxLength={120} required />
      </label>
      <label className="form-wide">
        <span>{t("fields.description")}</span>
        <textarea className="form-input" name="description" defaultValue={value(row, "description")} maxLength={5000} rows={4} />
      </label>
      {resource === "goals" ? (
        <label className="form-wide">
          <span>{t("fields.status")}</span>
          <select className="form-input" name="status" defaultValue={value(row, "status") || "todo"}>
            {["todo", "in_progress", "achieved", "abandoned"].map((status) => <option value={status} key={status}>{t("statuses." + status)}</option>)}
          </select>
        </label>
      ) : null}
      <label className="form-wide image-upload-field">
        <span className="image-upload-preview"><ResourceIllustration resource={resource} /></span>
        <span className="image-upload-copy">
          <strong>{t("fields.images")}</strong>
          <small>{t("fields.imageHint")}</small>
        </span>
        <input className="form-input file-input" type="file" name="images" accept="image/jpeg,image/png,image/webp,image/avif" multiple={resource !== "categories"} />
      </label>
    </>
  );
}

async function ResourceForm({
  locale,
  resource,
  row,
  categories,
  events,
  goals,
  submitLabel,
  cancelLabel
}: {
  locale: AppLocale;
  resource: ResourceName;
  row?: ResourceRecord;
  categories: Option[];
  events: Option[];
  goals: Option[];
  submitLabel: string;
  cancelLabel: string;
}) {
  return (
    <form className="resource-form resource-dialog-form" action={row ? updateResourceAction : createResourceAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="resource" value={resource} />
      {row ? <input type="hidden" name="id" value={row.id} /> : null}
      <ResourceFields locale={locale} resource={resource} row={row} categories={categories} events={events} goals={goals} />
      <footer className="resource-dialog-footer">
        <button className="button button-ghost" type="button" data-dialog-close>{cancelLabel}</button>
        <button className="button button-primary" type="submit">{submitLabel}</button>
      </footer>
    </form>
  );
}

export async function ResourceManager({
  locale,
  resource,
  page,
  search,
  categories,
  events,
  goals,
  media,
  status,
  error,
  dialog
}: {
  locale: AppLocale;
  resource: ResourceName;
  page: ResourcePage;
  search?: string;
  categories: Option[];
  events: Option[];
  goals: Option[];
  media: Record<string, MediaView[]>;
  status?: string;
  error?: string;
  dialog?: DialogState;
}) {
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const isSearchable = resource !== "schedules";
  const singular = t("resources." + resource + ".singular");
  const closeLabel = t("actions.close");
  const cancelLabel = t("actions.cancel");

  return (
    <div className="resource-layout">
      {status && ["created", "updated", "deleted"].includes(status) ? (
        <p className="form-notice form-success" role="status">{t("status." + status)}</p>
      ) : null}
      {error ? <p className="form-notice form-error" role="alert">{t("errors." + error)}</p> : null}

      <div className="resource-toolbar">
        {isSearchable ? (
          <form className="resource-search">
            <label className="sr-only" htmlFor="resource-search">{t("actions.search")}</label>
            <input id="resource-search" className="form-input" type="search" name="search" defaultValue={search} placeholder={t("actions.searchPlaceholder")} />
            <button className="button" type="submit">{t("actions.search")}</button>
          </form>
        ) : <div />}
        <ResourceDialog
          triggerLabel={t("actions.add")}
          title={t("dialogs.createTitle", { resource: singular })}
          description={t("dialogs.createDescription", { resource: singular })}
          triggerClassName="button button-primary resource-add-button"
          icon="plus"
          closeLabel={closeLabel}
          defaultOpen={dialog?.type === "create"}
        >
          <div className="dialog-illustration"><ResourceIllustration resource={resource} /></div>
          {error && dialog?.type === "create" ? <p className="form-notice form-error" role="alert">{t("errors." + error)}</p> : null}
          <ResourceForm locale={locale} resource={resource} categories={categories} events={events} goals={goals} submitLabel={t("actions.create")} cancelLabel={cancelLabel} />
        </ResourceDialog>
      </div>

      {page.items.length ? (
        <section className={"resource-list-grid resource-list-grid-" + resource} aria-label={t("resources." + resource + ".title")}>
          {page.items.map((row) => {
            const rawDate = value(row, "starts_at");
            const dateLabel = rawDate ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(rawDate)) : "";
            const scheduleTarget = resource === "schedules"
              ? events.find((item) => item.id === value(row, "event_id"))?.title ?? goals.find((item) => item.id === value(row, "goal_id"))?.title
              : undefined;
            const title = resource === "schedules" ? scheduleTarget ?? dateLabel : value(row, "title");
            const description = resource === "schedules" ? dateLabel : value(row, "description");
            const state = value(row, "status");
            const category = resource === "events" || resource === "goals"
              ? categories.find((item) => item.id === value(row, "category_id"))?.title
              : undefined;
            const assets = media[row.id] ?? [];
            const hero = assets[0];

            return (
              <article className="resource-card" key={row.id}>
                <div className="resource-card-visual">
                  {hero ? <PrivateImage src={hero.url} alt={hero.alt || title} /> : <ResourceIllustration resource={resource} />}
                  <span className="resource-type-label">{singular}</span>
                  {assets.length > 1 ? <span className="resource-media-count">+{assets.length - 1}</span> : null}
                </div>
                <div className="resource-card-body">
                  <div className="resource-card-meta">
                    {category ? <span>{category}</span> : null}
                    {state ? <span className="status-pill">{t("statuses." + state)}</span> : null}
                  </div>
                  <div className="resource-card-copy">
                    <h2>{title}</h2>
                    {description ? <p>{description}</p> : null}
                  </div>
                  <div className="resource-card-actions">
                    <ResourceDialog
                      triggerLabel={t("actions.edit")}
                      title={t("dialogs.editTitle", { resource: singular })}
                      description={t("dialogs.editDescription", { resource: singular })}
                      triggerClassName="button button-ghost"
                      icon="edit"
                      closeLabel={closeLabel}
                      defaultOpen={dialog?.type === "edit" && dialog.id === row.id}
                    >
                      <div className="dialog-illustration"><ResourceIllustration resource={resource} /></div>
                      {error && dialog?.type === "edit" && dialog.id === row.id ? <p className="form-notice form-error" role="alert">{t("errors." + error)}</p> : null}
                      {resource !== "schedules" ? (
                        <ExistingMedia locale={locale} resource={resource} resourceId={row.id} assets={assets} confirmation={t("actions.confirmRemoveImage")} />
                      ) : null}
                      <ResourceForm locale={locale} resource={resource} row={row} categories={categories} events={events} goals={goals} submitLabel={t("actions.save")} cancelLabel={cancelLabel} />
                    </ResourceDialog>
                    <ResourceDialog
                      triggerLabel={t("actions.delete")}
                      title={t("dialogs.deleteTitle", { name: title })}
                      description={t("dialogs.deleteDescription")}
                      triggerClassName="button button-ghost button-danger"
                      icon="trash"
                      closeLabel={closeLabel}
                    >
                      <div className="delete-dialog-content">
                        <ResourceIllustration resource={resource} />
                        <p>{t("dialogs.deleteWarning")}</p>
                      </div>
                      <form className="delete-dialog-form" action={deleteResourceAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="resource" value={resource} />
                        <input type="hidden" name="id" value={row.id} />
                        <footer className="resource-dialog-footer">
                          <button className="button button-ghost" type="button" data-dialog-close>{cancelLabel}</button>
                          <button className="button button-danger-solid" type="submit">{t("actions.delete")}</button>
                        </footer>
                      </form>
                    </ResourceDialog>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state resource-empty-state">
          <ResourceIllustration resource={resource} />
          <strong>{t("resources." + resource + ".empty")}</strong>
          <p>{t("resources." + resource + ".emptyHint")}</p>
        </div>
      )}

      {page.nextCursor ? (
        <Link className="button pagination-next" href={{ pathname: resourcePaths[resource], query: { ...(search ? { search } : {}), cursor: page.nextCursor } }}>{t("actions.next")}</Link>
      ) : null}
    </div>
  );
}
