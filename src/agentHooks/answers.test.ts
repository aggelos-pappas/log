import { describe, expect, test } from "bun:test";
import { answerEvent, cachedFreshness, hookStages, hooksForEvent, mergeAnswers, sentAtOf, waitingHooksFirst } from "./answers/index.ts";
import { REFUSING_HOOKS } from "./answers/index.ts";
import type { AgentHook } from "./registry/types.ts";
import { claudeCodeHooks, EVENT_SCRIPT, HOOK_SERVICE_URL, hooksFor, joinedMatcher } from "./registry/index.ts";

type Handler = { type: string; url?: string; command?: string; args?: string[] };
const handlersOf = (event: string) => (hooksFor("claudeCode")[event] as { matcher?: string; hooks: Handler[] }[]).flatMap((g) => g.hooks);

describe("claudeCode hooks reach log through the warm service", () => {
  test("prompt, after-tool and stop are one http request each", () => {
    for (const event of ["UserPromptSubmit", "PostToolUse", "Stop"]) {
      const handlers = handlersOf(event);
      expect(handlers).toHaveLength(1);
      expect(handlers[0]).toMatchObject({ type: "http", url: `${HOOK_SERVICE_URL}/${event}` });
    }
  });

  test("session start is one exec-form bun run of the event runner, no shell", () => {
    const [handler] = handlersOf("SessionStart");
    expect(handler).toMatchObject({ type: "command", command: "bun", args: [`\${CLAUDE_PROJECT_DIR}/${EVENT_SCRIPT}`, "SessionStart"] });
  });

  test("the refusing hooks stay their own exec-form processes, so a dead service lets nothing through", () => {
    const handlers = handlersOf("PreToolUse");
    expect(handlers.map((h) => h.args?.[0])).toEqual(REFUSING_HOOKS.map((s) => `\${CLAUDE_PROJECT_DIR}/${s}`));
    for (const h of handlers) expect(h).toMatchObject({ type: "command", command: "bun" });
  });

  test("a served event's matcher covers every hook it answers, and none when one hook has none", () => {
    const a = { event: "PostToolUse", script: "a.ts", timeout: 5, matcher: "Bash|mcp__log__.*" } as AgentHook;
    const b = { event: "PostToolUse", script: "b.ts", timeout: 5, matcher: "Monitor|Bash" } as AgentHook;
    const c = { event: "PostToolUse", script: "c.ts", timeout: 5 } as AgentHook;
    expect(joinedMatcher([a, b])).toBe("Bash|mcp__log__.*|Monitor");
    expect(joinedMatcher([a, c])).toBeUndefined();
    const groups = claudeCodeHooks([a, b]).PostToolUse as { matcher?: string }[];
    expect(groups[0]?.matcher).toBe("Bash|mcp__log__.*|Monitor");
  });

  test("codex keeps one shell command per hook", () => {
    const groups = hooksFor("codex").PostToolUse as { hooks: Handler[] }[];
    expect(groups.flatMap((g) => g.hooks).every((h) => h.type === "command" && !h.args)).toBe(true);
  });
});

describe("answering an event", () => {
  const hooks: AgentHook[] = [
    { event: "PostToolUse", script: "scripts/hooks/queue.ts", matcher: "Bash|mcp__log__.*" },
    { event: "PostToolUse", script: "scripts/hooks/pageState.ts", matcher: "mcp__log__inspect.*" },
    { event: "PreToolUse", script: "scripts/hooks/liveLogs.ts", matcher: "Bash" },
  ] as AgentHook[];

  test("only the event's hooks whose matcher fits the tool, never a refusing one", () => {
    const raw = JSON.stringify({ tool_name: "Bash" });
    expect(hooksForEvent("PostToolUse", raw, hooks).map((h) => h.script)).toEqual(["scripts/hooks/queue.ts"]);
    expect(hooksForEvent("PreToolUse", raw, hooks)).toEqual([]);
  });

  test("contexts are joined and decisions kept", () => {
    const body = mergeAnswers("Stop", [{ context: "a" }, { output: { decision: "block", reason: "go on", hookSpecificOutput: { additionalContext: "b" } } }]);
    expect(body?.decision).toBe("block");
    expect(JSON.stringify(body)).toContain("a");
    expect(JSON.stringify(body)).toContain("b");
    expect(mergeAnswers("Stop", [{}, {}])).toBeNull();
  });

  test("a hook that throws is named in the context and timed, the others still answer", async () => {
    const broken = [{ event: "UserPromptSubmit", script: "scripts/hooks/useCases.ts" }] as AgentHook[];
    const answer = await answerEvent("UserPromptSubmit", JSON.stringify({ prompt: "what is the craic" }), ".", async () => {
      throw new Error("router down");
    }, broken);
    expect(answer.timings).toHaveLength(1);
    expect(answer.timings[0]?.hook).toBe("useCases");
  });
});

describe("the service's freshness cache", () => {
  test("git status reruns only when the code stamp moved or the minute passed", () => {
    let stamp = 1;
    let clock = 0;
    let listed = 0;
    const source = cachedFreshness(".", {
      stamps: { current: () => stamp, refresh: () => false, close: () => {} },
      files: () => {
        listed += 1;
        return [`file${listed}`];
      },
      refreshMs: 60_000,
      now: () => clock,
    });
    expect(listed).toBe(1);
    expect(source.changes()).toEqual(["file1"]);
    expect(source.changes()).toEqual(["file1"]);
    expect(listed).toBe(1);
    stamp = 2;
    expect(source.changes()).toEqual(["file2"]);
    clock = 60_000;
    expect(source.changes()).toEqual(["file3"]);
    expect(source.stamp()).toBe(2);
    source.close();
  });
});

describe("a hook event's own time, split into stages", () => {
  test("hooks that wait on I/O start first so their wait overlaps the hooks that only compute", () => {
    const hook = (script: string): AgentHook => ({ event: "UserPromptSubmit", script, timeout: 10, why: "" });
    const order = waitingHooksFirst([hook("scripts/hooks/pageState.ts"), hook("scripts/hooks/engines.ts"), hook("scripts/hooks/useCases.ts"), hook("scripts/hooks/inbox.ts")]);
    expect(order.map((h) => h.script.replace(/^.*\//, ""))).toEqual(["useCases.ts", "pageState.ts", "engines.ts", "inbox.ts"]);
  });

  test("the caller's send time becomes the spawn and Bun start stages of a process hook, and the sent stage of a service hook", () => {
    const raw = JSON.stringify({ prompt: "hi", log_sent_at: 1000 });
    expect(sentAtOf(raw)).toBe(1000);
    expect(sentAtOf("{}")).toBeNull();
    const timings = [{ hook: "inbox", ms: 30, ok: true, startedAt: 1300 }];
    expect(hookStages(raw, timings, { processAt: 1100, bootedAt: 1290 })).toEqual([
      { name: "spawn", startedAt: 1000, ms: 100 },
      { name: "bunStart", startedAt: 1100, ms: 190 },
      { name: "hook inbox", startedAt: 1300, ms: 30, ok: true },
    ]);
    expect(hookStages(raw, timings, { arrivedAt: 1004 }).map((s) => [s.name, s.ms])).toEqual([["sent", 4], ["hook inbox", 30]]);
  });
});
