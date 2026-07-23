"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { redirectTo } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createResource,
  deleteResource,
  DomainError,
  resourceNames,
  setGoalCheckIn,
  setScheduleOccurrenceCompleted,
  type ResourceName,
  updateResource
} from "@/server/domain/resources";
import {
  deleteResourceAndMedia,
  MediaError,
  readImageFiles,
  removeResourceMedia,
  uploadResourceMedia,
  type MediaResource
} from "@/server/media";

function readLocale(formData: FormData): AppLocale {
  return formData.get("locale") === "en" ? "en" : "fr";
}

function readResource(formData: FormData): ResourceName {
  return z.enum(resourceNames).parse(formData.get("resource"));
}

function nullable(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resourceInput(resource: ResourceName, formData: FormData) {
  if (resource === "categories") {
    return {
      title: formData.get("title"),
      description: nullable(formData.get("description")),
      parentCategoryId: nullable(formData.get("parentCategoryId"))
    };
  }
  if (resource === "events") {
    return {
      categoryId: formData.get("categoryId"),
      title: formData.get("title"),
      description: nullable(formData.get("description")),
      goalIds: formData.getAll("goalIds")
    };
  }
  if (resource === "goals") {
    return {
      categoryId: formData.get("categoryId"),
      title: formData.get("title"),
      description: nullable(formData.get("description")),
      status: formData.get("status"),
      goalType: formData.get("goalType"),
      targetValue: formData.get("targetValue"),
      unit: formData.get("unit"),
      period: formData.get("period")
    };
  }
  return {
    eventId: formData.get("eventId"),
    startsAt: formData.get("startsAt"),
    endsAt: nullable(formData.get("endsAt")),
    status: formData.get("status"),
    recurrence: formData.get("recurrence"),
    recurrenceInterval: formData.get("recurrenceInterval"),
    recurrenceWeekdays: formData.getAll("recurrenceWeekdays"),
    recurrenceEndsAt: nullable(formData.get("recurrenceEndsAt")),
    recurrenceTimezone: formData.get("recurrenceTimezone")
  };
}

function resourcePath(locale: AppLocale, resource: ResourceName) {
  const section = resource === "schedules" ? "calendar" : "organize";
  return "/" + locale + "/dashboard?section=" + section + "&manage=" + resource;
}

function errorRedirect(locale: AppLocale, resource: ResourceName, error: unknown, dialog?: "create" | "edit", id?: string): never {
  const code = error instanceof DomainError || error instanceof MediaError ? error.code : "database_error";
  const query = new URLSearchParams({ error: code });
  if (dialog) query.set("dialog", dialog);
  if (id) query.set("id", id);
  redirectTo(resourcePath(locale, resource) + "&" + query.toString());
}

function isMediaResource(resource: ResourceName): resource is MediaResource {
  return resource !== "schedules";
}

export async function createResourceAction(formData: FormData) {
  const locale = readLocale(formData);
  const resource = readResource(formData);
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  let createdId: string | null = null;
  try {
    const files = isMediaResource(resource) ? readImageFiles(formData) : [];
    const created = await createResource(client, user.id, resource, resourceInput(resource, formData));
    createdId = created.id;
    if (isMediaResource(resource)) await uploadResourceMedia(client, user.id, resource, created.id, files);
  } catch (error) {
    if (createdId) {
      try { await deleteResource(client, user.id, resource, createdId); } catch { /* Preserve the original actionable error. */ }
    }
    errorRedirect(locale, resource, error, "create");
  }
  revalidatePath(resourcePath(locale, resource));
  redirectTo(resourcePath(locale, resource) + "&status=created");
}

export async function updateResourceAction(formData: FormData) {
  const locale = readLocale(formData);
  const resource = readResource(formData);
  const resourceId = String(formData.get("id") ?? "");
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  try {
    const files = isMediaResource(resource) ? readImageFiles(formData) : [];
    await updateResource(client, user.id, resource, resourceId, resourceInput(resource, formData));
    if (isMediaResource(resource)) await uploadResourceMedia(client, user.id, resource, resourceId, files);
  } catch (error) {
    errorRedirect(locale, resource, error, "edit", resourceId);
  }
  revalidatePath(resourcePath(locale, resource));
  redirectTo(resourcePath(locale, resource) + "&status=updated");
}

export async function deleteResourceAction(formData: FormData) {
  const locale = readLocale(formData);
  const resource = readResource(formData);
  const resourceId = String(formData.get("id") ?? "");
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  try {
    await deleteResourceAndMedia(client, user.id, resource, resourceId);
  } catch (error) {
    errorRedirect(locale, resource, error);
  }
  revalidatePath(resourcePath(locale, resource));
  redirectTo(resourcePath(locale, resource) + "&status=deleted");
}

export async function setOccurrenceCompletedAction(formData: FormData) {
  const locale = readLocale(formData);
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  await setScheduleOccurrenceCompleted(client, user.id, {
    scheduleId: String(formData.get("scheduleId") ?? ""),
    occurrenceStartsAt: String(formData.get("occurrenceStartsAt") ?? ""),
    completed: formData.get("completed") === "true"
  });
  revalidatePath("/" + locale + "/dashboard");
}

export async function setGoalCheckInAction(formData: FormData) {
  const locale = readLocale(formData);
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  await setGoalCheckIn(client, user.id, {
    goalId: String(formData.get("goalId") ?? ""),
    periodStart: String(formData.get("periodStart") ?? ""),
    completed: formData.get("completed") === "true",
    value: formData.get("value") ? Number(formData.get("value")) : undefined
  });
  revalidatePath("/" + locale + "/dashboard");
}

export async function removeMediaAction(formData: FormData) {
  const locale = readLocale(formData);
  const resource = readResource(formData);
  if (!isMediaResource(resource)) errorRedirect(locale, resource, new MediaError("invalid_media", "Schedules do not have media."));
  const resourceId = String(formData.get("id") ?? "");
  const assetId = String(formData.get("assetId") ?? "");
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  try {
    await removeResourceMedia(client, user.id, resource, resourceId, assetId);
  } catch (error) {
    errorRedirect(locale, resource, error, "edit", resourceId);
  }
  revalidatePath(resourcePath(locale, resource));
  redirectTo(resourcePath(locale, resource) + "?status=updated");
}
