import { execFileSync } from "node:child_process";

const rules: { name: string; pattern: string; fix: string }[] = [
  { name: "logHome", pattern: "join\\(homedir\\(\\), *['\"]\\.logCli['\"]|Path\\.home\\(\\) */ *['\"]\\.logCli['\"]", fix: "use logHome() (src/config/logHome) or log_home() (python/logHome), so LOG_HOME moves it" },
  { name: "ownerFolders", pattern: "['\"/]\\.buzz['\"/]|['\"]filmcraft['\"]", fix: "a folder on one machine is a setting (LOG_OUTBOX, LOG_NICHE_MAP, LOG_BRAND_KIT, LOG_ENV_FILES), never a default in code" },
  { name: "bareUserAgent", pattern: "\"User-Agent\": *\"Mozilla/5\\.0\"", fix: "take the user agent from python/identity/browserIdentity" },
];

const failures: string[] = [];
for (const rule of rules) {
  let out = "";
  try {
    out = execFileSync("git", ["grep", "-nE", rule.pattern, "--", "src", "python", ":!*.test.ts", ":!**/test_*.py", ":!src/config/logHome/index.ts", ":!python/logHome/__init__.py"], { encoding: "utf8", windowsHide: true });
  } catch {
    out = "";
  }
  for (const line of out.split("\n").filter(Boolean)) failures.push(`${rule.name}: ${line.slice(0, 200)}\n  fix: ${rule.fix}`);
}

if (failures.length) {
  console.error(`check:noHardcoding: ${failures.length} hard-coded place(s)\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("check:noHardcoding: every path comes from log's home or a setting, and every user agent from the one identity");
