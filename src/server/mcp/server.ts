import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createResource,
  createSchemas,
  DomainError,
  getResource,
  listResources,
  resourceNames,
  type ResourceName,
  updateResource,
  updateSchemas
} from "@/server/domain/resources";
import { serializeResource } from "./serialization";
import {
  deleteResourceAndMedia,
  downloadMcpImage,
  mcpImageInputSchema,
  MediaError,
  uploadResourceMedia,
  type McpImageInput,
  type MediaResource
} from "@/server/media";
import { MCP_OAUTH_SECURITY_SCHEMES } from "./oauth";

type Context = { client: SupabaseClient; userId: string };
const singular = { categories: "category", events: "event", goals: "goal", schedules: "schedule" } as const;
const idSchema = z.object({ id: z.uuid().describe("Resource UUID") });

const oauthToolMetadata = {
  securitySchemes: MCP_OAUTH_SECURITY_SCHEMES
};
const imageToolMetadata = {
  ...oauthToolMetadata,
  "openai/fileParams": ["image"]
};

const mcpCreateSchemas = {
  categories: createSchemas.categories.extend({ image: mcpImageInputSchema.optional() }),
  events: createSchemas.events.extend({ image: mcpImageInputSchema.optional() }),
  goals: createSchemas.goals.extend({ image: mcpImageInputSchema.optional() }),
  schedules: createSchemas.schedules
} as const;

function mediaUpdateSchema(changes: z.ZodType) {
  return z.object({
    id: z.uuid(),
    changes: changes.optional(),
    image: mcpImageInputSchema.optional()
  }).refine((value) => value.changes !== undefined || value.image !== undefined, "Provide changes or an image");
}

const mcpUpdateSchemas = {
  categories: mediaUpdateSchema(updateSchemas.categories),
  events: mediaUpdateSchema(updateSchemas.events),
  goals: mediaUpdateSchema(updateSchemas.goals),
  schedules: z.object({ id: z.uuid(), changes: updateSchemas.schedules })
} as const;

function result(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

function failure(error: unknown) {
  const knownError = error instanceof DomainError || error instanceof MediaError;
  const code = knownError ? error.code : "internal_error";
  const message = knownError ? error.message : "The operation could not be completed.";
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ error: code, message }) }] };
}

async function safely(work: () => Promise<unknown>) {
  try { return result(await work()); } catch (error) { return failure(error); }
}

function isMediaResource(resource: ResourceName): resource is MediaResource {
  return resource !== "schedules";
}

async function createFromMcp(context: Context, resource: ResourceName, input: unknown) {
  const parsed = mcpCreateSchemas[resource].parse(input) as Record<string, unknown>;
  const image = parsed.image as McpImageInput | undefined;
  delete parsed.image;
  const created = await createResource(context.client, context.userId, resource, parsed);
  try {
    if (image && isMediaResource(resource)) {
      const file = await downloadMcpImage(image);
      await uploadResourceMedia(context.client, context.userId, resource, created.id, [file]);
    }
    const current = image ? await getResource(context.client, context.userId, resource, created.id) : created;
    return { ...serializeResource(resource, current), ...(image ? { imageUploaded: true } : {}) };
  } catch (error) {
    try { await deleteResourceAndMedia(context.client, context.userId, resource, created.id); } catch { /* Preserve the media error. */ }
    throw error;
  }
}

async function updateFromMcp(context: Context, resource: ResourceName, input: unknown) {
  const parsed = mcpUpdateSchemas[resource].parse(input) as { id: string; changes?: unknown; image?: McpImageInput };
  let current = parsed.changes === undefined
    ? await getResource(context.client, context.userId, resource, parsed.id)
    : await updateResource(context.client, context.userId, resource, parsed.id, parsed.changes);
  if (parsed.image && isMediaResource(resource)) {
    const file = await downloadMcpImage(parsed.image);
    await uploadResourceMedia(context.client, context.userId, resource, parsed.id, [file]);
    current = await getResource(context.client, context.userId, resource, parsed.id);
  }
  return { ...serializeResource(resource, current), ...(parsed.image ? { imageUploaded: true } : {}) };
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
    _meta: oauthToolMetadata,
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
    _meta: oauthToolMetadata,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ id }) => safely(async () => serializeResource(resource, await getResource(context.client, context.userId, resource, id))));

  server.registerTool("create_" + name, {
    title: "Create " + name,
    description: "Create a " + name + " for the authenticated user." + (isMediaResource(resource) ? " An optional image must be sent through the image file input, never as a URL or storage path." : ""),
    inputSchema: mcpCreateSchemas[resource],
    _meta: isMediaResource(resource) ? imageToolMetadata : oauthToolMetadata,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input: unknown) => safely(() => createFromMcp(context, resource, input)));

  server.registerTool("update_" + name, {
    title: "Update " + name,
    description: "Update a " + name + " owned by the authenticated user." + (isMediaResource(resource) ? " An optional image must be sent through the image file input, never as a URL or storage path." : ""),
    inputSchema: mcpUpdateSchemas[resource],
    _meta: isMediaResource(resource) ? imageToolMetadata : oauthToolMetadata,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input: unknown) => safely(() => updateFromMcp(context, resource, input)));

  server.registerTool("delete_" + name, {
    title: "Delete " + name,
    description: "Permanently delete a " + name + " owned by the authenticated user.",
    inputSchema: idSchema,
    _meta: oauthToolMetadata,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  }, ({ id }) => safely(async () => { await deleteResourceAndMedia(context.client, context.userId, resource, id); return { deleted: true, id }; }));
}

export function createLownheurMcpServer(context: Context) {
  const server = new McpServer({ name: "lownheur", version: "1.0.0" });
  for (const resource of resourceNames) registerResourceTools(server, context, resource);

  server.registerTool("get_upcoming_schedule", {
    title: "Get upcoming schedule",
    description: "Return the authenticated user's next scheduled items in chronological order.",
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).optional().default(10) }),
    _meta: oauthToolMetadata,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ limit }) => safely(async () => {
    const { data, error } = await context.client.from("schedules").select("*").eq("user_id", context.userId).eq("status", "scheduled").gte("starts_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(limit);
    if (error) throw new DomainError("database_error", error.message);
    return { items: (data ?? []).map((row) => serializeResource("schedules", row)) };
  }));

  return server;
}
