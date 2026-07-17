import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createResource,
  createSchemas,
  deleteResource,
  DomainError,
  getResource,
  listResources,
  resourceNames,
  type ResourceName,
  updateResource,
  updateSchemas
} from "@/server/domain/resources";
import { serializeResource } from "./serialization";

type Context = { client: SupabaseClient; userId: string };
const singular = { categories: "category", events: "event", goals: "goal", schedules: "schedule" } as const;
const idSchema = z.object({ id: z.uuid().describe("Resource UUID") });

function result(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

function failure(error: unknown) {
  const code = error instanceof DomainError ? error.code : "internal_error";
  const message = error instanceof DomainError ? error.message : "The operation could not be completed.";
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: code, message }) }] };
}

async function safely(work: () => Promise<unknown>) {
  try { return result(await work()); } catch (error) { return failure(error); }
}

function registerResourceTools(server: McpServer, context: Context, resource: ResourceName) {
  const name = singular[resource];
  const listSchema = z.object({
    limit: z.number().int().min(1).max(100).optional().describe("Number of items, default 20"),
    cursor: z.string().optional().describe("Opaque cursor from the previous response"),
    search: z.string().max(120).optional().describe("Case-insensitive title search")
  });

  server.registerTool("list_" + resource, {
    title: "List " + resource,
    description: "List the authenticated user's " + resource + " with cursor pagination.",
    inputSchema: listSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input) => safely(async () => {
    const page = await listResources(context.client, context.userId, resource, {
      limit: input.limit,
      cursor: input.cursor,
      search: resource === "schedules" ? undefined : input.search
    });
    return { items: page.items.map((row) => serializeResource(resource, row)), nextCursor: page.nextCursor };
  }));

  server.registerTool("get_" + name, {
    title: "Get " + name,
    description: "Get one " + name + " owned by the authenticated user.",
    inputSchema: idSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ id }) => safely(async () => serializeResource(resource, await getResource(context.client, context.userId, resource, id))));

  server.registerTool("create_" + name, {
    title: "Create " + name,
    description: "Create a " + name + " for the authenticated user.",
    inputSchema: createSchemas[resource],
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input: unknown) => safely(async () => serializeResource(resource, await createResource(context.client, context.userId, resource, input))));

  server.registerTool("update_" + name, {
    title: "Update " + name,
    description: "Update fields on a " + name + " owned by the authenticated user.",
    inputSchema: z.object({ id: z.uuid(), changes: updateSchemas[resource] }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ id, changes }) => safely(async () => serializeResource(resource, await updateResource(context.client, context.userId, resource, id, changes))));

  server.registerTool("delete_" + name, {
    title: "Delete " + name,
    description: "Permanently delete a " + name + " owned by the authenticated user.",
    inputSchema: idSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  }, ({ id }) => safely(async () => { await deleteResource(context.client, context.userId, resource, id); return { deleted: true, id }; }));
}

export function createLownheurMcpServer(context: Context) {
  const server = new McpServer({ name: "lownheur", version: "1.0.0" });
  for (const resource of resourceNames) registerResourceTools(server, context, resource);

  server.registerTool("get_upcoming_schedule", {
    title: "Get upcoming schedule",
    description: "Return the authenticated user's next scheduled items in chronological order.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional().default(10) }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ limit }) => safely(async () => {
    const { data, error } = await context.client.from("schedules").select("*").eq("user_id", context.userId).eq("status", "scheduled").gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(limit);
    if (error) throw new DomainError("database_error", error.message);
    return { items: (data ?? []).map((row) => serializeResource("schedules", row)) };
  }));

  return server;
}
