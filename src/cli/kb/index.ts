import { homedir } from "node:os";
import { join } from "node:path";
import { KB_KINDS, collectAll, openKnowledge, rememberKnowledge, searchKnowledge, syncKnowledge } from "../../knowledge/base/index.ts";
import type { KbHit, KbKind, KbStore } from "../../knowledge/base/index.ts";
import { listFacebookAccounts } from "../../platformKit/socialAccount/index.ts";
import { searchDeps } from "../search/index.ts";
import type { Embedder } from "../../search/conversations/index.ts";
import { JSON_FLAG, listOf, numberOf, parseArgs, parserSpecOf } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const KB_USAGE = [
  "Usage: log kb search \"<query>\" [--kind <kind>] [--limit <n>] [--json]",
  "       log kb sync [--noAccounts] [--json]   (collects rules, skills, docs, infra notes, memory files, page states and accounts into the knowledge base in log.db, and indexes what changed)",
  "       log kb remember \"<text>\" [--title <t>] [--tags <a,b>] [--json]   (saves an agent memory as a note in log.db and indexes it at once)",
  "       log kb show <key> [--json]   (one article in full, e.g. rule:73, skill:inspect, pageState:messengerPinCreate)",
  `Kinds: ${KB_KINDS.join(", ")}. The workspace log.db holds every article and its chunks; search is BM25 keyword and cosine meaning (local all-MiniLM-L6-v2) fused with reciprocal rank fusion, all on this machine. Secrets are scrubbed before anything is written.`,
].join("\n");

const KIND_FLAG = { name: "kind", kind: "enum", values: KB_KINDS, description: "Only this kind of article" } as const;

export const KB_INPUT: CommandInput = {
  forms: [
    {
      words: ["search"],
      summary: "Search the knowledge base (rules, skills, docs, infra, agent memory, page states, accounts, notes) by keyword and meaning at once",
      positionals: [{ name: "query", kind: "rest", required: true, description: "What to look for, in plain words" }],
      flags: [KIND_FLAG, { name: "limit", kind: "integer", min: 1, max: 50, description: "How many articles, default 8, at most 50" }, JSON_FLAG],
    },
    {
      words: ["sync"],
      effect: "write",
      summary: "Collect every source into the knowledge base in log.db and index what changed",
      positionals: [],
      flags: [{ name: "noAccounts", kind: "boolean", description: "Leave the accounts out (no read of the account store)" }, JSON_FLAG],
    },
    {
      words: ["remember"],
      effect: "write",
      summary: "Save an agent memory as a knowledge base note in log.db, indexed at once",
      positionals: [{ name: "text", kind: "rest", required: true, description: "What to remember, in plain words; secrets are scrubbed" }],
      flags: [{ name: "title", kind: "string", description: "Its title (default: the first line)" }, { name: "tags", kind: "list", description: "Comma-separated tags" }, JSON_FLAG],
    },
    {
      words: ["show"],
      summary: "Show one knowledge base article in full",
      positionals: [{ name: "key", kind: "string", required: true, description: "The article key, e.g. rule:73 or skill:inspect" }],
      flags: [JSON_FLAG],
    },
  ],
};

export const kbDeps: { embedder: () => Embedder; store: () => KbStore; repo: () => string; memoryRoot: () => string } = {
  embedder: () => searchDeps.embedder(),
  store: () => openKnowledge(),
  repo: () => join(import.meta.dir, "..", "..", ".."),
  memoryRoot: () => join(homedir(), ".claude", "projects"),
};

function hitLines(hit: KbHit): string {
  const ranks = [hit.keywordRank ? `keyword #${hit.keywordRank}` : null, hit.meaningRank ? `meaning #${hit.meaningRank}` : null].filter(Boolean).join(", ");
  const excerpt = hit.text.replace(/\s+/g, " ").slice(0, 320);
  return `  ${hit.rank}. [${hit.kind}] ${hit.title}\n     ${hit.key} · ${hit.source} · ${ranks}\n     ${excerpt}`;
}

const SUBS = ["search", "sync", "remember", "show"] as const;

