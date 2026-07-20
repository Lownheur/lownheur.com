import { type NextRequest, NextResponse } from "next/server";
import { preferredLocale } from "./lib/locale";
import { refreshSupabaseSession } from "./lib/supabase/proxy";
import { localizedPath, notFoundHtml } from "./lib/routes";

export async function middleware(request: NextRequest) {
  const route = localizedPath(request.nextUrl.pathname);
  const unknownRoute = route ? !route.known : request.nextUrl.pathname !== "/";
  if (unknownRoute) {
    const locale = route?.locale ?? preferredLocale(request.headers.get("accept-language"));
    return new NextResponse(notFoundHtml(locale), {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow"
      }
    });
  }
  const response = NextResponse.next();
  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: ["/((?!api|auth|mcp|\\.well-known|_next|_vercel|.*\\..*).*)"]
};
