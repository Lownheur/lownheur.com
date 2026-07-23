import type { SupabaseClient } from "@supabase/supabase-js";
import { isIP } from "node:net";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deleteResource, type ResourceName, type ResourceRecord } from "@/server/domain/resources";

const BUCKET = "user-media";
const MAX_FILE_BYTES = 10_485_760;
const MAX_FILES_PER_REQUEST = 5;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export const mcpImageInputSchema = z.object({
  download_url: z.url().max(4096).describe("Temporary HTTPS download URL supplied by the chat client"),
  file_id: z.string().trim().min(1).max(300).describe("File identifier supplied by the chat client"),
  mime_type: z.string().trim().max(100).optional(),
  file_name: z.string().trim().max(300).optional()
});

export type McpImageInput = z.infer<typeof mcpImageInputSchema>;
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type MediaResource = "categories" | "events" | "goals";
export type MediaView = { id: string; url: string; alt: string };
type Asset = { id: string; storage_path: string; byte_size: number; alt_text: string | null };

export class MediaError extends Error {
  constructor(public readonly code: "invalid_media" | "storage_quota" | "media_failed", message: string) {
    super(message);
    this.name = "MediaError";
  }
}

export function validateImageFiles(files: File[]) {
  if (files.length > MAX_FILES_PER_REQUEST) throw new MediaError("invalid_media", "A maximum of five images can be uploaded at once.");
  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
      throw new MediaError("invalid_media", "Images must be JPEG, PNG, WebP or AVIF and at most 10 MB.");
    }
  }
  return files;
}

export function readImageFiles(formData: FormData, name = "images") {
  return validateImageFiles(
    formData.getAll(name).filter((value): value is File => value instanceof File && value.size > 0)
  );
}

function validateRemoteUrl(value: string) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new MediaError("invalid_media", "The image download URL must use HTTPS.");
  }
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new MediaError("invalid_media", "The image download host is not allowed.");
  }
  if (isIP(hostname) === 4) {
    const [a, b] = hostname.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
      throw new MediaError("invalid_media", "The image download host is not allowed.");
    }
  }
  if (isIP(hostname) === 6 && (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe8") || hostname.startsWith("fe9") || hostname.startsWith("fea") || hostname.startsWith("feb"))) {
    throw new MediaError("invalid_media", "The image download host is not allowed.");
  }
  return url;
}

async function readLimitedBody(response: Response) {
  const advertisedSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(advertisedSize) && advertisedSize > MAX_FILE_BYTES) {
    throw new MediaError("invalid_media", "Images must be at most 10 MB.");
  }
  if (!response.body) return new Uint8Array(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FILE_BYTES) {
      await reader.cancel();
      throw new MediaError("invalid_media", "Images must be at most 10 MB.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function hasImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (mimeType === "image/webp") return bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (mimeType === "image/avif") {
    const marker = new TextDecoder().decode(bytes.slice(4, 16));
    return marker.startsWith("ftyp") && (marker.includes("avif") || marker.includes("avis"));
  }
  return false;
}

export async function downloadMcpImage(input: McpImageInput, fetcher: Fetcher = fetch) {
  const parsed = mcpImageInputSchema.parse(input);
  let url = validateRemoteUrl(parsed.download_url);
  let response: Response | null = null;
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    response = await fetcher(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "Lownheur-MCP/1.0" }
    });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location || redirects === 3) throw new MediaError("media_failed", "The image download redirected too many times.");
    url = validateRemoteUrl(new URL(location, url).toString());
  }
  if (!response?.ok) throw new MediaError("media_failed", "The image supplied by the chat client could not be downloaded.");
  const responseType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  const declaredType = parsed.mime_type?.split(";", 1)[0]?.trim().toLowerCase();
  const mimeType = responseType && responseType !== "application/octet-stream" ? responseType : declaredType;
  if (!mimeType || !ALLOWED_TYPES.has(mimeType)) throw new MediaError("invalid_media", "Images must be JPEG, PNG, WebP or AVIF.");
  const bytes = await readLimitedBody(response);
  if (!hasImageSignature(bytes, mimeType)) throw new MediaError("invalid_media", "The downloaded file is not a valid supported image.");
  const fallbackName = "image." + extensions[mimeType];
  const fileName = (parsed.file_name || fallbackName).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 300) || fallbackName;
  return validateImageFiles([new File([bytes], fileName, { type: mimeType })])[0];
}

