import { MAP_BLOCK, MAP_FORMS, MAP_LIMITS, MAP_PLATFORMS, MAP_TONES, MAP_VIEWS } from "../../src/relate/map/types.ts";
import { MAP_GENUI_CATALOG, MAP_GENUI_FILE } from "../../src/relate/map/genui.ts";

export const GENUI_NETWORK_OUT = MAP_GENUI_FILE.join("/");

export function genuiNetworkJson(): string {
  const spec = {
    kind: MAP_BLOCK,
    catalog: MAP_GENUI_CATALOG,
    limits: MAP_LIMITS,
    views: MAP_VIEWS,
    forms: MAP_FORMS,
    tones: MAP_TONES,
    platforms: MAP_PLATFORMS,
    keys: { node: ["key", "handle", "name", "initials", "platform", "platforms", "ring", "tone", "why", "rooms", "facts", "next", "lanes", "quiet", "talk", "at", "machine"], room: ["key", "name", "server", "kind", "platform", "meaning", "at", "members"], edge: ["a", "b", "kind", "room", "at"], ring: ["id", "label", "tone", "count", "nodes"], hop: ["key", "handle", "room", "at"] },
  };
  return `${JSON.stringify(spec, null, 2)}\n`;
}
