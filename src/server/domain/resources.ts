import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const title = z.string().trim().min(1).max(120);
const description = z
  .union([z.string().trim().max(5000), z.null()])
  .transform((value) => value === "" ? null : value);
const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });

export const resourceNames = [
  "categories",
  "events",
  "goals",
  "schedules"
] as const;

export type ResourceName = (typeof resourceNames)[number];

export const createSchemas = {
  categories: z.object({
    title,
    description: description.optional().default(null)
  }),
  events: z.object({
    categoryId: id,
    title,
    description: description.optional().default(null)
  }),
  goals: z.object({
    categoryId: id,
    title,
    description: description.optional().default(null),
    status: z
      .enum(["todo", "in_progress", "achieved", "abandoned"])
      .optional()
      .default("todo")
  }),
  schedules: z
    .object({
      targetType: z.enum(["event", "goal"]),
      targetId: id,
      startsAt: timestamp,
      endsAt: timestamp.nullable().optional().default(null),
      status: z
        .enum(["scheduled", "completed", "cancelled"])
        .optional()
        .default("scheduled")
    })
    .refine(
      (value) => !value.endsAt || value.endsAt > value.startsAt,
      { message: "endsAt must be after startsAt", path: ["endsAt"] }
    )
} as const;

export const updateSchemas = {
  categories: z
    .object({
      title: title.optional(),
      description: description.optional()
    })
    .refine((value) => Object.keys(value).length > 0, "No fields to update"),
  events: z
    .object({
      categoryId: id.optional(),
      title: title.optional(),
      description: description.optional()
    })
    .refine((value) => Object.keys(value).length > 0, "No fields to update"),
  goals: z
    .object({
      categoryId: id.optional(),
      title: title.optional(),
      description: description.optional(),
      status: z.enum(["todo", "in_progress", "achieved", "abandoned"]).optional()
    })
    .refine((value) => Object.keys(value).length > 0, "No fields to update"),
  schedules: z
    .object({
      targetType: z.enum(["event", "goal"]).optional(),
      targetId: id.optional(),
      startsAt: timestamp.optional(),
      endsAt: timestamp.nullable().optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).optional()
    })
    .refine(
      (value) =>
        (value.targetType === undefined && value.targetId === undefined) ||
        (value.targetType !== undefined && value.targetId !== undefined),
      "targetType and targetId must be provided together"
    )
    .refine((value) => Object.keys(value).length > 0, "No fields to update")
} as const;

export type ResourceRecord = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

export type ResourcePage = {
  items: ResourceRecord[];
  nextCursor: string | null;
};

export class DomainError extends Error {
  constructor(
    public readonly code:
      | "invalid_input"
      | "not_found"
      | "conflict"
      | "database_error",
    message: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}

function mapError(error: { code?: string; message: string } | null) {
  if (!error) return;
  if (error.code === "23505") {
    throw new DomainError("conflict", "A resource with these values already exists.");
  }
  if (error.code === "23503" || error.code === "23514") {
    throw new DomainError("invalid_input", "The resource references invalid data.");
  }
  throw new DomainError("database_error", error.message);
}

function encodeCursor(row: ResourceRecord) {
  return Buffer.from(
    JSON.stringify({ createdAt: row.created_at, id: row.id }),
    "utf8"
  ).toString("base64url");
}

function decodeCursor(cursor: string) {
  try {
    return z
      .object({ createdAt: timestamp, id })
      .parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
  } catch {
    throw new DomainError("invalid_input", "Invalid pagination cursor.");
  }
}

function toDatabaseInput(
  resource: ResourceName,
  input: Record<string, unknown>
) {
  if (resource === "categories") {
    return {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {})
    };
  }
  if (resource === "events") {
    return {
      ...(input.categoryId !== undefined
        ? { category_id: input.categoryId }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {})
    };
  }
  if (resource === "goals") {
    return {
      ...(input.categoryId !== undefined
        ? { category_id: input.categoryId }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {})
    };
  }

  const target =
    input.targetType !== undefined && input.targetId !== undefined
      ? input.targetType === "event"
        ? { event_id: input.targetId, goal_id: null }
        : { event_id: null, goal_id: input.targetId }
      : {};