async function reserveBytes(userId: string, bytes: number) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("reserve_storage_bytes_admin", { p_user_id: userId, p_bytes: bytes });
  if (error) throw new MediaError("media_failed", "Storage quota could not be checked.");
  const result = data?.[0] as { allowed?: boolean } | undefined;
  if (!result?.allowed) throw new MediaError("storage_quota", "Storage quota reached.");
}

async function releaseBytes(userId: string, bytes: number) {
  if (bytes <= 0) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.rpc("release_storage_bytes_admin", { p_user_id: userId, p_bytes: bytes });
  if (error) throw new MediaError("media_failed", "Storage quota could not be reconciled.");
}

async function uploadTrackedFiles(client: SupabaseClient, userId: string, files: File[]): Promise<Asset[]> {
  if (!files.length) return [];
  const total = files.reduce((sum, file) => sum + file.size, 0);
  await reserveBytes(userId, total);
  const admin = createSupabaseAdminClient();
  const paths: string[] = [];
  try {
    for (const file of files) {
      const path = userId + "/" + crypto.randomUUID() + "." + extensions[file.type];
      const { error } = await admin.storage.from(BUCKET).upload(path, await file.arrayBuffer(), { contentType: file.type, cacheControl: "3600", upsert: false });
      if (error) throw error;
      paths.push(path);
    }
    const records = files.map((file, index) => ({ user_id: userId, storage_path: paths[index], mime_type: file.type, byte_size: file.size, alt_text: file.name.slice(0, 300) || null }));
    const { data, error } = await client.from("media_assets").insert(records).select("id,storage_path,byte_size,alt_text");
    if (error || !data || data.length !== files.length) throw error ?? new Error("Media metadata insert failed.");
    return data as Asset[];
  } catch (error) {
    if (paths.length) await admin.storage.from(BUCKET).remove(paths);
    if (paths.length) await client.from("media_assets").delete().eq("user_id", userId).in("storage_path", paths);
    await releaseBytes(userId, total);
    throw new MediaError("media_failed", error instanceof Error ? error.message : "Media upload failed.");
  }
}

async function removeAssets(client: SupabaseClient, userId: string, assets: Asset[]) {
  if (!assets.length) return;
  const admin = createSupabaseAdminClient();
  const { error: storageError } = await admin.storage.from(BUCKET).remove(assets.map((asset) => asset.storage_path));
  if (storageError) throw new MediaError("media_failed", "Stored images could not be removed.");
  const { error: metadataError } = await client.from("media_assets").delete().eq("user_id", userId).in("id", assets.map((asset) => asset.id));
  if (metadataError) throw new MediaError("media_failed", "Image metadata could not be removed.");
  await releaseBytes(userId, assets.reduce((sum, asset) => sum + Number(asset.byte_size), 0));
}

async function assetsByPaths(client: SupabaseClient, userId: string, paths: string[]) {
  if (!paths.length) return [] as Asset[];
  const { data, error } = await client.from("media_assets").select("id,storage_path,byte_size,alt_text").eq("user_id", userId).in("storage_path", paths);
  if (error) throw new MediaError("media_failed", error.message);
  return (data ?? []) as Asset[];
}

