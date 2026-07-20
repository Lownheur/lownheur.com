import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createResource,
  createSchemas,
  DomainError,
  getUpcomingScheduleOccurrences,
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
  getResourceMediaMap,
  mcpImageInputSchema,
  MediaError,
  removeResourceMedia,
  uploadResourceMedia,
  type McpImageInput,
  type MediaResource
} from "@/server/media";
import { MCP_OAUTH_SECURITY_SCHEMES } from "./oauth";

type Context = { client: SupabaseClient; userId: string };
const singular = { categories: "category", events: "event", goals: "goal", schedules: "schedule" } as const;
const capabilityDescription = {
  categories: " Categories can be nested to any practical depth with parentCategoryId; never create cycles.",
  events: " Events belong to one category, including a subcategory.",
  goals: " Goals include goalType, targetValue, unit and period so the target is measurable.",
  schedules: " Schedules can be one-time, daily, weekly or monthly; weekly rules use ISO weekdays and recurring rules preserve local time through recurrenceTimezone."
} as const;
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

async function serializeWithMedia(context: Context, resource: MediaResource, row: Awaited<ReturnType<typeof getResource>>) {
  const media = await getResourceMediaMap(context.client, context.userId, resource, [row]);
  return { ...serializeResource(resource, row), images: media[row.id] ?? [] };
}

async function uploadFromMcp(context: Context, resource: MediaResource, resourceId: string, image: McpImageInput) {
  await getResource(context.client, context.userId, resource, resourceId);
  const file = await downloadMcpImage(image);
  await uploadResourceMedia(context.client, context.userId, resource, resourceId, [file]);
  const current = await getResource(context.client, context.userId, resource, resourceId);
  return { ...(await serializeWithMedia(context, resource, current)), imageUploaded: true };
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
    return image && isMediaResource(resource)
      ? { ...(await serializeWithMedia(context, resource, current)), imageUploaded: true }
      : serializeResource(resource, current);
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
  return parsed.image && isMediaResource(resource)
    ? { ...(await serializeWithMedia(context, resource, current)), imageUploaded: true }
    : serializeResource(resource, current);
}

function registerMediaTools(server: McpServer, context: Context, resource: MediaResource) {
  const name = singular[resource];
  const resourceId = name + "Id";
  const uploadName = resource === "categories" ? "set_category_image" : "add_" + name + "_image";
  const uploadVerb = resource === "categories" ? "Set or replace" : "Add";
  const uploadSchema = z.object({
    [resourceId]: z.uuid().describe(name + " UUID"),
    image: mcpImageInputSchema.describe("The real image file supplied by ChatGPT")
  });

  server.registerTool(uploadName, {
    title: uploadVerb + " " + name + " image",
    description: uploadVerb + " an image using the real file supplied by ChatGPT. Use this after the user attaches or generates an image. Never ask for an image URL or storage path.",
    inputSchema: uploadSchema,
    _meta: imageToolMetadata,
    annotations: { readOnlyHint: false, destructiveHint: resource === "categories", idempotentHint: resource === "categories", openWorldHint: false }
  }, (input: Record<string, unknown>) => safely(() => uploadFromMcp(context, resource, String(input[resourceId]), input.image as McpImageInput)));

  server.registerTool("list_" + name + "_images", {
    title: "List " + name + " images",
    description: "List stored images and their asset IDs for a " + name + " owned by the authenticated user.",
    inputSchema: z.object({ [resourceId]: z.uuid().describe(name + " UUID") }),
    _meta: oauthToolMetadata,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, (input: Record<string, unknown>) => safely(async () => {
    const current = await getResource(context.client, context.userId, resource, String(input[resourceId]));
    const media = await getResourceMediaMap(context.client, context.userId, resource, [current]);
    return { images: media[current.id] ?? [] };
  }));

  server.registerTool("remove_" + name + "_image", {
    title: "Remove " + name + " image",
    description: "Remove one stored image from a " + name + " owned by the authenticated user.",
    inputSchema: z.object({
      [resourceId]: z.uuid().describe(name + " UUID"),
      assetId: z.uuid().describe("Image asset UUID returned by list_" + name + "_images")
    }),
    _meta: oauthToolMetadata,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  }, (input: Record<string, unknown>) => safely(async () => {
    const id = String(input[resourceId]);
    await getResource(context.client, context.userId, resource, id);
    await removeResourceMedia(context.client, context.userId, resource, id, String(input.assetId));
    return { deleted: true, assetId: String(input.assetId) };
  }));
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
    description: "List the authenticated user's " + resource + " with cursor pagination." + capabilityDescription[resource],
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
  }, ({ id }) => safely(async () => {
    const current = await getResource(context.client, context.userId, resource, id);
    return isMediaResource(resource) ? serializeWithMedia(context, resource, current) : serializeResource(resource, current);
  }));

  server.registerTool("create_" + name, {
    title: "Create " + name,
    description: "Create a " + name + " for the authenticated user." + capabilityDescription[resource] + (isMediaResource(resource) ? " An optional image must be sent through the image file input, never as a URL or storage path." : ""),
    inputSchema: mcpCreateSchemas[resource],
    _meta: isMediaResource(resource) ? imageToolMetadata : oauthToolMetadata,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
  }, (input: unknown) => safely(() => createFromMcp(context, resource, input)));

  server.registerTool("update_" + name, {
    title: "Update " + name,
    description: "Update a " + name + " owned by the authenticated user." + capabilityDescription[resource] + (isMediaResource(resource) ? " An optional image must be sent through the image file input, never as a URL or storage path." : ""),
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
  const server = new McpServer({ name: "lownheur", version: "1.2.0" });
  for (const resource of resourceNames) registerResourceTools(server, context, resource);
  for (const resource of ["categories", "events", "goals"] as const) registerMediaTools(server, context, resource);

  server.registerTool("get_upcoming_schedule", {
    title: "Get upcoming schedule",
    description: "Return the authenticated user's next schedule occurrences in chronological order. Recurring rules are expanded in their IANA time zone without duplicating schedule records.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(50).optional().default(10),
      from: z.iso.datetime({ offset: true }).optional().describe("Start boundary, defaults to now")
    }),
    _meta: oauthToolMetadata,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
  }, ({ limit, from }) => safely(async () => {
    const occurrences = await getUpcomingScheduleOccurrences(context.client, { limit, from });
    return {
      items: occurrences.map((occurrence) => ({
        scheduleId: occurrence.scheduleId,
        targetType: occurrence.eventId ? "event" : "goal",
        targetId: occurrence.eventId ?? occurrence.goalId,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        recurrence: occurrence.recurrence,
        recurrenceTimezone: occurrence.recurrenceTimezone
      }))
    };
  }));

  return server;
}
