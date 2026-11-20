import { percentiles } from "../../timing/index.ts";
import type { CallRow, FailingFlag, GuideFile, HealthInput, HealthReport, RegisteredTool, SchemaChange, StaleFlag, ToolRow, UnusedFlag } from "../types.ts";

export const FAILING_SHARE = 0.2;
export const FAILING_MIN_CALLS = 5;
export const UNCODED = "uncoded";
export const OFFERS_NOTE = "Router offers aren't stored: the prompt router keeps only the play it matched (the hook span's outcome), never the tools it listed, so unused shows calls only, not how often a tool was offered and passed over.";

const PLAYS = "docs/useCases/";
const CALL_SHAPED = [/`([a-z][a-zA-Z0-9]+)`\s*\{/g, /`([a-z][a-zA-Z0-9]+) \{/g];
const NAMED = /`([a-z][a-zA-Z0-9]+)`/g;

export function cliToolName(tool: string): string | null {
  if (!tool.startsWith("cli ")) return null;
  const words = tool.slice(4).split(" ").filter(Boolean);
  if (!words.length) return null;
  return words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join("");
}

export function firstWord(name: string): string {
  return /^[a-z0-9]+/.exec(name)?.[0] ?? name;
}

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const share = (n: number) => Math.round(n * 1000) / 1000;

function topOf(counts: Record<string, number>): string | null {
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return sorted[0]?.[0] ?? null;
}

function codesOf(calls: readonly CallRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of calls) if (!c.ok) out[c.code ?? UNCODED] = (out[c.code ?? UNCODED] ?? 0) + 1;
  return out;
}

export function toolRows(calls: readonly CallRow[]): ToolRow[] {
  const byTool = new Map<string, CallRow[]>();
  for (const c of calls) byTool.set(c.tool, [...(byTool.get(c.tool) ?? []), c]);
  return [...byTool.entries()]
    .map(([tool, rows]) => {
      const failures = rows.filter((r) => !r.ok).length;
      const codes = codesOf(rows);
      const coded = Object.fromEntries(Object.entries(codes).filter(([code]) => code !== UNCODED));
      const stats = percentiles(rows.map((r) => r.ms));
      return { tool, calls: rows.length, failures, failureRate: share(failures / rows.length), topCode: topOf(coded) ?? (failures ? UNCODED : null), p50: Math.round(stats.p50), p95: Math.round(stats.p95), lastUsed: new Date(Math.max(...rows.map((r) => r.startedAt))).toISOString() };
    })
    .sort((a, b) => b.calls - a.calls || a.tool.localeCompare(b.tool));
}

export function namesIn(text: string): string[] {
  return [...new Set([...text.matchAll(NAMED)].map((m) => m[1]))];
}

export function callShapedNames(text: string): string[] {
  return [...new Set(CALL_SHAPED.flatMap((re) => [...text.matchAll(re)].map((m) => m[1])))];
}

export function usedNames(calls: readonly CallRow[]): Set<string> {
  const out = new Set<string>();
  for (const c of calls) {
    out.add(c.tool);
    const cli = cliToolName(c.tool);
    if (cli) out.add(cli);
  }
  return out;
}

export function unusedTools(registered: readonly RegisteredTool[], calls: readonly CallRow[], guides: readonly GuideFile[], days: number): UnusedFlag[] {
  const used = usedNames(calls);
  const plays = guides.filter((g) => g.path.startsWith(PLAYS)).map((g) => ({ path: g.path, names: new Set(namesIn(g.text)) }));
  return registered
    .filter((t) => !used.has(t.name))
    .map((t) => {
      const namedBy = plays.filter((p) => p.names.has(t.name)).map((p) => p.path);
      const fix = namedBy.length ? `guide edit: ${namedBy.join(", ")} named it but nothing called it in ${days} d; check that step still needs it, or retire it` : `retire it, or merge it into a tool that is used: no call in ${days} d and no play names it`;
      return { tool: t.name, calls: 0 as const, namedBy, offered: null, fix };
    })
    .sort((a, b) => a.tool.localeCompare(b.tool));
}

function failingFix(code: string, callId: string): string {
  if (code === "inputInvalid") return `guide edit: callers pass input it refuses; fix the play or usage example that leads there (timing { call: "${callId}" })`;
  if (code === "toolUnknown") return "guide edit: callers name a tool or form that is gone; point them at the one that replaced it";
  return `fix the tool: read the latest failing call with timing { call: "${callId}" } and errors for ${code}`;
}

export function failingTools(calls: readonly CallRow[]): FailingFlag[] {
  return toolRows(calls)
    .filter((row) => row.calls >= FAILING_MIN_CALLS && row.failures / row.calls > FAILING_SHARE)
    .map((row) => {
      const rows = calls.filter((c) => c.tool === row.tool);
      const latest = rows.filter((c) => !c.ok).sort((a, b) => b.startedAt - a.startedAt)[0];
      const codes = codesOf(rows);
      return { tool: row.tool, calls: row.calls, failures: row.failures, failureRate: row.failureRate, codes, lastFailedCall: latest.callId, fix: failingFix(row.topCode ?? UNCODED, latest.callId) };
    })
    .sort((a, b) => b.failureRate - a.failureRate || b.calls - a.calls);
}

export function lastChangeOf(module: string, changes: readonly SchemaChange[]): SchemaChange | null {
  return changes.filter((c) => c.module === module).sort((a, b) => b.at - a.at)[0] ?? null;
}

export function staleGuides(guides: readonly GuideFile[], registered: readonly RegisteredTool[], changes: readonly SchemaChange[] | null, prefixes: readonly string[], untracked: readonly string[] = []): StaleFlag[] {
  const known = new Set(untracked);
  const modules = new Map(registered.map((t) => [t.name, t.module]));
  const prefixSet = new Set(prefixes);
  const out: StaleFlag[] = [];
  for (const guide of guides) {
    const generated = !guide.path.startsWith(PLAYS);
    const editFix = generated ? "regenerate it: bun run docs:build" : `guide edit: update ${guide.path}`;
    if (changes && guide.committedAt !== null) {
      for (const name of namesIn(guide.text)) {
        const module = modules.get(name);
        const change = module ? lastChangeOf(module, changes) : null;
        if (!module || !change || change.at <= guide.committedAt) continue;
        out.push({ guide: guide.path, tool: name, reason: "schemaChanged", evidence: `${module} changed its input in ${change.sha} on ${day(change.at)}, after the guide's last commit on ${day(guide.committedAt)}`, fix: `${editFix} with ${name}'s current usage` });
      }
    }
    for (const name of callShapedNames(guide.text)) {
      if (modules.has(name) || known.has(name) || !prefixSet.has(firstWord(name))) continue;
      out.push({ guide: guide.path, tool: name, reason: "toolMissing", evidence: `it calls ${name}, which no command or flow registers`, fix: `${editFix}: replace ${name} with the tool that does it now, or drop the step` });
    }
  }
  return out.sort((a, b) => a.guide.localeCompare(b.guide) || a.tool.localeCompare(b.tool));
}

export function healthReport(input: HealthInput): HealthReport {
  const since = input.now - input.days * 86400000;
  const calls = input.calls.filter((c) => c.startedAt >= since);
  const notes = [OFFERS_NOTE];
  if (!input.schemaChanges) notes.push("No git history here, so stale checks only names that no tool registers, not input changes.");
  return {
    days: input.days,
    since: new Date(since).toISOString(),
    tools: toolRows(calls),
    unused: unusedTools(input.registered, calls, input.guides, input.days),
    failing: failingTools(calls),
    stale: staleGuides(input.guides, input.registered, input.schemaChanges, input.toolPrefixes, input.untracked),
    notes,
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function reportLines(report: HealthReport): string[] {
  const lines = [`Tool health over the last ${report.days} d (since ${report.since.slice(0, 10)}): ${report.tools.length} tool(s) called, ${report.unused.length} unused, ${report.failing.length} failing, ${report.stale.length} stale guide mention(s). Read-only: nothing here changes code or files.`, ""];
  lines.push("tool | calls | failed | top code | p50 ms | p95 ms | last used");
  for (const t of report.tools) lines.push(`${t.tool} | ${t.calls} | ${t.failures} (${pct(t.failureRate)}) | ${t.topCode ?? "-"} | ${t.p50} | ${t.p95} | ${t.lastUsed.slice(0, 16).replace("T", " ")}`);
  if (report.failing.length) {
    lines.push("", `Failing (over ${pct(FAILING_SHARE)} of at least ${FAILING_MIN_CALLS} calls):`);
    for (const f of report.failing) lines.push(`- ${f.tool}: ${f.failures}/${f.calls} failed, codes ${Object.entries(f.codes).map(([c, n]) => `${c} ${n}`).join(", ")}. Fix: ${f.fix}`);
  }
  if (report.stale.length) {
    lines.push("", "Stale guide mentions:");
    for (const s of report.stale) lines.push(`- ${s.guide} names ${s.tool}: ${s.evidence}. Fix: ${s.fix}`);
  }
  if (report.unused.length) {
    const named = report.unused.filter((u) => u.namedBy.length);
    const loose = report.unused.filter((u) => !u.namedBy.length);
    lines.push("", `Unused (registered, 0 calls in ${report.days} d):`);
    for (const u of named) lines.push(`- ${u.tool}: ${u.fix}`);
    if (loose.length) lines.push(`- named by no play (retire, or merge into a tool that is used): ${loose.map((u) => u.tool).join(", ")}`);
  }
  lines.push("", ...report.notes);
  return lines;
}
