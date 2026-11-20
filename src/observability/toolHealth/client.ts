import type { Database } from "bun:sqlite";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CallRow, GuideFile, SchemaChange } from "./types.ts";

export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const GUIDE_DIRS = ["docs/useCases", "docs/guides"];
const INPUT_LINE = 'kind: "';
const MARK = "\u0001";
const FORMAT = "--format=%x01%h %ct";

export type GitRun = (args: string[]) => string;

export function gitIn(root: string): GitRun {
  return (args) => execFileSync("git", args, { windowsHide: true, cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
}

export function readCalls(handle: Database, sinceMs: number): CallRow[] {
  const rows = handle
    .prepare(`SELECT tool, callId, startedAt, ms, ok, attrs FROM spans WHERE parentId IS NULL AND name = 'call' AND source = 'bun' AND startedAt >= ? ORDER BY startedAt`)
    .all(sinceMs) as { tool: string; callId: string; startedAt: number; ms: number; ok: number; attrs: string }[];
  return rows.map((row) => {
    let code: string | null = null;
    try {
      const attrs = JSON.parse(row.attrs) as Record<string, unknown>;
      if (typeof attrs.code === "string" && attrs.code) code = attrs.code;
    } catch {
    }
    return { tool: row.tool, callId: row.callId, startedAt: row.startedAt, ms: row.ms, ok: row.ok === 1, code };
  });
}

function markdownIn(root: string, dir: string): string[] {
  const full = join(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return markdownIn(root, path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

export function parseGitLog(log: string): { path: string; sha: string; at: number }[] {
  const out: { path: string; sha: string; at: number }[] = [];
  let current: { sha: string; at: number } | null = null;
  for (const line of log.split(/\r?\n/)) {
    if (line.startsWith(MARK)) {
      const [sha, at] = line.slice(1).split(" ");
      current = { sha, at: Number(at) * 1000 };
      continue;
    }
    const path = line.trim();
    if (path && current) out.push({ path, ...current });
  }
  return out;
}

export function lastCommits(log: string): Map<string, { sha: string; at: number }> {
  const out = new Map<string, { sha: string; at: number }>();
  for (const row of parseGitLog(log)) if (!out.has(row.path)) out.set(row.path, { sha: row.sha, at: row.at });
  return out;
}

export function schemaChangesIn(log: string, modules: ReadonlySet<string>): SchemaChange[] {
  return parseGitLog(log).filter((row) => modules.has(row.path)).map((row) => ({ module: row.path, sha: row.sha, at: row.at }));
}

export function readGuides(root: string = REPO_ROOT, git: GitRun = gitIn(root)): { guides: GuideFile[]; hasGit: boolean } {
  const paths = GUIDE_DIRS.flatMap((dir) => markdownIn(root, dir)).sort();
  let times = new Map<string, { sha: string; at: number }>();
  let hasGit = true;
  try {
    times = lastCommits(git(["log", FORMAT, "--name-only", "--", ...GUIDE_DIRS]));
  } catch {
    hasGit = false;
  }
  const guides = paths.map((path) => ({ path, text: readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n"), committedAt: times.get(path)?.at ?? null }));
  return { guides, hasGit };
}

export function readSchemaChanges(modules: readonly string[], sinceMs: number, root: string = REPO_ROOT, git: GitRun = gitIn(root)): SchemaChange[] | null {
  if (!modules.length) return [];
  try {
    const since = new Date(sinceMs).toISOString();
    return schemaChangesIn(git(["log", FORMAT, "--name-only", `-G${INPUT_LINE}`, `--since=${since}`, "--", ...new Set(modules)]), new Set(modules));
  } catch {
    return null;
  }
}
