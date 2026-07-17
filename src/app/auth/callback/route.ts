import { NextResponse } from "next/server";
import { getAppUrl, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fr";
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const next =
    requestedNext?.startsWith("/" + locale + "/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/" + locale + "/dashboard";

  if (!hasSupabaseEnv() || !code) {
    return NextResponse.redirect(
      getAppUrl() + "/" + locale + "/login?error=callback_failed"
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      getAppUrl() + "/" + locale + "/login?error=callback_failed"
    );
  }

  return NextResponse.redirect(getAppUrl() + next);
}