export const kbCommand: Command = {
  usage: KB_USAGE,
  platform: "any",
  name: "kb",
  effect: "read",
  input: KB_INPUT,
  summary: "The knowledge base in log.db: search it, sync every source into it, remember a note, show an article",
  args: "search \"<query>\"|sync|remember \"<text>\"|show <key> [--kind <k>] [--limit <n>] [--json]",
  async run(context, argv) {
    const sub = SUBS.find((s) => s === argv[0]);
    if (!sub) return { code: 1, stderr: `log kb: say search, sync, remember or show\n${KB_USAGE}` };
    const form = KB_INPUT.forms[SUBS.indexOf(sub)];
    const parsed = parseArgs(argv.slice(1), parserSpecOf({ forms: [{ ...form, words: [] }] }));
    if (!parsed.ok) return { code: 1, stderr: `log kb ${sub}: ${parsed.error}\n${KB_USAGE}` };
    const json = parsed.flags["json"] === true;
    const store = kbDeps.store();
    if (sub === "show") {
      const key = parsed.positionals.join(" ").trim();
      const found = await store.get(key);
      if (!found) return { code: 1, stderr: `log kb show: kbArticleMissing: no article ${key} (find one with log kb search)` };
      if (json) return { code: 0, stdout: JSON.stringify(found, null, 2) };
      return { code: 0, stdout: [`[${found.kind}] ${found.title}`, `${found.key} · ${found.source} · by ${found.author}${found.tags.length ? ` · ${found.tags.join(", ")}` : ""}`, "", found.body].join("\n") };
    }
    const embedder = kbDeps.embedder();
    try {
      if (sub === "sync") {
        context.err("kb: collecting rules, skills, docs, memory files and page states");
        const accounts = parsed.flags["noAccounts"] === true ? [] : await listFacebookAccounts(context.accounts).catch((error) => {
          context.err(`kb: accounts left out: ${error instanceof Error ? error.message : String(error)}`);
          return [];
        });
        const collected = collectAll({ repo: kbDeps.repo(), memoryRoot: kbDeps.memoryRoot() }, accounts);
        const report = await syncKnowledge(collected, store, embedder, { progress: context.err });
        if (json) return { code: 0, stdout: JSON.stringify(report, null, 2) };
        const kinds = Object.entries(report.byKind).map(([k, n]) => `${k} ${n}`).join(", ");
        return {
          code: 0,
          stdout: [
            `kb sync: ${report.collected} articles (${kinds})`,
            `  articles: ${report.created} new, ${report.updated} changed, ${report.unchanged} unchanged`,
            `  index: ${report.indexed} re-indexed into ${report.chunks} chunks, ${report.dropped} dropped, in ${(report.ms / 1000).toFixed(1)} s`,
          ].join("\n"),
        };
      }
      if (sub === "remember") {
        const text = parsed.positionals.join(" ").trim();
        if (!text) return { code: 1, stderr: `log kb remember: say what to remember\n${KB_USAGE}` };
        const tags = listOf(parsed, "tags") ?? [];
        const title = typeof parsed.flags["title"] === "string" ? (parsed.flags["title"] as string) : undefined;
        const saved = await rememberKnowledge({ text, title, tags }, store, embedder);
        if (json) return { code: 0, stdout: JSON.stringify(saved, null, 2) };
        return { code: 0, stdout: `kb remember: saved ${saved.key} ("${saved.title}") in log.db` };
      }
      const query = parsed.positionals.join(" ").trim();
      if (!query) return { code: 1, stderr: `log kb search: say what to look for\n${KB_USAGE}` };
      const limit = numberOf(parsed, "limit") ?? 8;
      const kind = typeof parsed.flags["kind"] === "string" ? (parsed.flags["kind"] as KbKind) : undefined;
      const started = performance.now();
      const hits = await searchKnowledge(store, embedder, query, { kind, limit });
      const ms = performance.now() - started;
      if (json) return { code: 0, stdout: JSON.stringify({ query, ms, hits }, null, 2) };
      return { code: 0, stdout: [`log kb search "${query}": ${hits.length} article${hits.length === 1 ? "" : "s"} in ${ms.toFixed(0)} ms (keyword + meaning, RRF)`, ...hits.map(hitLines), hits.length ? "  Full text: log kb show <key>" : ""].filter(Boolean).join("\n") };
    } finally {
      embedder.stop?.();
    }
  },
};
