import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createLownheurMcpServer } from "@/server/mcp/server";
import { authenticateMcpRequest, McpAuthError, unauthorizedMcpResponse } from "@/server/mcp/auth";
import { consumeMcpCall, isToolCallRequest } from "@/server/mcp/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function rpcError(id: unknown, status: number, code: number, message: string, data?: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message, ...(data ? { data } : {}) } }, { status, headers: { "Cache-Control": "no-store" } });
}

async function handleMcp(request: Request) {
  let identity;
  try { identity = await authenticateMcpRequest(request); }
  catch (error) {
    if (error instanceof McpAuthError) return unauthorizedMcpResponse(error.message);
    return rpcError(null, 503, -32603, "Authentication service is not configured.");
  }

  let body: unknown;
  if (request.method === "POST") {
    try { body = await request.clone().json(); } catch { body = undefined; }
  }

  if (isToolCallRequest(body)) {
    try {
      const quota = await consumeMcpCall(identity.userId);
      if (!quota.allowed) {
        const id = body && typeof body === "object" && "id" in body ? body.id : null;
        return rpcError(id, 429, -32001, "Monthly MCP call quota reached.", quota);
      }
    } catch {
      return rpcError(null, 503, -32603, "Usage quota could not be checked.");
    }
  }

  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  const server = createLownheurMcpServer(identity);
  await server.connect(transport);
  try {
    return await transport.handleRequest(request, { authInfo: identity.authInfo, ...(body !== undefined ? { parsedBody: body } : {}) });
  } finally {
    await server.close();
  }
}

export const GET = handleMcp;
export const POST = handleMcp;
export const DELETE = handleMcp;

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID",
      "Access-Control-Expose-Headers": "MCP-Protocol-Version, MCP-Session-Id, WWW-Authenticate",
      "Access-Control-Max-Age": "86400"
    }
  });
}