export async function uploadResourceMedia(client: SupabaseClient, userId: string, resource: MediaResource, resourceId: string, files: File[]) {
  if (!files.length) return;
  if (resource === "categories" && files.length !== 1) throw new MediaError("invalid_media", "A category accepts one image.");
  if (resource !== "categories") {
    const linkTable = resource === "events" ? "event_media" : "goal_media";
    const ownerColumn = resource === "events" ? "event_id" : "goal_id";
    const { count, error } = await client.from(linkTable).select("asset_id", { count: "exact", head: true }).eq("user_id", userId).eq(ownerColumn, resourceId);
    if (error) throw new MediaError("media_failed", error.message);
    if ((count ?? 0) + files.length > 20) throw new MediaError("invalid_media", "A resource accepts at most twenty images.");
  }

  const assets = await uploadTrackedFiles(client, userId, files);
  let replacedAssets: Asset[] = [];
  try {
    if (resource === "categories") {
      const { data: category, error: readError } = await client.from("categories").select("image_path").eq("user_id", userId).eq("id", resourceId).single();
      if (readError) throw readError;
      const { error } = await client.from("categories").update({ image_path: assets[0].storage_path }).eq("user_id", userId).eq("id", resourceId);
      if (error) throw error;
      if (category.image_path) replacedAssets = await assetsByPaths(client, userId, [category.image_path]);
    } else {
      const linkTable = resource === "events" ? "event_media" : "goal_media";
      const ownerColumn = resource === "events" ? "event_id" : "goal_id";
      const { count } = await client.from(linkTable).select("asset_id", { count: "exact", head: true }).eq("user_id", userId).eq(ownerColumn, resourceId);
      const { error } = await client.from(linkTable).insert(assets.map((asset, index) => ({ [ownerColumn]: resourceId, asset_id: asset.id, user_id: userId, position: (count ?? 0) + index })));
      if (error) throw error;
    }
  } catch (error) {
    await removeAssets(client, userId, assets);
    throw new MediaError("media_failed", error instanceof Error ? error.message : "Media link failed.");
  }
  await removeAssets(client, userId, replacedAssets);
}

export async function uploadAvatar(client: SupabaseClient, userId: string, file: File) {
  const assets = await uploadTrackedFiles(client, userId, [file]);
  let replacedAssets: Asset[] = [];
  try {
    const { data: profile, error: readError } = await client.from("profiles").select("avatar_path").eq("user_id", userId).single();
    if (readError) throw readError;
    const { error } = await client.from("profiles").update({ avatar_path: assets[0].storage_path }).eq("user_id", userId);
    if (error) throw error;
    if (profile.avatar_path) replacedAssets = await assetsByPaths(client, userId, [profile.avatar_path]);
  } catch (error) {
    await removeAssets(client, userId, assets);
    throw new MediaError("media_failed", error instanceof Error ? error.message : "Avatar upload failed.");
  }
  await removeAssets(client, userId, replacedAssets);
}

async function linkedAssetIds(client: SupabaseClient, userId: string, table: "event_media" | "goal_media", column: "event_id" | "goal_id", ids: string[]) {
  if (!ids.length) return [] as string[];
  const { data, error } = await client.from(table).select("asset_id").eq("user_id", userId).in(column, ids);
  if (error) throw new MediaError("media_failed", error.message);
  return (data ?? []).map((row) => String(row.asset_id));
}

async function collectResourceAssets(client: SupabaseClient, userId: string, resource: ResourceName, resourceId: string) {
  const assetIds: string[] = [];
  const directPaths: string[] = [];
  if (resource === "categories") {
    const [{ data: category }, { data: events }, { data: goals }] = await Promise.all([
      client.from("categories").select("image_path").eq("user_id", userId).eq("id", resourceId).maybeSingle(),
      client.from("events").select("id").eq("user_id", userId).eq("category_id", resourceId),
      client.from("goals").select("id").eq("user_id", userId).eq("category_id", resourceId)
    ]);
    if (category?.image_path) directPaths.push(category.image_path);
    assetIds.push(...await linkedAssetIds(client, userId, "event_media", "event_id", (events ?? []).map((row) => row.id)));
    assetIds.push(...await linkedAssetIds(client, userId, "goal_media", "goal_id", (goals ?? []).map((row) => row.id)));
  } else if (resource === "events") {
    assetIds.push(...await linkedAssetIds(client, userId, "event_media", "event_id", [resourceId]));
  } else if (resource === "goals") {
    assetIds.push(...await linkedAssetIds(client, userId, "goal_media", "goal_id", [resourceId]));
  }
  let assets: Asset[] = [];
  if (assetIds.length) {
    const { data, error } = await client.from("media_assets").select("id,storage_path,byte_size,alt_text").eq("user_id", userId).in("id", assetIds);
    if (error) throw new MediaError("media_failed", error.message);
    assets = (data ?? []) as Asset[];
  }
  assets.push(...await assetsByPaths(client, userId, directPaths));
  return Array.from(new Map(assets.map((asset) => [asset.id, asset])).values());
}

