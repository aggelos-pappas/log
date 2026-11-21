import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const BASELINE = join(import.meta.dir, "docLinksBaseline.json");
const REPO_URL = /^https:\/\/github\.com\/matthewdonsemail-lab\/log\/(?:blob|tree)\/[^/]+\//;
const ROOT_PAGES = ["README.md", "AGENTS.md", "CHANGELOG.md", "skills.md"];
const DOC_FOLDERS = ["docs"];
export const START = "README.md";

export type Graph = { pages: string[]; links: Record<string, string[]>; broken: { from: string; target: string }[] };
export type Baseline = { orphans: string[]; deadEnds: string[] };

function markdownUnder(rel: string): string[] {
  const full = join(ROOT, rel);
  if (!existsSync(full)) return [];
  if (!statSync(full).isDirectory()) return rel.endsWith(".md") ? [rel] : [];
  return readdirSync(full).flatMap((name) => markdownUnder(`${rel}/${name}`));
}

export function targetsOf(text: string): string[] {
  const body = text.replace(/\r\n/g, "\n").replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
  const inline = [...body.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map((m) => m[1]);
  const reference = [...body.matchAll(/^[ \t]*\[[^\]\n]+\]:[ \t]*<?(\S+?)>?[ \t]*$/gm)].map((m) => m[1]);
  const anchors = [...body.matchAll(/<a\s[^>]*href="([^"\n]+)"/g)].map((m) => m[1]);
  return [...inline, ...reference, ...anchors];
}

export function resolveTarget(from: string, target: string): string | null {
  let path = target.trim();
  if (REPO_URL.test(path)) path = `/${path.replace(REPO_URL, "")}`;
  else if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith("#") || path.startsWith("//")) return null;
  path = path.split("#")[0].split("?")[0];
  if (!path) return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    return path;
  }
  const joined = path.startsWith("/") ? path.slice(1) : join(dirname(from), path);
  return normalize(joined).replaceAll("\\", "/").replace(/\/$/, "");
}

export function buildGraph(pages: string[], read: (page: string) => string, exists: (path: string) => boolean): Graph {
  const set = new Set(pages);
  const links: Record<string, string[]> = {};
  const broken: Graph["broken"] = [];
  for (const page of pages) {
    const out = new Set<string>();
    for (const target of targetsOf(read(page))) {
      const resolved = resolveTarget(page, target);
      if (resolved === null) continue;
      if (resolved.startsWith("..") || !exists(resolved)) {
        broken.push({ from: page, target });
        continue;
      }
      const page2 = set.has(resolved) ? resolved : set.has(`${resolved}/README.md`) ? `${resolved}/README.md` : null;
      if (page2 && page2 !== page) out.add(page2);
    }
    links[page] = [...out].sort();
  }
  return { pages: [...pages].sort(), links, broken };
}

export function inboundOf(graph: Graph): Record<string, number> {
  const inbound: Record<string, number> = Object.fromEntries(graph.pages.map((p) => [p, 0]));
  for (const targets of Object.values(graph.links)) for (const t of targets) inbound[t] = (inbound[t] ?? 0) + 1;
  return inbound;
}

export function orphansOf(graph: Graph): string[] {
  const inbound = inboundOf(graph);
  return graph.pages.filter((p) => p !== START && !inbound[p]);
}

export function deadEndsOf(graph: Graph): string[] {
  return graph.pages.filter((p) => !graph.links[p]?.length);
}

export function depthsOf(graph: Graph, start = START): Record<string, number> {
  const depth: Record<string, number> = { [start]: 0 };
  const queue = [start];
  while (queue.length) {
    const page = queue.shift()!;
    for (const next of graph.links[page] ?? []) {
      if (next in depth) continue;
      depth[next] = depth[page] + 1;
      queue.push(next);
    }
  }
  return depth;
}

export function docPages(): string[] {
  return [...ROOT_PAGES.filter((p) => existsSync(join(ROOT, p))), ...DOC_FOLDERS.flatMap(markdownUnder)].sort();
}

export function measure(): Graph {
  return buildGraph(docPages(), (page) => readFileSync(join(ROOT, page), "utf8"), (path) => existsSync(join(ROOT, path)));
}

if (import.meta.main) {
  const graph = measure();
  const now: Baseline = { orphans: orphansOf(graph), deadEnds: deadEndsOf(graph) };
  const reached = Object.keys(depthsOf(graph)).length;
  const summary = `${graph.pages.length} pages, ${graph.broken.length} broken links, ${now.orphans.length} orphans, ${now.deadEnds.length} dead ends, ${reached} reachable from ${START}`;
  if (graph.broken.length) {
    console.error(`Docs link to pages that are not there (#255):\n${graph.broken.map((b) => `  - ${b.from}: ${b.target}`).join("\n")}\nFix the path or drop the link.`);
    process.exit(1);
  }
  if (process.argv.includes("--write")) {
    writeFileSync(BASELINE, JSON.stringify(now, null, 2) + "\n");
    console.log(`docLinks: wrote ${relative(ROOT, BASELINE)} (${summary})`);
    process.exit(0);
  }
  const base: Baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : { orphans: [], deadEnds: [] };
  const newOrphans = now.orphans.filter((p) => !base.orphans.includes(p));
  const newDeadEnds = now.deadEnds.filter((p) => !base.deadEnds.includes(p));
  if (newOrphans.length || newDeadEnds.length) {
    const lines = [...newOrphans.map((p) => `  - ${p}: no other doc links to it. Link it from its folder's README or the page above it.`), ...newDeadEnds.map((p) => `  - ${p}: links to no other doc. Add a Related line linking up to its index and across to its neighbours.`)];
    console.error(`Docs that agents cannot reach or cannot leave (#255):\n${lines.join("\n")}`);
    process.exit(1);
  }
  const fewer = base.orphans.length + base.deadEnds.length - now.orphans.length - now.deadEnds.length;
  console.log(`docLinks: ${summary}${fewer > 0 ? `; ${fewer} fewer than the baseline: run with --write to lock it in` : ""}`);
}
