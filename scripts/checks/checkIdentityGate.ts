import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dir, "..", "..");

export const OUTSIDE_PLATFORMS: Readonly<Record<string, string>> = {
  "python/browser/adsPowerBrowser.py": "AdsPower's local API on this machine",
  "python/browser/camoufoxSource.py": "Camoufox's release list, no account",
  "python/controlService/clerkRoutes.py": "the console's sign-in service, no account",
  "python/controlService/mailer.py": "the console's mail service, no account",
  "python/judge/ask.py": "the judge model on 127.0.0.1",
  "python/instagramApi/host.py": "the account's own host on 127.0.0.1",
  "python/twitterApi/host.py": "the account's own host on 127.0.0.1",
  "scripts/browserView/hostBench.py": "waits for its own servers on 127.0.0.1",
  "scripts/cards/cardShots.py": "waits for its own server on 127.0.0.1",
  "scripts/browserView/routeBench.py": "times the Hermes plugin routes on 127.0.0.1, no account",
};

export const GATED_LAUNCHERS: Readonly<Record<string, RegExp>> = {
  "python/browser/proxyGate.py": /def install_guards/,
  "python/browser/browserDriver.py": /launch_kwargs\(|chromium_launch\(|gate_attached\(/,
  "python/session/publishSession.py": /launch_kwargs\(/,
  "python/browser/cdpState.py": /route\.fulfill\(/,
};

export const NO_ACCOUNT_BROWSERS: Readonly<Record<string, string>> = {
  "python/creative/renderViewer.py": "renders a local file, no account",
  "python/fixtures/browserViewerFixture.py": "a test page, no account",
  "scripts/browserView/hostBench.py": "benchmarks the viewer on 127.0.0.1, no account",
  "scripts/browserView/inputBench.py": "benchmarks input on a local page, no account",
  "scripts/cards/cardShots.py": "screenshots cards on 127.0.0.1, no account",
  "scripts/browserView/openBench.py": "times a bare headless launch on a local page, no account",
  "scripts/browserView/stateBench.py": "times the viewer state on a local busy page, no account",
};

export const ENGINE_SPAWNERS_WITHOUT_SPEC: Readonly<Record<string, string>> = {
  "src/scaffold/platform/helpers/templates.ts": "text of a generated test, which passes a route",
  "scripts/bench/agentPaths.ts": "times hooks, the router and logMcp on a scratch db; it never runs a platform engine",
};

const OTHER_CLIENT = /^\s*(import|from)\s+(urllib\.request|urllib3|requests|httpx|aiohttp|websockets?|http\.client)\b|\burlopen\(|\bsocket\.create_connection\(|\bwebsocket\.create_connection\(/;
const LAUNCH = /\b(chromium|firefox|webkit)\.launch\(|launch_persistent_context\(|\bAsyncCamoufox\(|\bCamoufox\(|connect_over_cdp\(|\bNewBrowser\(|\bAsyncNewBrowser\(/;
const ARMS = /accountRoute\.arm\(|_route\.arm\(|\bkit\.main\(/;
const PLATFORM_FETCH = /\bfetch\(\s*[`'"]https?:\/\/[^`'"]*(facebook\.com|fbcdn\.net|x\.com|twitter\.com|twimg\.com|discord(app)?\.(com|gg)|slack\.com|instagram\.com|cdninstagram\.com|linkedin\.com|licdn\.com|reddit\.com|redd\.it|tiktok\.com)/;

function skipped(line: string): boolean {
  return /^\s*#/.test(line) || /^\s*\/\//.test(line);
}

export function identityGateProblems(texts: Record<string, string>): string[] {
  const problems: string[] = [];
  for (const [name, text] of Object.entries(texts)) {
    const lines = text.split(/\r?\n/);
    if (name.endsWith(".py")) {
      lines.forEach((line, i) => {
        if (skipped(line)) return;
        if (OTHER_CLIENT.test(line) && !OUTSIDE_PLATFORMS[name]) problems.push(`${name}:${i + 1}: a network client outside curl_cffi: it skips the account's proxy and browser identity. Use python/identity/accountRoute.py (session or download), or list it in OUTSIDE_PLATFORMS with why it never reaches a platform`);
        if (LAUNCH.test(line) && !GATED_LAUNCHERS[name] && !NO_ACCOUNT_BROWSERS[name]) problems.push(`${name}:${i + 1}: a browser launch outside the proxy gate: open it through browser/browserDriver.py (launch_kwargs, chromium_launch or gate_attached)`);
      });
      if (GATED_LAUNCHERS[name] && !GATED_LAUNCHERS[name].test(text)) problems.push(`${name}: launches a browser but no longer goes through the proxy gate (${GATED_LAUNCHERS[name].source})`);
      if (/^python\/\w+Api\/engine\.py$/.test(name) && !ARMS.test(text)) problems.push(`${name}: an engine that never arms the account's route: run it on platformKit's kit.main, or call accountRoute.arm(platform, spec) before any call`);
      if (name === "python/platformKit/engine.py" && !/accountRoute\.arm\(/.test(text)) problems.push(`${name}: the kit engine no longer arms the account's route`);
    } else if (name.endsWith(".ts")) {
      if (/\bspawn(Sync)?\([^\n]*(\bENGINE\b|\.engine\b|engine\.py)/.test(text) && !/\bengineRoute\(/.test(text) && !ENGINE_SPAWNERS_WITHOUT_SPEC[name]) problems.push(`${name}: spawns a platform engine without engineRoute: its spec would carry no route, and the engine refuses it (routeMissing)`);
      lines.forEach((line, i) => {
        if (!skipped(line) && PLATFORM_FETCH.test(line)) problems.push(`${name}:${i + 1}: Bun's fetch to a platform: it goes out from this machine with Bun's TLS. Call the platform through its engine`);
      });
    }
  }
  return problems;
}

function files(path: string): string[] {
  const full = join(root, path);
  return (readdirSync(full, { recursive: true }) as string[])
    .map((f) => join(full, f))
    .filter((f) => /\.(py|ts)$/.test(f) && !/(\.test\.ts|[\\/]test_\w+\.py|Test\.py|\.d\.ts)$/.test(f) && !/[\\/](checks|node_modules)[\\/]/.test(relative(root, f)) && statSync(f).isFile());
}

export function repoTexts(): Record<string, string> {
  const texts: Record<string, string> = {};
  for (const dir of ["python", "src", "scripts"]) for (const f of files(dir)) texts[relative(root, f).replace(/\\/g, "/")] = readFileSync(f, "utf8");
  return texts;
}

if (import.meta.main) {
  const texts = repoTexts();
  const problems = identityGateProblems(texts);
  if (problems.length) {
    console.error(`identityGate: ${problems.length} way(s) out without the account's proxy and identity (issue 47):\n${problems.map((p) => `  ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`identityGate: ${Object.keys(texts).length} files, every engine call and browser goes out through the account's route.`);
}
