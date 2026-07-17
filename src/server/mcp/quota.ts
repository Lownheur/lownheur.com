import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const quotaResultSchema = z.object({
  allowed: z.boolean(),
  used: z.coerce.number().int().nonnegative(),
  quota: z.coerce.number().int().positive(),
  resets_at: z.string()
});

export type McpQuotaResult = z.infer<typeof quotaResultSchema>;

export function isToolCallRequest(body: unknown) {
  return Boolean(
    body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      "method" in body &&
      body.method === "tools/call"
  );
}

export async function consumeMcpCall(userId: string): Promise<McpQuotaResult> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_mcp_call_admin", {
    p_user_id: userId
  });
  if (error) throw new Error("MCP quota could not be checked.", { cause: error });
  return quotaResultSchema.parse(data?.[0]);
}