export async function deleteResourceAndMedia(client: SupabaseClient, userId: string, resource: ResourceName, resourceId: string) {
  const assets = await collectResourceAssets(client, userId, resource, resourceId);
  await deleteResource(client, userId, resource, resourceId);
  await removeAssets(client, userId, assets);
}

export async function removeResourceMedia(client: SupabaseClient, userId: string, resource: MediaResource, resourceId: string, assetId: string) {
  const { data, error } = await client.from("media_assets").select("id,storage_path,byte_size,alt_text").eq("user_id", userId).eq("id", assetId).maybeSingle();
  if (error || !data) throw new MediaError("media_failed", error?.message ?? "Image not found.");
  const asset = data as Asset;
  if (resource === "categories") {
    const { data: category } = await client.from("categories").select("image_path").eq("user_id", userId).eq("id", resourceId).maybeSingle();
    if (category?.image_path !== asset.storage_path) throw new MediaError("media_failed", "Image does not belong to this category.");
    const { error: updateError } = await client.from("categories").update({ image_path: null }).eq("user_id", userId).eq("id", resourceId);
    if (updateError) throw new MediaError("media_failed", updateError.message);
  } else {
    const table = resource === "events" ? "event_media" : "goal_media";
    const column = resource === "events" ? "event_id" : "goal_id";
    const { data: link, error: linkError } = await client.from(table).delete().eq("user_id", userId).eq(column, resourceId).eq("asset_id", assetId).select("asset_id").maybeSingle();
    if (linkError || !link) throw new MediaError("media_failed", linkError?.message ?? "Image link not found.");
  }
  await removeAssets(client, userId, [asset]);
}

async function getScheduleMediaMap(client: SupabaseClient, userId: string, items: ResourceRecord[]) {
  const result: Record<string, MediaView[]> = {};
  const schedulesByTarget = new Map<string, string[]>();
  for (const item of items) {
    const target = typeof item.event_id === "string" ? item.event_id : null;
    if (target) {
      const scheduleIds = schedulesByTarget.get(target) ?? [];
      scheduleIds.push(item.id);
      schedulesByTarget.set(target, scheduleIds);
    }
  }

  const eventIds = [...schedulesByTarget.keys()];
  const { data: eventLinks } = eventIds.length
    ? await client.from("event_media").select("event_id,asset_id,position").eq("user_id", userId).in("event_id", eventIds).order("position")
    : { data: [] };

  const assetByTarget = new Map<string, string>();
  for (const link of eventLinks ?? []) if (!assetByTarget.has(String(link.event_id))) assetByTarget.set(String(link.event_id), String(link.asset_id));
  const assetIds = [...new Set(assetByTarget.values())];
  if (!assetIds.length) return result;

  const { data: assets } = await client.from("media_assets").select("id,storage_path,alt_text").eq("user_id", userId).in("id", assetIds);
  const assetsById = new Map((assets ?? []).map((asset) => [String(asset.id), asset]));
  const paths = [...new Set((assets ?? []).map((asset) => String(asset.storage_path)))];
  const { data: signed } = await client.storage.from(BUCKET).createSignedUrls(paths, 600);
  const urlByPath = new Map((signed ?? []).filter((entry) => entry.path && entry.signedUrl).map((entry) => [String(entry.path), String(entry.signedUrl)]));

  for (const [target, assetId] of assetByTarget) {
    const asset = assetsById.get(assetId);
    if (!asset) continue;
    const url = urlByPath.get(String(asset.storage_path));
    if (!url) continue;
    for (const scheduleId of schedulesByTarget.get(target) ?? []) {
      result[scheduleId] = [{ id: assetId, url, alt: String(asset.alt_text ?? "") }];
    }
  }
  return result;
}

