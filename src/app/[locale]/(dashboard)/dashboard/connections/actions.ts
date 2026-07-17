"use server";

import { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { redirectTo } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function revokeGrantAction(formData: FormData) {
  const locale: AppLocale = formData.get("locale") === "en" ? "en" : "fr";
  const clientId = z.uuid().safeParse(formData.get("clientId"));
  if (!clientId.success) redirectTo("/" + locale + "/dashboard/connections?error=invalid_input");
  await requireUser(locale);
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.oauth.revokeGrant({ clientId: clientId.data });
  if (error) redirectTo("/" + locale + "/dashboard/connections?error=revoke_failed");
  redirectTo("/" + locale + "/dashboard/connections?status=revoked");
}
