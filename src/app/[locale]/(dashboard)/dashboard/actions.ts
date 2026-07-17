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
  type ResourceName,
  updateResource
} from "@/server/domain/resources";

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
      description: nullable(formData.get("description"))
    };
  }

  if (resource === "events") {
    return {
      categoryId: formData.get("categoryId"),
      title: formData.get("title"),
      description: nullable(formData.get("description"))
    };
  }

  if (resource === "goals") {
    return {
      categoryId: formData.get("categoryId"),
      title: formData.get("title"),
      description: nullable(formData.get("description")),
      status: formData.get("status")
    };
  }

  const target = String(formData.get("target") ?? "").split(":");
  return {
    targetType: target[0],
    targetId: target[1],
    startsAt: formData.get("startsAt"),
    endsAt: nullable(formData.get("endsAt")),
    status: formData.get("status")
  };
}

function resourcePath(locale: AppLocale, resource: ResourceName) {
  return "/" + locale + "/dashboard/" + resource;
}

function errorRedirect(
  locale: AppLocale,
  resource: ResourceName,
  error: unknown
): never {
  const code = error instanceof DomainError ? error.code : "database_error";
  redirectTo(resourcePath(locale, resource) + "?error=" + code);
}

export async function createResourceAction(formData: FormData) {
  const locale = readLocale(formData);
  const resource = readResource(formData);
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();

  try {
    await createResource(client, user.id, resource, resourceInput(resource, formData));
  } catch (error) {
    errorRedirect(locale, resource, error);
  }

  revalidatePath(resourcePath(locale, resource));
  redirectTo(resourcePath(locale, resource) + "?status=created");
}

export async function updateResourceAction(formData: FormData) {
  const locale = readLocale(formData);
  const resource = readResource(formData);
  const resourceId = String(formData.get("id") ?? "");
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();

  try {
    await updateResource(
      client,
      user.id,
      resource,
      resourceId,
      resourceInput(resource, formData)
    );
  } catch (error) {
    errorRedirect(locale, resource, error);
  }

  revalidatePath(resourcePath(locale, resource));
  redirectTo(resourcePath(locale, resource) + "?status=updated");
}

export async function deleteResourceAction(formData: FormData) {
  const locale = readLocale(formData);
  const resource = readResource(formData);
  const resourceId = String(formData.get("id") ?? "");
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();

  try {
    await deleteResource(client, user.id, resource, resourceId);
  } catch (error) {
    errorRedirect(locale, resource, error);
  }

  revalidatePath(resourcePath(locale, resource));
  redirectTo(resourcePath(locale, resource) + "?status=deleted");
}
