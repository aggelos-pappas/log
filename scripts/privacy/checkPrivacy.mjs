import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { countByFolder, fingerprintOf, formatFinding, isAllowed, isSkippedPath, looksBinary, normalisePath, scanPath, scanText } from "../../src/privacy/scan/index.ts";
import { denylistPath, loadAllowlist, loadDenylist } from "../../src/privacy/scan/client.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ALLOWLIST_FILE = join(root, "scripts", "privacy", "allowlist.json");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : args[at + 1];
};
const staged = flag("--staged");
const limit = Number(option("--limit", "60"));
const paths = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--limit");

const git = (...gitArgs) => spawnSync("git", gitArgs, { cwd: root, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
const lines = (out) => out.toString("utf8").split(/\r?\n/).filter(Boolean);

function indexedFiles(paths) {
  const files = new Map();
  const wanted = paths.filter((path) => !isSkippedPath(path));
  for (let start = 0; start < wanted.length; start += 64) {
    const batch = wanted.slice(start, start + 64);
    const answer = spawnSync("git", ["cat-file", "--batch"], { cwd: root, windowsHide: true, maxBuffer: 256 * 1024 * 1024, input: batch.map((path) => `:${path}\n`).join("") });
    if (answer.status !== 0) throw new Error("Could not read staged files for the privacy check");
    let offset = 0;
    for (const path of batch) {
      const end = answer.stdout.indexOf(10, offset);
      const header = answer.stdout.subarray(offset, end).toString("utf8");
      const found = /^[a-f0-9]+ blob (\d+)$/.exec(header);
      if (end < 0 || !found) throw new Error("Unexpected staged file response in the privacy check");
      const size = Number(found[1]);
      offset = end + 1;
      if (offset + size >= answer.stdout.length || answer.stdout[offset + size] !== 10) throw new Error("Incomplete staged file response in the privacy check");
      files.set(path, answer.stdout.subarray(offset, offset + size));
      offset += size + 1;
    }
  }
  return files;
}

function targets() {
  if (staged) {
    const paths = lines(git("diff", "--cached", "--name-only", "--diff-filter=ACMR").stdout);
    const files = indexedFiles(paths);
    return paths.map((path) => ({ path, read: () => files.get(path) ?? null }));
  }
  const list = paths.length ? paths.map(normalisePath) : lines(git("ls-files").stdout);
  return list.map((path) => ({ path, read: () => (existsSync(join(root, path)) ? readFileSync(join(root, path)) : null) }));
}

function gitleaksFindings(allowlist) {
  if (flag("--noGitleaks") || paths.length) return { ran: false, findings: [] };
  if (spawnSync("gitleaks", ["version"], { windowsHide: true }).status !== 0) return { ran: false, findings: [] };
  const dir = mkdtempSync(join(tmpdir(), "logPrivacy-"));
  const report = join(dir, "gitleaks.json");
  const common = ["--redact", "--no-banner", "--exit-code", "0", "--report-format", "json", "--report-path", report];
  let scanArgs;
  if (staged) scanArgs = ["git", "--pre-commit", "--staged", ...common, root];
  else {
    const base = git("rev-parse", "--verify", "--quiet", "origin/main").status === 0 ? "origin/main" : null;
    if (!base) return { ran: false, findings: [] };
    scanArgs = ["git", `--log-opts=${base}..HEAD`, ...common, root];
  }
  spawnSync("gitleaks", scanArgs, { cwd: root, windowsHide: true, stdio: "ignore" });
  let raw = [];
  try {
    raw = JSON.parse(readFileSync(report, "utf8"));
  } catch {
    raw = [];
  }
  rmSync(dir, { recursive: true, force: true });
  const findings = raw
    .map((leak) => ({ path: normalisePath(leak.File ?? ""), line: leak.StartLine ?? 0, rule: "gitleaks", masked: `${leak.RuleID} (gitleaks, redacted)`, fingerprint: fingerprintOf("gitleaks", `${leak.RuleID}:${leak.Fingerprint ?? leak.File}`) }))
    .filter((f) => !isAllowed(f, allowlist.findings));
  return { ran: true, findings };
}

function main() {
  const allowlist = loadAllowlist(ALLOWLIST_FILE);
  const denylist = loadDenylist();
  const options = { denylist, allowlist };
  const findings = [];
  let scanned = 0;
  for (const { path, read } of targets()) {
    findings.push(...scanPath(path, options));
    if (isSkippedPath(path)) continue;
    const bytes = read();
    if (!bytes || looksBinary(bytes)) continue;
    scanned++;
    findings.push(...scanText(path, Buffer.from(bytes).toString("utf8"), options));
  }
  const leaks = gitleaksFindings(allowlist);
  findings.push(...leaks.findings);
  const scope = staged ? "staged files" : paths.length ? "given files" : "tracked files";
  const extras = [denylist.length ? `the denylist (${denylist.length} terms)` : `no denylist at ${denylistPath()}`, leaks.ran ? "gitleaks" : "gitleaks not run"].join(", ");
  if (!findings.length) {
    console.log(`check:privacy OK: ${scanned} ${scope} scanned, ${extras}`);
    return 0;
  }
  console.error(`check:privacy FAIL: ${findings.length} hit(s) in ${scanned} ${scope} (${extras}). Values are masked; the [id] is the fingerprint for scripts/privacy/allowlist.json.`);
  for (const f of findings.slice(0, limit)) console.error(`  ${formatFinding(f)}`);
  if (findings.length > limit) console.error(`  … ${findings.length - limit} more (--limit <n> to see them)`);
  console.error("By folder:");
  for (const [folder, count] of countByFolder(findings)) console.error(`  ${folder}: ${count}`);
  const byRule = new Map();
  for (const f of findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  console.error(`By rule: ${[...byRule].map(([rule, count]) => `${rule} ${count}`).join(", ")}`);
  console.error("Fix: remove or redact the value (src/privacy/redact), move private notes out of the repo, or add a justified entry to scripts/privacy/allowlist.json.");
  return 1;
}

process.exit(main());
