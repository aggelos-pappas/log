import { existsSync } from "node:fs";
import { NETWORK_LIST, ensureRings, importNetwork, missingFiles, networkDir, networkImported, networkRings, suggestedMatches } from "../../relate/network/index.ts";
import type { NetworkAccount, NetworkImport, NetworkPersonView, NetworkRings, RingCounts, SuggestedMatch } from "../../relate/network/index.ts";
import { PLATFORMS } from "../runner/helpers/platforms.ts";
import { defaultDbPath, openDatabase } from "../../storage/schema/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const NETWORK_USAGE = [
  "Usage: log network import [--from <dir>] [--account <handle>] [--json]",
  "       log network status [--platform <p>] [--json]",
  "<dir>: LOG_NETWORK_DIR by default. Then `log relate build`.",
].join("\n");

export const NETWORK_INPUT: CommandInput = {
  forms: [
    { words: ["import"], effect: "write", summary: "Read your network into log.db, replacing the last import", positionals: [], flags: [{ name: "from", kind: "string", description: "The data folder" }, { name: "account", kind: "string", description: "The owner's account" }, JSON_FLAG] },
    { words: ["status"], summary: "Your network's rings per person, live", positionals: [], flags: [{ name: "platform", kind: "enum", values: PLATFORMS, description: "Only this platform" }, JSON_FLAG] },
  ],
};

const countsLine = (s: NetworkImport): string => `${s.counts.people} people, ${s.counts.leaders} leaders, ${s.counts.communities} communities, ${s.counts.runs} runs, ${s.counts.circles} circle memberships, ${s.counts.mentions} mention pairs, ${s.counts.follows} follow ${s.account ? `@${s.account}` : "nobody (no X account)"}`;

const ringsLine = (c: RingCounts): string => `ring 1: ${c["1"]} engaged with you, ring 2: ${c["2"]} talk to them or your followers, ring 3: ${c["3"]} follow you, ring 4: ${c["4"]} known`;

const shortRings = (c: RingCounts): string => `1: ${c["1"]}, 2: ${c["2"]}, 3: ${c["3"]}, 4: ${c["4"]}`;

const accountLabel = (a: NetworkAccount): string => `${a.platform}:${a.handle ?? a.userId} ring ${a.ring} (${a.reason}${a.via ? ` via ${a.via}` : ""})`;

const personLine = (p: NetworkPersonView): string => `    ${p.name ?? p.personId ?? p.key}: ring ${p.ring} from ${p.platform}; ${p.accounts.map(accountLabel).join(", ")}`;

const suggestedLine = (s: SuggestedMatch): string => `    ${accountLabel(s.a)} ~ ${accountLabel(s.b)} (${s.band}, ${s.probability.toFixed(2)})`;

function statusText(rings: NetworkRings, suggested: readonly SuggestedMatch[], summary: NetworkImport | null): string {
  const head = rings.platform ? `log network status --platform ${rings.platform}: ${rings.identities} ${rings.platform} accounts, ${ringsLine(rings.counts)}` : `log network status: ${rings.people} people (${rings.identities} accounts), ${ringsLine(rings.counts)}`;
  const byPlatform = rings.platform ? [] : [`  by platform: ${rings.byPlatform.map((p) => `${p.platform} ${shortRings(p.counts)}`).join("; ")}`];
  const linked = [`  linked across platforms: ${rings.linked.length} ${rings.linked.length === 1 ? "person" : "people"}, each once at their closest ring${rings.linked.length ? "" : " (`log people link` joins accounts the owner confirms)"}`, ...rings.linked.slice(0, NETWORK_LIST).map(personLine)];
  const maybe = [`  suggested, not linked: ${suggested.length} pairs, counted apart until the owner links them (\`log people suggest\`)`, ...suggested.slice(0, NETWORK_LIST).map(suggestedLine)];
  const live = `  live through event ${rings.state?.throughSeq ?? 0} (log.db at ${rings.latestSeq})${rings.state?.lastAtMs ? `, last at ${new Date(rings.state.lastAtMs).toISOString()}` : ""}`;
  const imported = summary ? `  imported: ${countsLine(summary)}, ${summary.importedAt} from ${summary.source}; ${rings.merged} matched your chats by handle` : "  nothing imported: these rings come from your own accounts. `log network import` adds a research folder.";
  return [head, ...byPlatform, ...linked, ...maybe, live, imported].join("\n");
}

export const networkCommand: Command = {
  usage: NETWORK_USAGE,
  platform: "any",
  name: "network",
  effect: "read",
  input: NETWORK_INPUT,
  summary: "The owner's network in log.db",
  args: "import [--from <dir>] [--account <handle>]|status [--platform <p>] [--json]",
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
      const platform = typeof parsed.flags["platform"] === "string" ? String(parsed.flags["platform"]) : null;
      ensureRings(handle);
      const rings = networkRings(handle, { platform });
      const suggested = suggestedMatches(handle, platform);
      const summary = networkImported(handle);
      if (json) return { code: 0, stdout: JSON.stringify({ rings, suggested, imported: Boolean(summary), ...(summary ?? {}) }, null, 2) };
      return { code: 0, stdout: statusText(rings, suggested, summary) };
    }
    return refuseInput("network", "say import or status", NETWORK_USAGE);
  },
};
