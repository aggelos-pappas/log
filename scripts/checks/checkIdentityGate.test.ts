import { describe, expect, test } from "bun:test";
import { identityGateProblems, repoTexts } from "./checkIdentityGate";

describe("check:identityGate refuses a new way out without the account's route (issue 47)", () => {
  test("the repo as it is has none", () => {
    expect(identityGateProblems(repoTexts())).toEqual([]);
  });

  test("a new engine fetching a media link with urllib is refused", () => {
    const problems = identityGateProblems({ "python/fakeApi/engine.py": ["from platformKit import engine as kit", "import urllib.request", "def main():", "    return kit.main({})"].join("\n") });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("python/fakeApi/engine.py:2");
  });

  test("an engine that never arms the route is refused", () => {
    expect(identityGateProblems({ "python/fakeApi/engine.py": "def main():\n    return 0\n" })[0]).toContain("never arms the account's route");
  });

  test("a browser opened outside the proxy gate is refused, one with no account is allowed by name", () => {
    expect(identityGateProblems({ "python/session/newSession.py": "browser = await playwright.chromium.launch(headless=False)\n" })).toHaveLength(1);
    expect(identityGateProblems({ "python/session/newSession.py": "async with AsyncCamoufox(headless=True) as b:\n" })).toHaveLength(1);
    expect(identityGateProblems({ "python/creative/renderViewer.py": "browser = p.chromium.launch(channel='msedge')\n" })).toEqual([]);
  });

  test("a gated launcher that drops the gate is refused", () => {
    expect(identityGateProblems({ "python/browser/browserDriver.py": "async with AsyncCamoufox(headless=False) as b:\n" })[0]).toContain("no longer goes through the proxy gate");
  });

  test("a TypeScript spawner of an engine without engineRoute is refused", () => {
    const spawner = "const run = spawnSync(process.env.LOG_PYTHON || 'python', [ENGINE, spec])\n";
    expect(identityGateProblems({ "src/fake/session/client.ts": spawner })).toHaveLength(1);
    expect(identityGateProblems({ "src/fake/session/client.ts": `const routed = engineRoute(account)\n${spawner}` })).toEqual([]);
  });

  test("Bun's own fetch to a platform is refused", () => {
    expect(identityGateProblems({ "src/fake/media/client.ts": "const res = await fetch('https://cdn.discordapp.com/a.png')\n" })).toHaveLength(1);
    expect(identityGateProblems({ "src/fake/media/client.ts": "const res = await fetch('https://api.example.org/a')\n" })).toEqual([]);
  });
});
