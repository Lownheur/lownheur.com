import { getAppUrl, getSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  const appUrl = getAppUrl();
  const { url } = getSupabaseEnv();
  return Response.json({
    resource: appUrl + "/mcp",
    authorization_servers: [url + "/auth/v1"],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "email", "profile"],
    resource_name: "Lownheur",
    resource_documentation: appUrl + "/fr/dashboard/connections"
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
