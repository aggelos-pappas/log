import { describe, expect, test } from "bun:test";
import { buildGraph, FULL_RUN_SHARE, importsOf, reachedFrom, selectTests } from "./affectedTests.ts";

const repo: Record<string, string> = {
  "src/a/b/index.ts": 'import { c } from "../c/index.ts";\nexport const b = c;\n',
  "src/a/c/index.ts": 'export { d } from "./helpers";\nexport const c = 1;\n',
  "src/a/c/helpers.ts": "export const d = 2;\n",
  "src/a/b/b.test.ts": 'import { b } from "./index.ts";\n',
  "src/a/c/c.test.ts": 'import { c } from "./index";\n',
  "src/a/e/e.test.ts": 'const { e } = await import("../e/client.js");\nconst run = () => spawnSync("python", [join(root, "python", "fakeApi", "engine.py")]);\n',
  "src/a/e/client.ts": 'export const e = () => spawnSync("python", [join(root, "python", "otherApi", "engine.py")]);\n',
  "src/a/f/f.test.ts": 'import { f } from "./index.ts";\n',
  "src/a/f/index.ts": "export const f = 1;\n",
  "python/fakeApi/engine.py": "from fakeApi import helpers\nfrom .wire import send\n",
  "python/fakeApi/helpers.py": "import json\n",
  "python/fakeApi/wire.py": "",
  "python/otherApi/engine.py": "",
};
const files = Object.keys(repo);
const tests = files.filter((f) => f.endsWith(".test.ts"));
const graph = buildGraph(files, (p) => repo[p]);

describe("pre-push runs only the tests a change can reach (parallel worktrees)", () => {
  test("relative imports resolve with or without the extension, through index files and .js specifiers", () => {
    const known = new Set(files);
    expect(importsOf("src/a/b/index.ts", repo["src/a/b/index.ts"], known)).toEqual(["src/a/c/index.ts"]);
    expect(importsOf("src/a/c/index.ts", repo["src/a/c/index.ts"], known)).toEqual(["src/a/c/helpers.ts"]);
    expect(importsOf("src/a/e/e.test.ts", repo["src/a/e/e.test.ts"], known)).toEqual(["src/a/e/client.ts"]);
  });

  test("python imports resolve from the python root and relative to the package", () => {
    expect(importsOf("python/fakeApi/engine.py", repo["python/fakeApi/engine.py"], new Set(files)).sort()).toEqual(["python/fakeApi/helpers.py", "python/fakeApi/wire.py"]);
  });

  test("a changed helper reaches every test that imports it, directly or through other files", () => {
    expect([...reachedFrom(["src/a/c/helpers.ts"], graph)].filter((f) => f.endsWith(".test.ts")).sort()).toEqual(["src/a/b/b.test.ts", "src/a/c/c.test.ts"]);
  });

  test("a python module reaches the test that spawns its engine by path, not one that only imports code spawning it, nor another engine of the same name", () => {
    expect(selectTests(["python/fakeApi/wire.py"], tests, graph, []).tests).toEqual(["src/a/e/e.test.ts"]);
    expect(selectTests(["python/otherApi/engine.py"], tests, graph, []).tests).toEqual([]);
  });

  test("a changed test runs itself, and the smoke set always runs", () => {
    expect(selectTests(["src/a/f/f.test.ts"], tests, graph, ["src/a/c/c.test.ts"]).tests).toEqual(["src/a/c/c.test.ts", "src/a/f/f.test.ts"]);
  });

  test("a change every test depends on, or one reaching most tests, runs the full suite", () => {
    expect(selectTests(["bun.lock"], tests, graph, [])).toMatchObject({ full: true });
    expect(selectTests(["vendor/twikit/x.py"], tests, graph, [])).toMatchObject({ full: true });
    expect(FULL_RUN_SHARE).toBeLessThan(1);
    expect(selectTests(["src/a/c/helpers.ts", "src/a/f/index.ts", "src/a/e/client.ts"], tests, graph, [])).toMatchObject({ full: true, reason: "4 of 4 test files are affected" });
  });

  test("a deleted file still reaches the tests that import it", () => {
    const importer: Record<string, string> = { ...repo, "src/a/f/index.ts": 'export { gone } from "./gone.ts";\n' };
    const withGone = buildGraph([...files, "src/a/f/gone.ts"], (p) => {
      if (!(p in importer)) throw new Error("deleted");
      return importer[p];
    });
    expect(selectTests(["src/a/f/gone.ts"], tests, withGone, []).tests).toEqual(["src/a/f/f.test.ts"]);
  });
});