export async function getResourceMediaMap(client: SupabaseClient, userId: string, resource: ResourceName, items: ResourceRecord[]) {
  const result: Record<string, MediaView[]> = {};
  if (!items.length) return result;
  if (resource === "schedules") return getScheduleMediaMap(client, userId, items);
  const ownership = new Map<string, string>();
  const pathsById = new Map<string, { path: string; alt: string }>();
  if (resource === "categories") {
    for (const item of items) if (typeof item.image_path === "string") {
      ownership.set(item.image_path, item.id);
      pathsById.set(item.image_path, { path: item.image_path, alt: String(item.title ?? "") });
    }
  } else {
    const table = resource === "events" ? "event_media" : "goal_media";
    const column = resource === "events" ? "event_id" : "goal_id";
    const ids = items.map((item) => item.id);
    const { data: links } = await client.from(table).select(column + ",asset_id").eq("user_id", userId).in(column, ids).order("position");
    const linkRows = (links ?? []) as unknown as Array<Record<string, unknown>>;
    const assetIds = linkRows.map((row) => String(row.asset_id));
    if (assetIds.length) {
      const { data: assets } = await client.from("media_assets").select("id,storage_path,alt_text").eq("user_id", userId).in("id", assetIds);
      const byId = new Map((assets ?? []).map((asset) => [String(asset.id), asset]));
      for (const link of linkRows) {
        const asset = byId.get(String(link.asset_id));
        const owner = String(link[column]);
        if (asset) {
          ownership.set(String(asset.storage_path), owner);
          pathsById.set(String(asset.storage_path), { path: String(asset.storage_path), alt: String(asset.alt_text ?? "") });
        }
      }
    }
  }
  const paths = [...pathsById.keys()];
  if (!paths.length) return result;
  const [signedResponse, trackedAssets] = await Promise.all([
    client.storage.from(BUCKET).createSignedUrls(paths, 600),
    assetsByPaths(client, userId, paths)
  ]);
  const assetsByPath = new Map(
    trackedAssets.map((asset) => [asset.storage_path, asset])
  );
  for (const signed of signedResponse.data ?? []) {
    if (!signed.path || !signed.signedUrl) continue;
    const owner = ownership.get(signed.path);
    const meta = pathsById.get(signed.path);
    if (!owner || !meta) continue;
    const asset = assetsByPath.get(signed.path);
    if (!asset) continue;
    (result[owner] ??= []).push({ id: asset.id, url: signed.signedUrl, alt: meta.alt });
  }
  return result;
}

export async function removeAvatar(client: SupabaseClient, userId: string) {
  const { data: profile, error } = await client.from("profiles").select("avatar_path").eq("user_id", userId).single();
  if (error) throw new MediaError("media_failed", error.message);
  if (!profile.avatar_path) return;
  const assets = await assetsByPaths(client, userId, [profile.avatar_path]);
  const { error: updateError } = await client.from("profiles").update({ avatar_path: null }).eq("user_id", userId);
  if (updateError) throw new MediaError("media_failed", updateError.message);
  await removeAssets(client, userId, assets);
}

export async function deleteAllUserMedia(userId: string) {
  const admin = createSupabaseAdminClient();
  const paths: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(BUCKET).list(userId, { limit: 1000, offset });
    if (error) throw new MediaError("media_failed", "Account media could not be listed.");
    const batch = (data ?? []).filter((entry) => entry.id).map((entry) => userId + "/" + entry.name);
    paths.push(...batch);
    if ((data ?? []).length < 1000) break;
  }
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(paths.slice(index, index + 100));
    if (error) throw new MediaError("media_failed", "Account media could not be deleted.");
  }
}
