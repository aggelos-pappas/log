import type { Database } from "bun:sqlite";
import { db, rememberProfiles } from "../store/index.ts";
import { putBlob } from "../../storage/platform/index.ts";
import { AVATAR_TYPES } from "./types.ts";
import type { ProfileSighting } from "../../storage/platform/index.ts";

export const AVATAR_MAX_BYTES = 4_000_000;
export const AVATAR_TIMEOUT_MS = 10_000;

export type AvatarFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface AvatarSaveReport {
  seen: number;
  saved: string[];
  failed: number;
}

const urlOf = (sighting: ProfileSighting): string | null => {
  const url = sighting.fields.extra?.pictureUrl;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : null;
};

export async function fetchAvatarBytes(url: string, fetcher: AvatarFetch = fetch): Promise<Uint8Array | null> {
  const response = await fetcher(url, { signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS) });
  if (!response.ok) return null;
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > AVATAR_MAX_BYTES) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > AVATAR_MAX_BYTES) return null;
  const known = AVATAR_TYPES.some(([, magic]) => magic.every((byte, i) => bytes[i] === byte));
  return known ? bytes : null;
}

export async function saveProfileAvatar(platform: string, account: string, sighting: ProfileSighting, now: Date, on: Database = db(), fetcher: AvatarFetch = fetch): Promise<boolean> {
  const url = urlOf(sighting);
  if (!url || !sighting.userId) return false;
  const stored = on.prepare("SELECT avatarHash FROM identityProfiles WHERE platform = ? AND userId = ?").get(platform, sighting.userId) as { avatarHash: string | null } | null;
  if (stored?.avatarHash) return false;
  try {
    const bytes = await fetchAvatarBytes(url, fetcher);
    if (!bytes) return false;
    const hash = putBlob(on, "avatar", bytes, now);
    rememberProfiles(platform, account, [{ userId: sighting.userId, handle: null, displayName: null, fields: { avatarHash: hash } }], now, on);
    return true;
  } catch {
    return false;
  }
}

export async function saveProfileAvatars(platform: string, account: string, sightings: readonly (ProfileSighting | null)[], now: Date, on: Database = db(), fetcher: AvatarFetch = fetch): Promise<AvatarSaveReport> {
  const report: AvatarSaveReport = { seen: 0, saved: [], failed: 0 };
  for (const sighting of sightings) {
    if (!sighting || !urlOf(sighting)) continue;
    report.seen++;
    if (await saveProfileAvatar(platform, account, sighting, now, on, fetcher)) report.saved.push(sighting.userId);
    else report.failed++;
  }
  return report;
}

export async function backfillProfileAvatars(on: Database = db(), limit: number = 100, now: Date = new Date(), fetcher: AvatarFetch = fetch): Promise<AvatarSaveReport> {
  const rows = on.prepare("SELECT platform, userId, extra FROM identityProfiles WHERE avatarHash IS NULL AND extra IS NOT NULL AND json_extract(extra, '$.pictureUrl') IS NOT NULL LIMIT ?").all(limit) as { platform: string; userId: string; extra: string }[];
  const report: AvatarSaveReport = { seen: 0, saved: [], failed: 0 };
  for (const row of rows) {
    report.seen++;
    const avatar = await saveProfileAvatar(row.platform, "avatars", { userId: row.userId, handle: null, displayName: null, fields: { extra: JSON.parse(row.extra) as never } }, now, on, fetcher);
    if (avatar) report.saved.push(`${row.platform}:${row.userId}`);
    else report.failed++;
  }
  return report;
}
