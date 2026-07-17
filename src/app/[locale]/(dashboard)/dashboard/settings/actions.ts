"use server";

import { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { redirectTo } from "@/lib/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelStripeSubscriptionForUser } from "@/server/billing";
import { deleteAllUserMedia, MediaError, readImageFiles, removeAvatar, uploadAvatar } from "@/server/media";

function localeFrom(formData: FormData): AppLocale { return formData.get("locale") === "en" ? "en" : "fr"; }
function path(locale: AppLocale, suffix: string) { return "/" + locale + "/dashboard/settings" + suffix; }
function validTimezone(value: string) { try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; } }

export async function updateProfileAction(formData: FormData) {
  const locale = localeFrom(formData);
  const parsed = z.object({
    displayName: z.string().trim().min(1).max(80),
    username: z.string().trim().regex(/^[A-Za-z0-9_]{3,30}$/),
    profileLocale: z.enum(["fr", "en"]),
    timezone: z.string().trim().min(1).max(80).refine(validTimezone)
  }).safeParse({ displayName: formData.get("displayName"), username: formData.get("username"), profileLocale: formData.get("profileLocale"), timezone: formData.get("timezone") });
  if (!parsed.success) redirectTo(path(locale, "?error=invalid_input"));
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  let avatar: File[];
  try { avatar = readImageFiles(formData, "avatar"); if (avatar.length > 1) throw new MediaError("invalid_media", "Only one avatar is allowed."); } catch (error) { const code = error instanceof MediaError ? error.code : "invalid_media"; redirectTo(path(locale, "?error=" + code)); }
  const { error } = await client.from("profiles").update({ display_name: parsed.data.displayName, username: parsed.data.username, locale: parsed.data.profileLocale, timezone: parsed.data.timezone }).eq("user_id", user.id);
  if (error?.code === "23505") redirectTo(path(locale, "?error=username_taken"));
  if (error) redirectTo(path(locale, "?error=update_failed"));
  try { if (avatar[0]) await uploadAvatar(client, user.id, avatar[0]); } catch (error) { const code = error instanceof MediaError ? error.code : "media_failed"; redirectTo(path(locale, "?error=" + code)); }
  redirectTo("/" + parsed.data.profileLocale + "/dashboard/settings?status=updated");
}

export async function deleteAccountAction(formData: FormData) {
  const locale = localeFrom(formData);
  const expected = locale === "fr" ? "SUPPRIMER" : "DELETE";
  if (formData.get("confirmation") !== expected) redirectTo(path(locale, "?error=confirmation_failed"));
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  try {
    await cancelStripeSubscriptionForUser(user.id);
    await deleteAllUserMedia(user.id);
  } catch {
    redirectTo(path(locale, "?error=delete_failed"));
  }
  await client.auth.signOut({ scope: "global" });
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) redirectTo(path(locale, "?error=delete_failed"));
  redirectTo("/" + locale + "?status=account_deleted");
}

export async function removeAvatarAction(formData: FormData) {
  const locale = localeFrom(formData);
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  try { await removeAvatar(client, user.id); } catch { redirectTo(path(locale, "?error=media_failed")); }
  redirectTo(path(locale, "?status=updated"));
}
