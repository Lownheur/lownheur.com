import { redirectTo } from "@/lib/navigation";
import type { AppLocale } from "@/i18n/routing";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) return null;
  return user;
}

export async function requireUser(locale: AppLocale) {
  const user = await getCurrentUser();
  if (!user) redirectTo("/" + locale + "/login");
  return user;
}
