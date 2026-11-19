import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const pythonDir = join(import.meta.dir, "..", "..", "..", "python");

function py(code: string, hideMyuri = false): any {
  const hide = hideMyuri ? "import builtins\n_real = builtins.__import__\ndef _no(name, *a, **k):\n    if name == 'myuri' or name.startswith('myuri.'):\n        raise ImportError(name)\n    return _real(name, *a, **k)\nbuiltins.__import__ = _no\n" : "";
  const script = `import sys, json\nsys.path.insert(0, ${JSON.stringify(pythonDir)})\n${hide}${code}`;
  const run = spawnSync(process.env.LOG_PYTHON || "python", ["-I", "-c", script], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout.trim().split("\n").pop() as string);
}

describe("Myuri drives log's human input", () => {
  test("Myuri is installed for log's Python", () => {
    expect(py(`from human import myuriInput as m\nprint(json.dumps(m.available()))`)).toBe(true);
  });

  test("the same account gets the same hand, another account a different one", () => {
    const out = py(`from human import myuriInput as m
a = m.seed_for("C:/x/facebook/one/device.json"); b = m.seed_for("C:/x/facebook/two/device.json")
p1 = m.path((10, 20), (800, 450), m.make_stream(a)); p2 = m.path((10, 20), (800, 450), m.make_stream(a)); p3 = m.path((10, 20), (800, 450), m.make_stream(b))
print(json.dumps([a == m.seed_for("C:/x/facebook/one/device.json"), p1 == p2, p1 == p3, len(p1), p1[-1]]))`);
    expect(out[0]).toBe(true);
    expect(out[1]).toBe(true);
    expect(out[2]).toBe(false);
    expect(out[3]).toBeGreaterThan(20);
    expect(out[4].slice(1)).toEqual([800, 450]);
  });

  test("a typed reply lands exactly, typos and all corrected", () => {
    const out = py(`from human import myuriInput as m
texts = ["hey mate, sounds good to me", "Can you DM me the link?", "ok! 100% (tomorrow) @someone #log", "Dublin, Ireland"]
res = []
for seed in range(1, 40):
    for t in texts:
        steps = m.keystrokes(t, m.make_stream(seed))
        res.append([m.typed_text(steps) == t, any(k == "Backspace" for _a, kind, k in steps if kind == "down")])
print(json.dumps([all(r[0] for r in res), any(r[1] for r in res)]))`);
    expect(out[0]).toBe(true);
    expect(out[1]).toBe(true);
  });

  test("passwords, codes and PINs are typed with no typos", () => {
    const out = py(`from human import myuriInput as m
bad = 0
for seed in range(1, 80):
    for t in ["hunter2Password!", "482913", "123456", "me@example.com"]:
        steps = m.keystrokes(t, m.make_stream(seed), secret=True)
        bad += any(k == "Backspace" for _a, kind, k in steps) or m.typed_text(steps) != t
print(json.dumps(bad))`);
    expect(out).toBe(0);
  });

  test("timing is human: keys are not on a fixed beat", () => {
    const out = py(`from human import myuriInput as m
steps = m.keystrokes("sounds good to me, talk soon", m.make_stream(7), secret=True)
downs = [a for a, kind, _k in steps if kind == "down"]
gaps = [round(b - a) for a, b in zip(downs, downs[1:])]
print(json.dumps([len(set(gaps)), min(gaps), max(gaps)]))`);
    expect(out[0]).toBeGreaterThan(10);
    expect(out[2]).toBeGreaterThan(out[1] * 2);
  });

  test("scroll is notched mouse-wheel steps that add up to the distance", () => {
    const out = py(`from human import myuriInput as m
steps = m.wheel(0, 900, m.make_stream(3))
print(json.dumps([len(steps), sum(b for _t, kind, _a, b in steps if kind == "wheel"), sorted({abs(b) for _t, kind, _a, b in steps if kind == "wheel"})]))`);
    expect(out[0]).toBeGreaterThan(3);
    expect(Math.abs(out[1] - 900)).toBeLessThanOrEqual(100);
    expect(out[2].every((d: number) => d % 100 === 0)).toBe(true);
  });

  test("typing plays every key through a page and releases anything held", () => {
    const out = py(`import asyncio
from human import myuriInput as m
class K:
    def __init__(self): self.events = []
    async def down(self, k): self.events.append(("down", k))
    async def up(self, k): self.events.append(("up", k))
    async def insert_text(self, k): self.events.append(("insert", k))
class P:
    def __init__(self): self.keyboard = K()
p = P()
orig = m.keystrokes
m.keystrokes = lambda t, s, secret=False: [(x[0] / 50, x[1], x[2]) for x in orig(t, s, secret)]
asyncio.run(m.type_text(p, "Hi there", seed=5))
held = {}
for kind, k in p.keyboard.events:
    held[k] = held.get(k, 0) + (1 if kind == "down" else -1 if kind == "up" else 0)
print(json.dumps([m.typed_text([(0, kind, k) for kind, k in p.keyboard.events]), [k for k, n in held.items() if n > 0]]))`);
    expect(out[0]).toBe("Hi there");
    expect(out[1]).toEqual([]);
  });

  test("without Myuri log falls back to its own pacing and still types exactly", () => {
    const out = py(`from human import myuriInput as m
steps = m.keystrokes("Hi, Dublin é", m.make_stream(1))
print(json.dumps([m.available(), m.typed_text(steps), m.path((0, 0), (5, 5), m.make_stream(1))]))`, true);
    expect(out).toEqual([false, "Hi, Dublin é", [[0, 5, 5]]]);
  });

  test("the mouse plans with Myuri, and Camoufox humanize is off for those launches", () => {
    const out = py(`from browser import visibleBrowser as v
from human.humanMouse import HumanMouse
print(json.dumps([v.own_trajectory_humanize(), hasattr(HumanMouse, "_play"), hasattr(HumanMouse, "planned")]))`);
    expect(out).toEqual([0, true, true]);
  });

  test("a launch config with humanize 0 turns Camoufox humanize off, any other value turns it on", () => {
    const out = py(`from device import deviceProfile as d
import inspect
src = inspect.getsource(d.launch_config)
print(json.dumps(['config["humanize"] = False' in src, 'if float(visible["humanize"]) > 0' in src]))`);
    expect(out).toEqual([true, true]);
  });

  test("no session types on a fixed beat any more", () => {
    const { readFileSync } = require("node:fs");
    for (const f of ["session/inspectSession.py", "session/publishSession.py", "login/autoLogin.py"]) {
      const text = readFileSync(join(pythonDir, f), "utf8");
      expect(text).not.toMatch(/keyboard\.type\(|press_sequentially\(/);
      expect(text).toContain("myuriInput.type_text");
    }
  });
});
