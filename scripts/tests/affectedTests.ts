import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, posix } from "node:path";

const root = join(import.meta.dir, "..", "..");

export const GRAPH_ROOTS = ["src", "scripts", "bin", "python", "hermesPlugin"];
export const FULL_RUN_PATHS = ["package.json", "bun.lock", "bunfig.toml", "tsconfig.json", "scripts/tests/preload.ts", "patches/", "vendor/"];
export const SMOKE_TESTS = ["src/config/logHome/logHome.test.ts", "src/mcp/server/server.test.ts", "src/cli/runner/commandInput.test.ts", "src/storage/schema/upgrade.test.ts", "scripts/tests/affectedTests.test.ts"];
export const FULL_RUN_SHARE = 0.6;
export const HUB_IMPORTS = 40;

const SOURCE = /\.(ts|tsx|mts|js|mjs|cjs|py)$/;
const SCRIPT = /\.(ts|tsx|mts|js|mjs|cjs)$/;
const TEST = /\.test\.(ts|tsx|js|mjs)$/;
const IGNORED = /^(site\/|vendor\/reverseChud\/)/;
const JS_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"'\n]+)["']/g;
const PY_FROM = /^[ \t]*from[ \t]+(\.*[\w.]*)[ \t]+import[ \t]+(\([^)]*\)|[^\n]+)/gm;
const PY_IMPORT = /^[ \t]*import[ \t]+([\w.]+(?:[ \t]*,[ \t]*[\w.]+)*)/gm;
const RUNS_FILES = /\b(spawn|spawnSync|execFile|execFileSync|execSync|Worker)\s*\(/;
const QUOTED = /["'`]([^"'`\n]{1,240})["'`]/g;
const JS_EXTENSIONS = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js", "/index.mjs"];

export type Graph = Map<string, Set<string>>;

const norm = (path: string): string => path.replace(/\\/g, "/");

function jsTarget(from: string, specifier: string, files: Set<string>): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = posix.normalize(posix.join(posix.dirname(from), specifier));
  const stem = base.replace(/\.(js|mjs)$/, "");
  for (const candidate of [...JS_EXTENSIONS.map((e) => base + e), ...JS_EXTENSIONS.map((e) => stem + e)]) if (files.has(candidate)) return candidate;
  return null;
}

function pyTargets(from: string, module: string, names: string[], files: Set<string>): string[] {
  const dots = module.match(/^\.*/)![0].length;
  const rest = module.slice(dots).split(".").filter(Boolean);
  const bases = dots ? [posix.join(...[posix.dirname(from), ...Array(dots - 1).fill("..")])] : [posix.dirname(from), "python", "hermesPlugin"];
  const found: string[] = [];
  for (const base of bases) {
    const at = posix.normalize(posix.join(base, ...rest));
    for (const candidate of [`${at}.py`, `${at}/__init__.py`, ...names.map((n) => `${at}/${n}.py`)]) if (files.has(candidate)) found.push(candidate);
  }
  return found;
}

export function importsOf(path: string, text: string, files: Set<string>): string[] {
  const out = new Set<string>();
  if (SCRIPT.test(path)) {
    for (const match of text.matchAll(JS_SPECIFIER)) {
      const target = jsTarget(path, match[1], files);
      if (target) out.add(target);
    }
  }
  if (path.endsWith(".py")) {
    for (const match of text.matchAll(PY_FROM)) for (const target of pyTargets(path, match[1], match[2].replace(/[()]/g, "").split(",").map((n) => n.trim().split(/\s+/)[0]).filter(Boolean), files)) out.add(target);
    for (const match of text.matchAll(PY_IMPORT)) for (const module of match[1].split(",")) for (const target of pyTargets(path, module.trim(), [], files)) out.add(target);
  }
  return [...out];
}

export function mentionsOf(path: string, text: string, byName: Map<string, string[]>): string[] {
  if (!TEST.test(path) || !RUNS_FILES.test(text)) return [];
  const words = new Set<string>();
  for (const match of text.matchAll(QUOTED)) for (const word of match[1].split(/[\\/\s,()]+/)) if (word) words.add(word);
  const out: string[] = [];
  for (const word of words) {
    const named = byName.get(word);
    if (!named) continue;
    const near = named.filter((file) => words.has(basename(dirname(file))) || text.includes(dirname(file)));
    out.push(...(named.length === 1 ? named : near));
  }
  return out.filter((file) => file !== path);
}

export function buildGraph(files: readonly string[], read: (path: string) => string): Graph {
  const known = new Set(files.map(norm));
  const byName = new Map<string, string[]>();
  for (const file of known) if (!SCRIPT.test(file) || !file.startsWith("src/")) byName.set(basename(file), [...(byName.get(basename(file)) ?? []), file]);
  const importedBy: Graph = new Map();
  for (const file of known) {
    if (!SOURCE.test(file)) continue;
    let text: string;
    try {
      text = read(file);
    } catch {
      continue;
    }
    for (const target of [...importsOf(file, text, known), ...mentionsOf(file, text, byName)]) {
      const users = importedBy.get(target) ?? new Set<string>();
      users.add(file);
      importedBy.set(target, users);
    }
  }
  return importedBy;
}

export function hubsOf(importedBy: Graph, threshold: number = HUB_IMPORTS): Set<string> {
  const imports = new Map<string, number>();
  for (const users of importedBy.values()) for (const user of users) imports.set(user, (imports.get(user) ?? 0) + 1);
  return new Set([...imports].filter(([, count]) => count >= threshold).map(([file]) => file));
}

export function reachedFrom(changed: readonly string[], importedBy: Graph, hubs: ReadonlySet<string> = new Set()): Set<string> {
  const seen = new Set(changed.map(norm));
  const queue = [...seen];
  while (queue.length) {
    const file = queue.pop()!;
    if (hubs.has(file) && !changed.includes(file)) continue;
    for (const user of importedBy.get(file) ?? []) {
      if (seen.has(user)) continue;
      seen.add(user);
      queue.push(user);
    }
  }
  return seen;
}

export function ownTests(changed: readonly string[], allTests: readonly string[]): string[] {
  const folders = new Set(changed.map((p) => posix.dirname(norm(p))));
  return allTests.map(norm).filter((t) => folders.has(posix.dirname(t)));
}

export interface Selection {
  full: boolean;
  reason: string;
  tests: string[];
}

export function selectTests(changed: readonly string[], allTests: readonly string[], importedBy: Graph, smoke: readonly string[] = SMOKE_TESTS): Selection {
  const paths = changed.map(norm);
  const global = paths.find((p) => FULL_RUN_PATHS.some((g) => (g.endsWith("/") ? p.startsWith(g) : p === g)));
  if (global) return { full: true, reason: `${global} changed, which every test depends on`, tests: [...allTests] };
  const runnable = new Set(allTests.map(norm));
  const reached = reachedFrom(paths, importedBy, hubsOf(importedBy));
  const affected = [...new Set([...ownTests(paths, allTests), ...[...reached].filter((p) => runnable.has(p))])];
  const tests = [...new Set([...affected, ...smoke.filter((s) => runnable.has(s))])].sort();
  if (runnable.size && tests.length / runnable.size >= FULL_RUN_SHARE) return { full: true, reason: `${affected.length} of ${runnable.size} test files are affected`, tests: [...allTests] };
  return { full: false, reason: `${paths.length} changed file(s) reach ${affected.length} test file(s), plus ${tests.length - affected.length} smoke`, tests };
}

function git(args: string[]): string {
  const run = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  return run.status === 0 ? run.stdout : "";
}

function lines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function changedFiles(base: string): string[] {
  return [...new Set([...lines(git(["diff", "--name-only", `${base}...HEAD`])), ...lines(git(["diff", "--name-only", "HEAD"])), ...lines(git(["ls-files", "--others", "--exclude-standard"]))])].map(norm);
}

function trackedFiles(): string[] {
  return lines(git(["ls-files", "--cached", "--others", "--exclude-standard", "--", ...GRAPH_ROOTS])).map(norm).filter((p) => !IGNORED.test(p) && existsSync(join(root, p)));
}

function allTestFiles(): string[] {
  return lines(git(["ls-files", "--cached", "--others", "--exclude-standard"])).map(norm).filter((p) => TEST.test(p) && !IGNORED.test(p) && existsSync(join(root, p)));
}

function flag(argv: string[], name: string): string | undefined {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : undefined;
}

export function main(argv: string[] = process.argv.slice(2), env: Record<string, string | undefined> = process.env): number {
  const base = flag(argv, "--base") ?? env.LOG_TEST_BASE ?? "origin/main";
  const named = flag(argv, "--changed");
  const changed = named ? named.split(",").map((p) => norm(p.trim())).filter(Boolean) : changedFiles(base);
  const files = trackedFiles();
  const tests = allTestFiles();
  const selection = env.LOG_TEST_FULL === "1" ? { full: true, reason: "LOG_TEST_FULL=1", tests } : selectTests(changed, tests, buildGraph([...files, ...changed], (p) => readFileSync(join(root, p), "utf8")));
  console.log(`affected tests against ${named ? "--changed" : base}: ${selection.full ? "the full suite" : `${selection.tests.length} file(s)`} (${selection.reason})`);
  if (argv.includes("--list")) {
    for (const test of selection.tests) console.log(test);
    return 0;
  }
  const run = spawnSync("bun", ["test", ...(selection.full ? [] : selection.tests.map((t) => `./${t}`))], { cwd: root, stdio: "inherit", windowsHide: true });
  return run.status ?? 1;
}

if (import.meta.main) process.exit(main());
