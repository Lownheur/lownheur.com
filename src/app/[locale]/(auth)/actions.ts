"use server";

import { z } from "zod";
import { redirectTo } from "@/lib/navigation";
import { getAppUrl, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";

const emailSchema = z.email().max(320);
const passwordSchema = z.string().min(10).max(128);

function readLocale(formData: FormData): AppLocale {
  return formData.get("locale") === "en" ? "en" : "fr";
}

function safeNext(formData: FormData, locale: AppLocale) {
  const next = formData.get("next");
  if (
    typeof next === "string" &&
    next.startsWith("/" + locale + "/") &&
    !next.startsWith("//")
  ) {
    return next;
  }
  return "/" + locale + "/dashboard";
}

function configurationRedirect(locale: AppLocale, page: string): never {
  redirectTo("/" + locale + "/" + page + "?error=not_configured");
}

export async function loginAction(formData: FormData) {
  const locale = readLocale(formData);
  if (!hasSupabaseEnv()) configurationRedirect(locale, "login");

  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1).max(128) })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password")
    });

  if (!parsed.success) redirectTo("/" + locale + "/login?error=invalid_input");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirectTo("/" + locale + "/login?error=invalid_credentials");

  redirectTo(safeNext(formData, locale));
}

export async function signupAction(formData: FormData) {
  const locale = readLocale(formData);
  if (!hasSupabaseEnv()) configurationRedirect(locale, "signup");

  const parsed = z
    .object({
      displayName: z.string().trim().min(1).max(80),
      email: emailSchema,
      password: passwordSchema
    })
    .safeParse({
      displayName: formData.get("displayName"),
      email: formData.get("email"),
      password: formData.get("password")
    });

  if (!parsed.success) redirectTo("/" + locale + "/signup?error=invalid_input");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo:
        getAppUrl() + "/auth/callback?locale=" + locale,
      data: {
        display_name: parsed.data.displayName,
        locale
      }
    }
  });

  if (error) redirectTo("/" + locale + "/signup?error=signup_failed");
  redirectTo("/" + locale + "/login?status=check_email");
}

export async function forgotPasswordAction(formData: FormData) {
  const locale = readLocale(formData);
  if (!hasSupabaseEnv()) configurationRedirect(locale, "forgot-password");

  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) {
    redirectTo("/" + locale + "/forgot-password?error=invalid_input");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo:
      getAppUrl() +
      "/auth/callback?locale=" +
      locale +
      "&next=/" +
      locale +
      "/reset-password"
  });

  redirectTo("/" + locale + "/forgot-password?status=email_sent");
}

export async function updatePasswordAction(formData: FormData) {
  const locale = readLocale(formData);
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) {
    redirectTo("/" + locale + "/reset-password?error=invalid_input");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) {
    redirectTo("/" + locale + "/reset-password?error=update_failed");
  }

  redirectTo("/" + locale + "/dashboard");
}

export async function logoutAction(formData: FormData) {
  const locale = readLocale(formData);
  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirectTo("/" + locale + "/login");
}
