import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const title = z.string().trim().min(1).max(120);
const description = z
  .union([z.string().trim().max(5000), z.null()])
  .transform((value) => value === "" ? null : value);
const id = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const nullableId = z.union([id, z.null()]);
const goalType = z.enum(["target", "frequency", "completion"]);
const goalPeriod = z.enum(["once", "day", "week", "month"]);
const targetValue = z.coerce.number().finite().min(0).max(9_999_999_999.9999);
const unit = z.string().trim().min(1).max(40);
const recurrence = z.enum(["none", "daily", "weekly", "monthly"]);
const recurrenceInterval = z.coerce.number().int().min(1).max(365);
const recurrenceWeekdays = z
  .array(z.coerce.number().int().min(1).max(7))
  .max(7)
  .transform((values) => [...new Set(values)].sort((left, right) => left - right));

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

const recurrenceTimezone = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine(isTimeZone, "Invalid IANA time zone");

function validateSchedule(value: {
  startsAt: string;
  endsAt?: string | null;
  recurrence: z.infer<typeof recurrence>;
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceEndsAt?: string | null;
}) {
  if (value.endsAt && value.endsAt <= value.startsAt) return false;
  if (value.recurrenceEndsAt && value.recurrenceEndsAt <= value.startsAt) return false;
  if (value.recurrence === "none") {
    return value.recurrenceInterval === 1
      && value.recurrenceWeekdays.length === 0
      && !value.recurrenceEndsAt;
  }
  if (value.recurrence === "weekly") return value.recurrenceWeekdays.length > 0;
  return value.recurrenceWeekdays.length === 0;
}

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
    description: description.optional().default(null),
    parentCategoryId: nullableId.optional().default(null).describe("Optional parent category UUID. Use this to create a subcategory.")
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
      .default("todo"),
    goalType: goalType.optional().default("completion").describe("How the goal is measured: numeric target, recurring frequency, or one-time completion"),
    targetValue: targetValue.optional().default(1).describe("Numeric value to reach, including zero"),
    unit: unit.optional().default("success").describe("Unit such as kcal, grams, sessions, repetitions, minutes, cigarettes or success"),
    period: goalPeriod.optional().default("once").describe("Measurement period")
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
        .default("scheduled"),
      recurrence: recurrence.optional().default("none").describe("Optional recurrence rule"),
      recurrenceInterval: recurrenceInterval.optional().default(1).describe("Repeat every N days, weeks or months"),
      recurrenceWeekdays: recurrenceWeekdays.optional().default([]).describe("ISO weekdays for a weekly rule: Monday=1 through Sunday=7"),
      recurrenceEndsAt: timestamp.nullable().optional().default(null).describe("Optional final occurrence boundary"),
      recurrenceTimezone: recurrenceTimezone.optional().describe("IANA time zone used to preserve local time across daylight-saving changes; defaults to the account time zone")
    })
    .refine(validateSchedule, { message: "Invalid schedule dates or recurrence rule" })
} as const;

export const updateSchemas = {
  categories: z
    .object({
      title: title.optional(),
      description: description.optional(),
      parentCategoryId: nullableId.optional()
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
      status: z.enum(["todo", "in_progress", "achieved", "abandoned"]).optional(),
      goalType: goalType.optional(),
      targetValue: targetValue.optional(),
      unit: unit.optional(),
      period: goalPeriod.optional()
    })
    .refine((value) => Object.keys(value).length > 0, "No fields to update"),
  schedules: z
    .object({
      targetType: z.enum(["event", "goal"]).optional(),
      targetId: id.optional(),
      startsAt: timestamp.optional(),
      endsAt: timestamp.nullable().optional(),
      status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
      recurrence: recurrence.optional(),
      recurrenceInterval: recurrenceInterval.optional(),
      recurrenceWeekdays: recurrenceWeekdays.optional(),
      recurrenceEndsAt: timestamp.nullable().optional(),
      recurrenceTimezone: recurrenceTimezone.optional()
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
      | "category_has_children"
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
        : {}),
      ...(input.parentCategoryId !== undefined
        ? { parent_id: input.parentCategoryId }
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
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.goalType !== undefined ? { goal_type: input.goalType } : {}),
      ...(input.targetValue !== undefined ? { target_value: input.targetValue } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.period !== undefined ? { period: input.period } : {})
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
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.recurrence !== undefined ? { recurrence: input.recurrence } : {}),
    ...(input.recurrenceInterval !== undefined
      ? { recurrence_interval: input.recurrenceInterval }
      : {}),
    ...(input.recurrenceWeekdays !== undefined
      ? { recurrence_weekdays: input.recurrenceWeekdays }
      : {}),
    ...(input.recurrenceEndsAt !== undefined
      ? { recurrence_ends_at: input.recurrenceEndsAt }
      : {}),
    ...(input.recurrenceTimezone !== undefined
      ? { recurrence_timezone: input.recurrenceTimezone }
      : {})
  };
}

