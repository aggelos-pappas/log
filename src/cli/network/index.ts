import { existsSync } from "node:fs";
import { ensureRings, importNetwork, missingFiles, networkDir, networkImported, networkRings } from "../../relate/network/index.ts";
import type { NetworkImport, NetworkRings } from "../../relate/network/index.ts";
import { defaultDbPath, openDatabase } from "../../storage/schema/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const NETWORK_USAGE = [
  "Usage: log network import [--from <dir>] [--account <handle>] [--json]",
  "       log network status [--json]",
  "<dir>: LOG_NETWORK_DIR by default. Then `log relate build`.",
].join("\n");

export const NETWORK_INPUT: CommandInput = {
  forms: [
    { words: ["import"], effect: "write", summary: "Read your network into log.db, replacing the last import", positionals: [], flags: [{ name: "from", kind: "string", description: "The data folder" }, { name: "account", kind: "string", description: "The owner's account" }, JSON_FLAG] },
    { words: ["status"], summary: "Your network's rings, live", positionals: [], flags: [JSON_FLAG] },
  ],
};

const countsLine = (s: NetworkImport): string => `${s.counts.people} people, ${s.counts.leaders} leaders, ${s.counts.communities} communities, ${s.counts.runs} runs, ${s.counts.circles} circle memberships, ${s.counts.mentions} mention pairs, ${s.counts.follows} follow ${s.account ? `@${s.account}` : "nobody (no X account)"}`;

const ringsLine = (r: NetworkRings): string => `ring 1: ${r.counts["1"]} engaged with you, ring 2: ${r.counts["2"]} talk to them or your followers, ring 3: ${r.counts["3"]} follow you, ring 4: ${r.counts["4"]} known`;

export const networkCommand: Command = {
  usage: NETWORK_USAGE,
  platform: "any",
  name: "network",
  effect: "read",
  input: NETWORK_INPUT,
  summary: "The owner's network in log.db, for the Relate graph",
  args: "import [--from <dir>] [--account <handle>]|status [--json]",
  run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(NETWORK_INPUT));
    if (!parsed.ok) return refuseInput("network", parsed.error, NETWORK_USAGE);
    const [sub] = parsed.positionals;
    const json = parsed.flags["json"] === true;
    const handle = openDatabase(defaultDbPath());
    if (sub === "import") {
      const asked = typeof parsed.flags["from"] === "string" ? String(parsed.flags["from"]) : null;
      const from = asked ?? networkDir();
      if (!asked && (!existsSync(from) || missingFiles(from).length)) return { code: 0, stdout: json ? JSON.stringify({ imported: false, from }, null, 2) : `log network import: no network at ${from}, so nothing was imported. Set LOG_NETWORK_DIR or pass --from <dir>.` };
      context.err(`log network import: reading ${from}`);
      const account = typeof parsed.flags["account"] === "string" ? String(parsed.flags["account"]) : null;
      const outcome = importNetwork(handle, from, { account });
      if (!outcome.ok) return refuseInput("network", outcome.problem, NETWORK_USAGE);
      if (json) return { code: 0, stdout: JSON.stringify({ imported: true, ...outcome.summary }, null, 2) };
      return { code: 0, stdout: `log network import: ${countsLine(outcome.summary)}, in ${outcome.summary.ms} ms (map ${outcome.summary.mapVersion ?? "?"} of ${outcome.summary.generatedAt ?? "?"}).\n  \`log relate build\` puts it in the graph.` };
    }
    if (sub === "status") {
      ensureRings(handle);
      const rings = networkRings(handle);
      const summary = networkImported(handle);
      if (json) return { code: 0, stdout: JSON.stringify({ rings, imported: Boolean(summary), ...(summary ?? {}) }, null, 2) };
      const imported = summary ? `  imported: ${countsLine(summary)}, ${summary.importedAt} from ${summary.source}; ${rings.merged} matched your chats by handle` : "  nothing imported: these rings come from your own accounts. `log network import` adds a research folder.";
      return { code: 0, stdout: [`log network status: ${ringsLine(rings)}`, `  live through event ${rings.state?.throughSeq ?? 0} (log.db at ${rings.latestSeq})${rings.state?.lastAtMs ? `, last at ${new Date(rings.state.lastAtMs).toISOString()}` : ""}`, imported].join("\n") };
    }
    return refuseInput("network", "say import or status", NETWORK_USAGE);
  },
};
