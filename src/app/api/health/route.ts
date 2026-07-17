import { NextResponse } from "next/server";
import { getSupabaseEnv, hasStripeEnv, hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkedAt = new Date().toISOString();
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      {
        status: "degraded",
        checkedAt,
        services: { database: "not_configured", billing: "not_configured" }
      },
      { status: 503 }
    );
  }

  try {
    const { url, publishableKey } = getSupabaseEnv();
    const response = await fetch(url + "/auth/v1/settings", {
      headers: { apikey: publishableKey },
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) throw new Error("Supabase health request failed.");
    return NextResponse.json(
      {
        status: "ok",
        checkedAt,
        services: {
          database: "reachable",
          billing: hasStripeEnv() ? "configured" : "not_configured"
        }
      },
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        checkedAt,
        services: {
          database: "unreachable",
          billing: hasStripeEnv() ? "configured" : "not_configured"
        }
      },
      { status: 503 }
    );
  }
}