function scheduleInputFromRecord(row: ResourceRecord) {
  return {
    targetType: row.event_id ? "event" : "goal",
    targetId: row.event_id ?? row.goal_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    recurrence: row.recurrence,
    recurrenceInterval: row.recurrence_interval,
    recurrenceWeekdays: row.recurrence_weekdays,
    recurrenceEndsAt: row.recurrence_ends_at,
    recurrenceTimezone: row.recurrence_timezone
  };
}

function normalizeScheduleChanges(input: Record<string, unknown>) {
  if (input.recurrence === "none") {
    return {
      ...input,
      recurrenceInterval: 1,
      recurrenceWeekdays: [],
      recurrenceEndsAt: null
    };
  }
  if (input.recurrence === "daily" || input.recurrence === "monthly") {
    return { ...input, recurrenceWeekdays: [] };
  }
  return input;
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
  let parsed = parseCreateInput(resource, input);
  if (resource === "schedules" && parsed.recurrence !== "none" && parsed.recurrenceTimezone === undefined) {
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    mapError(profileError);
    parsed = { ...parsed, recurrenceTimezone: profile?.timezone ?? "UTC" };
  }
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
  let parsed = parseUpdateInput(resource, input);
  if (resource === "schedules") {
    const current = await getResource(client, userId, resource, validId.data);
    parsed = normalizeScheduleChanges(parsed);
    parseCreateInput(resource, {
      ...scheduleInputFromRecord(current),
      ...parsed
    });
  }

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

export type CategoryOption = {
  id: string;
  title: string;
  parentId: string | null;
  path: string;
  depth: number;
};

export function buildCategoryOptions(rows: ResourceRecord[]): CategoryOption[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const children = new Map<string | null, ResourceRecord[]>();
  for (const row of rows) {
    const rawParent = typeof row.parent_id === "string" ? row.parent_id : null;
    const parentId = rawParent && byId.has(rawParent) ? rawParent : null;
    const siblings = children.get(parentId) ?? [];
    siblings.push(row);
    children.set(parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((left, right) => String(left.title).localeCompare(String(right.title)));
  }

  const result: CategoryOption[] = [];
  const visited = new Set<string>();
  const visit = (row: ResourceRecord, ancestors: string[]) => {
    if (visited.has(row.id)) return;
    visited.add(row.id);
    const title = String(row.title);
    const path = [...ancestors, title];
    result.push({
      id: row.id,
      title,
      parentId: typeof row.parent_id === "string" ? row.parent_id : null,
      path: path.join(" › "),
      depth: ancestors.length
    });
    for (const child of children.get(row.id) ?? []) visit(child, path);
  };

  for (const root of children.get(null) ?? []) visit(root, []);
  for (const row of rows) visit(row, []);
  return result;
}

export function categoryDescendantIds(categories: CategoryOption[], categoryId: string) {
  const descendants = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && descendants.has(category.parentId) && !descendants.has(category.id)) {
        descendants.add(category.id);
        changed = true;
      }
    }
  }
  return descendants;
}

export type ScheduleOccurrence = {
  scheduleId: string;
  eventId: string | null;
  goalId: string | null;
  startsAt: string;
  endsAt: string | null;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrenceTimezone: string;
};

export async function getUpcomingScheduleOccurrences(
  client: SupabaseClient,
  options: { limit?: number; from?: string } = {}
): Promise<ScheduleOccurrence[]> {
  const limit = z.number().int().min(1).max(50).parse(options.limit ?? 10);
  const from = timestamp.parse(options.from ?? new Date().toISOString());
  const { data, error } = await client.rpc("get_upcoming_schedule_occurrences", {
    p_limit: limit,
    p_from: from
  });
  mapError(error);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    scheduleId: String(row.schedule_id),
    eventId: typeof row.event_id === "string" ? row.event_id : null,
    goalId: typeof row.goal_id === "string" ? row.goal_id : null,
    startsAt: String(row.occurrence_starts_at),
    endsAt: typeof row.occurrence_ends_at === "string" ? row.occurrence_ends_at : null,
    recurrence: recurrence.parse(row.recurrence),
    recurrenceTimezone: String(row.recurrence_timezone)
  }));
}

export async function deleteResource(
  client: SupabaseClient,
  userId: string,
  resource: ResourceName,
  resourceId: string
): Promise<void> {
  const validId = id.safeParse(resourceId);
  if (!validId.success) throw new DomainError("invalid_input", "Invalid id.");

  if (resource === "categories") {
    const { data: child, error: childError } = await client
      .from("categories")
      .select("id")
      .eq("user_id", userId)
      .eq("parent_id", validId.data)
      .limit(1)
      .maybeSingle();
    mapError(childError);
    if (child) {
      throw new DomainError("category_has_children", "Move or delete the subcategories before deleting their parent.");
    }
  }

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
