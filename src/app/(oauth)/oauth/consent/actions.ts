"use server";

import { z } from "zod";
import { redirectTo } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const authorizationIdSchema = z.string().min(1).max(2048);

async function decide(formData: FormData, approve: boolean) {
  const authorizationId = authorizationIdSchema.safeParse(formData.get("authorizationId"));
  if (!authorizationId.success) redirectTo("/oauth/consent?error=invalid_request");
  const client = await createSupabaseServerClient();
  const response = approve
    ? await client.auth.oauth.approveAuthorization(authorizationId.data, { skipBrowserRedirect: true })
    : await client.auth.oauth.denyAuthorization(authorizationId.data, { skipBrowserRedirect: true });
  if (response.error || !response.data?.redirect_url) {
    redirectTo("/oauth/consent?authorization_id=" + encodeURIComponent(authorizationId.data) + "&error=decision_failed");
  }
  redirectTo(response.data.redirect_url);
}

export async function approveOAuthAction(formData: FormData) { return decide(formData, true); }
export async function denyOAuthAction(formData: FormData) { return decide(formData, false); }
