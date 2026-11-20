import { execFile, execFileSync } from "node:child_process";
import { existsSync, promises as fsp, readdirSync, statSync, watch } from "node:fs";
import { getState, putState } from "../../storage/state/index.ts";
import { join } from "node:path";
import { logHome } from "../../config/logHome/index.ts";

const WATCHED = ["src", "python", join("vendor", "fbk", "src")];
const CODE = /\.(ts|py)$/;

export interface ProxyState {
  proxyPid: number;
  waitingOn: string | null;
  lastError: string | null;
}

export function readProxyState(file = process.env.LOG_MCP_RELOAD_FILE || join(logHome(), "mcp", "reload.json")): ProxyState | null {
  return getState<ProxyState>("mcpReload", file, { legacyFile: file })?.body ?? null;
}

export function serverStampFile(): string {
  return process.env.LOG_MCP_STAMP_FILE || join(logHome(), "mcp", "server.json");
}

export function codeStamp(root: string): number {
  let newest = 0;
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name === "node_modules" || name.name === "__pycache__" || name.name.startsWith(".")) continue;
      const path = join(dir, name.name);
      if (name.isDirectory()) walk(path);
      else if (CODE.test(name.name) && !name.name.includes(".test.")) newest = Math.max(newest, statSync(path).mtimeMs);
    }
  };
  for (const sub of WATCHED) if (existsSync(join(root, sub))) walk(join(root, sub));
  return newest;
}

export async function codeStampAsync(root: string): Promise<number> {
  let newest = 0;
  const walk = async (dir: string): Promise<void> => {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const name of entries) {
      if (name.name === "node_modules" || name.name === "__pycache__" || name.name.startsWith(".")) continue;
      const path = join(dir, name.name);
      if (name.isDirectory()) await walk(path);
      else if (CODE.test(name.name) && !name.name.includes(".test.")) {
        try {
          newest = Math.max(newest, (await fsp.stat(path)).mtimeMs);
        } catch {}
      }
    }
  };
  for (const sub of WATCHED) if (existsSync(join(root, sub))) await walk(join(root, sub));
  return newest;
}

export interface StampWatcher {
  current(): number;
  refresh(): boolean;
  refreshAsync(): Promise<boolean>;
  close(): void;
}

export interface StampWatcherDeps {
  walk?: (root: string) => number;
  walkAsync?: (root: string) => Promise<number>;
  watch?: (dir: string, onChange: (file: string | null) => void) => { close(): void } | null;
  now?: () => number;
  backstopMs?: number;
}

function watchTree(dir: string, onChange: (file: string | null) => void): { close(): void } | null {
  try {
    const watcher = watch(dir, { recursive: true }, (_event, file) => onChange(file ? String(file) : null));
    watcher.on("error", () => onChange(null));
    return watcher;
  } catch {
    return null;
  }
}

export function codeStampWatcher(root: string, deps: StampWatcherDeps = {}): StampWatcher {
  const walk = deps.walk ?? codeStamp;
  const walkAsync = deps.walkAsync ?? (deps.walk ? async (dir: string) => walk(dir) : codeStampAsync);
  const now = deps.now ?? Date.now;
  let walking: Promise<boolean> | null = null;
  const backstopMs = deps.backstopMs ?? 60_000;
  let stamp = walk(root);
  let walkedAt = now();
  let dirty = false;
  const watchers: { close(): void }[] = [];
  let watching = true;
  for (const sub of WATCHED) {
    const dir = join(root, sub);
    if (!existsSync(dir)) continue;
    const handle = (deps.watch ?? watchTree)(dir, (file) => {
      if (file === null || CODE.test(file)) dirty = true;
    });
    if (handle) watchers.push(handle);
    else watching = false;
  }
  return {
    current: () => stamp,
    refresh() {
      if (!dirty && watching && now() - walkedAt < backstopMs) return false;
      dirty = false;
      walkedAt = now();
      const next = walk(root);
      const changed = next !== stamp;
      stamp = next;
      return changed;
    },
    refreshAsync() {
      if (walking) return walking;
      if (!dirty && watching && now() - walkedAt < backstopMs) return Promise.resolve(false);
      dirty = false;
      walkedAt = now();
      walking = walkAsync(root)
        .then((next) => {
          const changed = next !== stamp;
          stamp = next;
          return changed;
        })
        .catch(() => false)
        .finally(() => {
          walking = null;
        });
      return walking;
    },
    close() {
      for (const handle of watchers) handle.close();
    },
  };
}

export function recordServerStart(root: string, file = serverStampFile()): void {
  putState("mcpServerStart", file, { pid: process.pid, startedAt: new Date().toISOString(), stamp: codeStamp(root) });
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function staleServerLine(root: string, file = serverStampFile(), stampNow?: number): string | null {
  const started = getState<{ pid: number; startedAt: string; stamp: number }>("mcpServerStart", file, { legacyFile: file })?.body;
  if (!started) return null;
  if (!alive(started.pid)) return null;
  const now = stampNow ?? codeStamp(root);
  if (now <= started.stamp) return null;
  const proxy = readProxyState();
  if (proxy && alive(proxy.proxyPid)) {
    if (proxy.lastError) return `>>> The log MCP server's new code didn't start: ${proxy.lastError}. It keeps running the code from ${new Date(started.stamp).toISOString().slice(0, 16)}Z and reloads by itself on the next change, with no restart of Claude Code (rule 167). Fix what failed.`;
    if (proxy.waitingOn) return `>>> The log MCP server has newer code waiting and reloads by itself the moment ${proxy.waitingOn} finishes, with no restart of Claude Code (rule 167).`;
    return null;
  }
  return `>>> The log MCP server (pid ${started.pid}, started ${started.startedAt.slice(0, 16)}Z) is running older code than the checkout: log-cli changed at ${new Date(now).toISOString().slice(0, 16)}Z. Its tool descriptions and rules are stale until it restarts: the owner restarts the Claude app or starts a new chat (in a terminal claude, reconnects the log server with /mcp). Its calls still run the checkout's engine. A hand-run \`log …\` command is never the way around it (rule 163).`;
}

const LOCAL_PATHS = ["src", "python", "vendor", "bin", "scripts", "package.json"];

export function uncommittedFiles(root: string, run: (args: string[]) => string = (args) => execFileSync("git", args, { windowsHide: true, cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })): string[] {
  try {
    return run(["status", "--porcelain", "--", ...LOCAL_PATHS]).split(/\r?\n/).map((l) => l.slice(3).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function uncommittedFilesAsync(root: string): Promise<string[]> {
  return new Promise((resolve) => {
    execFile("git", ["status", "--porcelain", "--", ...LOCAL_PATHS], { windowsHide: true, cwd: root, encoding: "utf8" }, (error, stdout) => {
      resolve(error ? [] : String(stdout).split(/\r?\n/).map((l) => l.slice(3).trim()).filter(Boolean));
    });
  });
}

export function localChangesLine(root: string, files: string[] = uncommittedFiles(root)): string | null {
  if (files.length === 0) return null;
  const shown = files.slice(0, 12).join(", ") + (files.length > 12 ? ` and ${files.length - 12} more` : "");
  return `>>> UNCOMMITTED LOCAL CHANGES in log-cli's code (${files.length}): ${shown}. They aren't committed, may be someone else's work in progress, and the running engine and MCP already run them. Before changing code, read what each one changed (git diff); never overwrite, revert, stage, publish or ship them as your own without the owner (rule 4).`;
}
