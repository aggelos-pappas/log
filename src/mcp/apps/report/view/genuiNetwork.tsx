import { MAP_BLOCK } from "../../../../relate/map/types.ts";
import type { NetworkMapBlock } from "../../../../relate/map/types.ts";
import type { Trail } from "../../../../../vendor/hermesGenui/web/src/core/fields.ts";
import type { ExtraBlockEntry } from "../../../../../vendor/hermesGenui/web/src/registry.tsx";
import { networkMap } from "../helpers/schema.ts";
import { NetworkMap } from "./networkMap.tsx";

export function readNetworkMapBlock(raw: unknown, here: Trail): NetworkMapBlock | null {
  const parsed = networkMap.safeParse(raw);
  if (parsed.success) return parsed.data as NetworkMapBlock;
  const issue = parsed.error.issues[0];
  return here.drop(`${MAP_BLOCK} ${issue?.path.join(".") ?? ""}: ${issue?.message ?? "unreadable"}`);
}

export const NETWORK_MAP_GENUI_ENTRY: ExtraBlockEntry = {
  read: (raw, here) => readNetworkMapBlock(raw, here),
  Component: ({ block }: { block: NetworkMapBlock }) => (
    <div className="rmFrame">
      <NetworkMap block={block} />
    </div>
  ),
};
