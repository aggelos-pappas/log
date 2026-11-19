import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..", "..");
const ALLOWED = ["python/identity/", "src/identity/"];
const ROOTS = ["python", "src", "vendor/fbk/src", "vendor/twikit/twikit", "vendor/gabrielSlack/gabriel", "vendor/openLinkedinApi/open_linkedin_api", "vendor/instagrapi/instagrapi/mixins/public.py", "vendor/reverseChud/src"];
const RULES: Array<[RegExp, string]> = [
  [/impersonate\s*=\s*["'](chrome|firefox|safari|edge)\w*["']/i, "an impersonate target written in place"],
  [/IMPERSONATE\w*\s*=\s*["'](chrome|firefox|safari|edge)/i, "an IMPERSONATE constant pinned in place"],
  [/(Chrome|Firefox)\/1\d\d\.0/, "a browser user agent written in place"],
];
const OLD_PINS = /else\s+\{?\s*["'](chrome\d+|safari\w+|Mozilla\/5\.0)/;

function files(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return (readdirSync(full, { recursive: true }) as string[]).map((f) => join(full, f)).filter((f) => /\.(py|ts)$/.test(f) && !/(test|Test|fixture|\.d\.ts)/.test(f));
}

export function identityProblems(texts: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const [name, text] of Object.entries(texts)) {
    if (ALLOWED.some((a) => name.startsWith(a))) continue;
    text.split(/\r?\n/).forEach((line, i) => {
      if (OLD_PINS.test(line) || /^\s*#/.test(line) || /^\s*\/\//.test(line) || line.includes("``")) return;
      for (const [rule, what] of RULES) if (rule.test(line)) problems.push(`${name}:${i + 1}: ${what}; take it from log's one identity (python/identity/browserIdentity.py or src/identity)`);
    });
  }
  return problems;
}

if (import.meta.main) {
  const texts: Record<string, string> = {};
  for (const r of ROOTS) for (const f of files(r)) texts[relative(root, f).replace(/\\/g, "/")] = readFileSync(f, "utf8");
  const problems = identityProblems(texts);
  if (problems.length) {
    console.error(`oneIdentity: ${problems.length} place(s) pin a browser identity of their own:\n${problems.map((p) => `  ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`oneIdentity: ${Object.keys(texts).length} files, every HTTP client takes its browser from log's one identity.`);
}