  return {
    ...target,
    ...(input.startsAt !== undefined ? { starts_at: input.startsAt } : {}),
    ...(input.endsAt !== undefined ? { ends_at: input.endsAt } : {}),
    ...(input.status !== undefined ? { status: input.status } : {})
  };
}

export function parseCreateInput(
  resource: ResourceName,
  input: unknown
): Record<string, unknown> {
  const result = createSchemas[resource].safeParse(input);
  if (!result.success) {
    throw new DomainError("invalid_input", result.error.issues[0]?.message ?? "Invalid input.");
  }
  return result.data as Record<string, unknown>;
}

export function parseUpdateInput(
  resource: ResourceName,
  input: unknown
): Record<string, unknown> {
  const result = updateSchemas[resource].safeParse(input);
  if (!result.success) {
    throw new DomainError("invalid_input", result.error.issues[0]?.message ?? "Invalid input.");
  }
  return result.data as Record<string, unknown>;
}

export async function listResources(
  client: SupabaseClient,
  userId: string,
  resource: ResourceName,
  options: { limit?: number; cursor?: string; search?: string } = {}
): Promise<ResourcePage> {
  const limit = z.number().int().min(1).max(100).parse(options.limit ?? 20);
  let query = client
    .from(resource)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    const cursor = decodeCursor(options.cursor);
    query = query.or(
      "created_at.lt." +
        cursor.createdAt +
        ",and(created_at.eq." +
        cursor.createdAt +
        ",id.lt." +
        cursor.id +
        ")"
    );
  }

  if (options.search?.trim()) {
    const safeSearch = options.search.trim().slice(0, 120);
    query = query.ilike("title", "%" + safeSearch + "%");
  }

  const { data, error } = await query;
  mapError(error);
  const rows = (data ?? []) as ResourceRecord[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    nextCursor: hasMore ? encodeCursor(items[items.length - 1]) : null
  };
}

export async function getResource(
  client: SupabaseClient,
  userId: string,
  resource: ResourceName,
  resourceId: string
): Promise<ResourceRecord> {
  const validId = id.safeParse(resourceId);
  if (!validId.success) throw new DomainError("invalid_input", "Invalid id.");

  const { data, error } = await client
    .from(resource)
    .select("*")
    .eq("user_id", userId)
    .eq("id", validId.data)
    .maybeSingle();

  mapError(error);
  if (!data) throw new DomainError("not_found", "Resource not found.");
  return data as ResourceRecord;
}

export async function createResource(
  client: SupabaseClient,
  userId: string,
  resource: ResourceName,
  input: unknown
): Promise<ResourceRecord> {
  const parsed = parseCreateInput(resource, input);
  const { data, error } = await client
    .from(resource)
    .insert({ user_id: userId, ...toDatabaseInput(resource, parsed) })
    .select("*")
    .single();

  mapError(error);
  return data as ResourceRecord;
}

export async function updateResource(
  client: SupabaseClient,
  userId: string,
  resource: ResourceName,
  resourceId: string,
  input: unknown
): Promise<ResourceRecord> {
  const validId = id.safeParse(resourceId);
  if (!validId.success) throw new DomainError("invalid_input", "Invalid id.");
  const parsed = parseUpdateInput(resource, input);

  const { data, error } = await client
    .from(resource)
    .update(toDatabaseInput(resource, parsed))
    .eq("user_id", userId)
    .eq("id", validId.data)
    .select("*")
    .maybeSingle();

  mapError(error);
  if (!data) throw new DomainError("not_found", "Resource not found.");
  return data as ResourceRecord;
}

export async function deleteResource(
  client: SupabaseClient,
  userId: string,
  resource: ResourceName,
  resourceId: string
): Promise<void> {
  const validId = id.safeParse(resourceId);
  if (!validId.success) throw new DomainError("invalid_input", "Invalid id.");

  const { data, error } = await client
    .from(resource)
    .delete()
    .eq("user_id", userId)
    .eq("id", validId.data)
    .select("id")
    .maybeSingle();

  mapError(error);
  if (!data) throw new DomainError("not_found", "Resource not found.");
}
