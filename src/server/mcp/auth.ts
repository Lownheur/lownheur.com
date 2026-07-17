import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import { getAppUrl, getSupabaseEnv } from "@/lib/env";

const claimsSchema = z.object({
  sub: z.uuid(),
  client_id: z.string().min(1),
  exp: z.number().int().positive().optional(),
  scope: z.string().optional()
});

export type McpIdentity = {
  userId: string;
  client: SupabaseClient;
  authInfo: AuthInfo;
};

export class McpAuthError extends Error {
  constructor(message = "A valid OAuth access token is required.") {
    super(message);
    this.name = "McpAuthError";
  }
}

export function getProtectedResourceMetadataUrl() {
  return getAppUrl() + "/.well-known/oauth-protected-resource/mcp";
}

export function unauthorizedMcpResponse(message?: string) {
  return Response.json(
    { error: "invalid_token", error_description: message ?? "OAuth authentication is required." },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate":
          'Bearer resource_metadata="' + getProtectedResourceMetadataUrl() + '"'
      }
    }
  );
}

export async function authenticateMcpRequest(request: Request): Promise<McpIdentity> {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) throw new McpAuthError();

  const token = match[1];
  const { url, publishableKey } = getSupabaseEnv();
  const client = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: "Bearer " + token } }
  });
  const { data, error } = await client.auth.getClaims(token);
  const claims = claimsSchema.safeParse(data?.claims);
  if (error || !claims.success) throw new McpAuthError();
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || userData.user?.id !== claims.data.sub) throw new McpAuthError();

  return {
    userId: claims.data.sub,
    client,
    authInfo: {
      token,
      clientId: claims.data.client_id,
      scopes: claims.data.scope?.split(" ").filter(Boolean) ?? [],
      expiresAt: claims.data.exp,
      resource: new URL(getAppUrl() + "/mcp")
    }
  };
}
