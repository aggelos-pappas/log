import { MAP_BLOCK, MAP_FORMS, MAP_KEYS, MAP_LIMITS, MAP_PLATFORMS, MAP_TONES, MAP_VIEWS } from "../../src/relate/map/types.ts";
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
    keys: MAP_KEYS,
  };
  return `${JSON.stringify(spec, null, 2)}\n`;
}
