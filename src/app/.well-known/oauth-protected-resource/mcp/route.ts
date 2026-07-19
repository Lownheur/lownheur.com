import { getAppUrl, getSupabaseEnv } from "@/lib/env";
import { MCP_OAUTH_SCOPES } from "@/server/mcp/oauth";

export const dynamic = "force-dynamic";

export function GET() {
  const appUrl = getAppUrl();
  const { url } = getSupabaseEnv();
  return Response.json({
    resource: appUrl + "/mcp",
    authorization_servers: [url + "/auth/v1"],
    bearer_methods_supported: ["header"],
    scopes_supported: MCP_OAUTH_SCOPES,
    resource_name: "Lownheur",
    resource_documentation: appUrl + "/fr/dashboard/connections"
  }, { headers: { "Cache-Control": "public, max-age=300" } });
}
