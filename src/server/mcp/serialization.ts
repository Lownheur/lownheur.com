import type { ResourceName, ResourceRecord } from "@/server/domain/resources";

export function serializeResource(resource: ResourceName, row: ResourceRecord) {
  const base = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
  if (resource === "categories") {
    return { ...base, title: row.title, description: row.description, hasImage: Boolean(row.image_path) };
  }
  if (resource === "events") {
    return { ...base, categoryId: row.category_id, title: row.title, description: row.description };
  }
  if (resource === "goals") {
    return { ...base, categoryId: row.category_id, title: row.title, description: row.description, status: row.status };
  }
  return {
    ...base,
    targetType: row.event_id ? "event" : "goal",
    targetId: row.event_id ?? row.goal_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status
  };
}
