import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { rememberProfiles } from "../store/index.ts";
import { migrate } from "../../storage/schema/client.ts";
import { avatarDataUri, backfillProfileAvatars, saveProfileAvatars } from "./index.ts";

const NOW = new Date("2026-11-14T10:00:00Z");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function fresh(): Database {
  const handle = new Database(":memory:");
  migrate(handle);
  return handle;
}

function fakeFetch(bytes: Uint8Array | null) {
  return (async () => ({
    ok: bytes !== null,
    headers: new Headers(),
    arrayBuffer: async () => (bytes ?? new Uint8Array()).buffer,
  })) as unknown as Parameters<typeof saveProfileAvatars>[5];
}

function stored(handle: Database): { avatarHash: string | null; bytes: Uint8Array | null } {
  const row = handle.prepare("SELECT avatarHash FROM identityProfiles WHERE platform = ? AND userId = ?").get("discord", "6001") as { avatarHash: string | null } | null;
  if (!row?.avatarHash) return { avatarHash: null, bytes: null };
  const blob = handle.prepare("SELECT bytes FROM blobs WHERE hash = ?").get(row.avatarHash) as { bytes: Uint8Array } | undefined;
  return { avatarHash: row.avatarHash, bytes: blob?.bytes ?? null };
}

describe("profile avatars", () => {
  test("saves a picture URL as an avatar blob and a profileSeen hash event", async () => {
    const handle = fresh();
    rememberProfiles("discord", "fakeAccount", [{ userId: "6001", handle: null, displayName: null, fields: { extra: { pictureUrl: "https://cdn.example/picture.png" } } }], NOW, handle);
    const report = await saveProfileAvatars("discord", "fakeAccount", [{ userId: "6001", handle: null, displayName: null, fields: { extra: { pictureUrl: "https://cdn.example/picture.png" } } }], NOW, handle, fakeFetch(PNG));
    expect(report).toEqual({ seen: 1, saved: ["6001"], failed: 0 });
    const row = stored(handle);
    expect(row.avatarHash).toBeTruthy();
    expect(new Uint8Array(row.bytes!)).toEqual(PNG);
    expect(avatarDataUri(row.bytes)).toContain("data:image/png;base64,");
    expect(handle.prepare("SELECT count(*) n FROM events WHERE type = 'profileSeen'").get()).toEqual({ n: 2 });
  });

  test("does not store bad bytes and does not refetch a saved avatar", async () => {
    const handle = fresh();
    const sighting = { userId: "6001", handle: null, displayName: null, fields: { extra: { pictureUrl: "https://cdn.example/picture.png" } } };
    const bad = await saveProfileAvatars("discord", "fakeAccount", [sighting], NOW, handle, fakeFetch(new Uint8Array([1, 2, 3])));
    expect(bad.failed).toBe(1);
    expect(stored(handle).avatarHash).toBeNull();
    const good = await saveProfileAvatars("discord", "fakeAccount", [sighting], NOW, handle, fakeFetch(PNG));
    expect(good.saved).toEqual(["6001"]);
    const again = await saveProfileAvatars("discord", "fakeAccount", [sighting], NOW, handle, fakeFetch(null));
    expect(again.saved).toEqual([]);
    expect(stored(handle).avatarHash).toBeTruthy();
  });

  test("backfills a stored picture URL into an avatar", async () => {
    const handle = fresh();
    rememberProfiles("discord", "fakeAccount", [{ userId: "6001", handle: null, displayName: null, fields: { extra: { pictureUrl: "https://cdn.example/picture.png" } } }], NOW, handle);
    const report = await backfillProfileAvatars(handle, 10, NOW, fakeFetch(PNG));
    expect(report).toEqual({ seen: 1, saved: ["discord:6001"], failed: 0 });
    expect(stored(handle).avatarHash).toBeTruthy();
  });
});
