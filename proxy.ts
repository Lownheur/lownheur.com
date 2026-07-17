import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";
import { refreshSupabaseSession } from "./src/lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: ["/((?!api|auth|mcp|\\.well-known|_next|_vercel|.*\\..*).*)"]
};
