import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HERMES_DESKTOP_DIR, installHermes, installedPluginYaml } from "../hermes/index.ts";
import { antigravityHooks, cursorHooks, HERMES_PLUGIN_DIR, hermesPluginYaml, hookFiles } from "../registry/index.ts";
import { SETUP_HARNESSES } from "../../cli/launch/helpers/setup.ts";
import { clipContext, contextOutput, harnessOf, harnessTable, hookHostOf, hostBody, positionalOf, scratchHookEnv, watcherLogsIn } from "./client.ts";
import { HARNESS_CAPABILITIES, HARNESS_IDS, HARNESSES, HOOK_HOSTS } from "./types.ts";

const root = join(import.meta.dir, "..", "..", "..");
const HERMES_HOME_WITH_LOG = mkdtempSync(join(tmpdir(), "harnessContract-hermesHome-"));
writeFileSync(join(HERMES_HOME_WITH_LOG, "config.yaml"), ["mcp_servers:", "  log:", "    command: logMcp", ""].join("\n"));

describe("the harness table", () => {
  test("names every harness once, with every capability and a doc page that exists", () => {
    expect(HARNESSES.map((h) => h.id)).toEqual([...HARNESS_IDS]);
    for (const harness of HARNESSES) {
      expect(Object.keys(harness.capabilities).sort()).toEqual([...HARNESS_CAPABILITIES].sort());
      expect(existsSync(join(root, "docs", "harnesses", harness.doc.split("#")[0]))).toBe(true);
    }
  });

  test("every hook host has a hook file in the repo and a context limit; the hosts with no hooks have neither", () => {
    for (const harness of HARNESSES) {
      const hooked = (HOOK_HOSTS as readonly string[]).includes(harness.id);
      expect(Boolean(harness.hookFile)).toBe(hooked);
      expect(harness.contextLimit === null).toBe(!hooked);
      if (harness.hookFile) expect(existsSync(join(root, harness.hookFile))).toBe(true);
    }
  });

  test("routes by the prompt hook only where a hook can add context to a prompt", () => {
    expect(harnessOf("cursor").router).toBe("ask");
    expect(harnessOf("hermes").router).toBe("preLlmCall");
    for (const id of ["claudeApp", "chatgpt", "grok"] as const) expect(harnessOf(id).router).toBe("ask");
  });

  test("renders one markdown row per harness", () => {
    const table = harnessTable().split("\n");
    expect(table.length).toBe(HARNESSES.length + 2);
    expect(table[2]).toContain("[Claude Code](claudeApp.md#claude-code)");
  });
});

describe("each adapter cuts its text to the harness's limit", () => {
  test("Claude Code keeps 10,000 characters and Codex 7,500", () => {
    const long = "x".repeat(20000);
    expect(clipContext(long, "claudeCode").length).toBe(10000);
    expect(clipContext(long, "codex").length).toBe(7500);
    expect(clipContext(long, "codex")).toContain("log cut this context at 7500 characters, the limit for Codex");
    expect(clipContext("short", "codex")).toBe("short");
  });

  test("shapes the answer for each host", () => {
    const body = { decision: "block", hookSpecificOutput: { hookEventName: "Stop", additionalContext: "y".repeat(9000) } };
    expect((hostBody("claudeCode", "Stop", body)?.hookSpecificOutput as { additionalContext: string }).additionalContext.length).toBe(9000);
    expect(hostBody("claudeCode", "Stop", body)?.decision).toBe("block");
    expect((hostBody("codex", "Stop", body)?.hookSpecificOutput as { additionalContext: string }).additionalContext.length).toBe(7500);
    expect(Object.keys(hostBody("cursor", "SessionStart", body) ?? {})).toEqual(["additional_context"]);
    expect(Object.keys(hostBody("hermes", "UserPromptSubmit", body) ?? {})).toEqual(["context"]);
    expect(hostBody("cursor", "SessionStart", { decision: "block" })).toBeNull();
    expect(contextOutput("SessionStart", "", "codex")).toBe("");
    expect(JSON.parse(contextOutput("SessionStart", "hi", "hermes"))).toEqual({ context: "hi" });
  });

  test("reads the host from --host and leaves it out of the positional arguments", () => {
    expect(hookHostOf(["bun", "event.ts", "SessionStart", "--host", "cursor"])).toBe("cursor");
    expect(hookHostOf(["bun", "event.ts", "--host", "nope"])).toBe("claudeCode");
    expect(positionalOf(["--host", "cursor", "SessionStart"])).toEqual(["SessionStart"]);
  });
});

describe("the hook files, generated from AGENT_HOOKS", () => {
  test("Cursor gets sessionStart and postToolUse, run from the project root through event.ts", () => {
    const file = cursorHooks() as { version: number; hooks: Record<string, { command: string }[]> };
    expect(file.version).toBe(1);
    expect(Object.keys(file.hooks)).toEqual(["sessionStart", "postToolUse"]);
    expect(file.hooks.sessionStart[0].command).toBe("bun scripts/hooks/event.ts SessionStart --host cursor");
    expect(file.hooks.beforeSubmitPrompt).toBeUndefined();
  });

  test("Antigravity's file is the one in the repo", () => {
    expect(antigravityHooks()).toEqual(JSON.parse(readFileSync(join(root, ".agents", "hooks.json"), "utf8")));
  });

  test("the native Hermes plugin registers pre_llm_call, pre_tool_call and post_llm_call", () => {
    expect(hermesPluginYaml("0.2.0")).toContain("provides_hooks:\n  - pre_llm_call\n  - pre_tool_call\n  - transform_tool_result\n  - post_llm_call\n  - transform_llm_output\n");
    expect(hermesPluginYaml("0.2.0")).not.toContain("listeningkit");
  });

  test("every generated file in the repo matches", () => {
    const version = (JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string }).version;
    for (const file of hookFiles(undefined, version)) {
      const path = join(root, file.path);
      expect({ path: file.path, same: file.same(existsSync(path) ? readFileSync(path, "utf8") : null) }).toEqual({ path: file.path, same: true });
    }
  });
});

describe("log launch --setup installs user-level hooks", () => {
  test("offers every harness the table says setup installs", () => {
    expect(SETUP_HARNESSES.map((h) => h.id)).toEqual(["hermes", "opencode"]);
  });

  test("writes the one native Hermes plugin under <home>/plugins/log with the log checkout it runs, and retires the old logHooks half", () => {
    const home = mkdtempSync(join(tmpdir(), "harnessContract-hermes-"));
    try {
      const oldHooks = join(home, "plugins", "logHooks");
      mkdirSync(oldHooks, { recursive: true });
      writeFileSync(join(oldHooks, "plugin.yaml"), "name: logHooks\nversion: 0.2.0\n");
      mkdirSync(join(home, "plugins", "log"), { recursive: true });
      writeFileSync(join(home, "plugins", "log", "plugin.json"), "{}");
      const first = installHermes(home, root);
      expect(first.changed).toBe(true);
      expect(first.pluginDir).toBe(join(home, "plugins", "log"));
      expect(existsSync(oldHooks)).toBe(false);
      expect(existsSync(join(first.pluginDir, "plugin.json"))).toBe(false);
      expect(existsSync(join(first.pluginDir, "desktop", "plugin.js"))).toBe(true);
      expect(existsSync(join(first.pluginDir, "dashboard", "plugin_api.py"))).toBe(true);
      const yaml = readFileSync(join(first.pluginDir, "plugin.yaml"), "utf8");
      expect(yaml).toContain("name: log\n");
      expect(yaml).toContain(`log_root: '${root}'`);
      expect(readFileSync(join(first.pluginDir, "__init__.py"), "utf8")).toBe(readFileSync(join(root, HERMES_PLUGIN_DIR, "__init__.py"), "utf8"));
      const desktop = join(home, HERMES_DESKTOP_DIR, "log", "plugin.js");
      expect(first.desktopPlugin).toEqual({ path: desktop, changed: true, created: true });
      expect(readFileSync(desktop, "utf8")).toBe(readFileSync(join(root, HERMES_PLUGIN_DIR, "desktop", "plugin.js"), "utf8"));
      const again = installHermes(home, root);
      expect(again.changed).toBe(false);
      expect(again.desktopPlugin).toEqual({ path: desktop, changed: false, created: false });
      writeFileSync(desktop, "stale");
      expect(installHermes(home, root).desktopPlugin).toEqual({ path: desktop, changed: true, created: false });
      expect(readFileSync(desktop, "utf8")).not.toBe("stale");
      expect(installedPluginYaml(yaml, "/other").match(/log_root/g)?.length).toBe(1);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("the native Hermes plugin's pre_llm_call", () => {
  test("asks log's event script with --host hermes and returns its context, SessionStart first on the first turn", () => {
    const scratch = mkdtempSync(join(tmpdir(), "harnessContract-pyHermes-"));
    try {
      const stubRoot = join(scratch, "root");
      mkdirSync(join(stubRoot, "scripts", "hooks"), { recursive: true });
      writeFileSync(
        join(stubRoot, "scripts", "hooks", "event.ts"),
        "const raw = await Bun.stdin.text()\nconst input = JSON.parse(raw)\nprocess.stdout.write(JSON.stringify({ context: `${process.argv[2]}|${process.argv.slice(3).join(' ')}|${input.prompt}` }))\n",
      );
      const plugin = join(root, HERMES_PLUGIN_DIR, "__init__.py");
      const script = [
        "import importlib.util, json, sys",
        `spec = importlib.util.spec_from_file_location("logHooks", ${JSON.stringify(plugin)})`,
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "hooks = {}",
        "class Ctx:",
        "    def register_hook(self, name, fn):",
        "        hooks[name] = fn",
        "module.register(Ctx())",
        "first = hooks['pre_llm_call'](session_id='s', user_message='check my x notifications', conversation_history=[], is_first_turn=True, model='m', platform='cli')",
        "later = hooks['pre_llm_call'](session_id='s', user_message='hi', is_first_turn=False)",
        "print(json.dumps({'names': sorted(hooks), 'first': first, 'later': later}))",
      ].join("\n");
      const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, HERMES_HOME: HERMES_HOME_WITH_LOG, LOG_ROOT: stubRoot, LOG_CONTEXT_SERVICE: "off" } });
      expect(run.status).toBe(0);
      const out = JSON.parse(run.stdout.trim()) as { names: string[]; first: { context: string }; later: { context: string } };
      expect(out.names).toEqual(["post_llm_call", "pre_llm_call", "pre_tool_call", "transform_llm_output", "transform_tool_result"]);
      expect(out.first.context).toBe("SessionStart|--host hermes|check my x notifications\n\nUserPromptSubmit|--host hermes|check my x notifications");
      expect(out.later.context).toBe("UserPromptSubmit|--host hermes|hi");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("holds what the push hears during a turn, hands it to the next tool result, and one turn for the rest", () => {
    const plugin = join(root, HERMES_PLUGIN_DIR, "__init__.py");
    const script = [
      "import importlib.util, json",
      `spec = importlib.util.spec_from_file_location("logHooks", ${JSON.stringify(plugin)})`,
      "module = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(module)",
      "sent = []",
      "class Ctx:",
      "    def inject_message(self, text, role, session_key):",
      "        sent.append(text)",
      "module.PUSH.ctx = Ctx()",
      "module.PUSH.arrived('idle')",
      "module.PUSH.start_turn()",
      "module.PUSH.arrived('a')",
      "mid = module.transform_tool_result(tool_name='mcp__terminal', args={}, result='ls', session_id='s')",
      "module.PUSH.arrived('b')",
      "module.PUSH.arrived('c')",
      "during = list(sent)",
      "module.post_llm_call()",
      "print(json.dumps({'mid': mid, 'during': during, 'after': sent}))",
    ].join("\n");
    const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, HERMES_HOME: HERMES_HOME_WITH_LOG, LOG_ROOT: join(tmpdir(), "harnessContract-noRoot"), LOG_CONTEXT_SERVICE: "off" } });
    expect(run.status).toBe(0);
    const out = JSON.parse(run.stdout.trim()) as { mid: string; during: string[]; after: string[] };
    expect(out.mid.startsWith("ls")).toBe(true);
    expect(out.mid.endsWith("a")).toBe(true);
    expect(out.during).toEqual(["idle"]);
    expect(out.after).toEqual(["idle", "b\n\nc"]);
  });

  test("one push loop per session however often the turn hook asks, so no extra push.ts piles up while one is between restarts", () => {
    const scratch = mkdtempSync(join(tmpdir(), "harnessContract-pushOnce-"));
    try {
      mkdirSync(join(scratch, "scripts", "hooks"), { recursive: true });
      writeFileSync(join(scratch, "scripts", "hooks", "push.ts"), "");
      const plugin = join(root, HERMES_PLUGIN_DIR, "__init__.py");
      const script = [
        "import importlib.util, json, threading, time",
        `spec = importlib.util.spec_from_file_location("logHooks", ${JSON.stringify(plugin)})`,
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "spawned = []",
        "class Proc:",
        "    def __init__(self, *a, **k):",
        "        spawned.append(threading.current_thread().name)",
        "        self.stdout = iter([])",
        "    def poll(self):",
        "        return 0",
        "    def kill(self):",
        "        pass",
        "module.subprocess.Popen = Proc",
        "module.PUSH_RETRY_SECONDS = 0.05",
        "class Ctx:",
        "    def inject_message(self, text, role, session_key):",
        "        pass",
        "module.PUSH.ctx = Ctx()",
        "for i in range(6):",
        "    module.PUSH.follow('key', 'reader')",
        "    time.sleep(0.03)",
        "time.sleep(0.2)",
        "first = set(spawned)",
        "module.PUSH.follow('key', 'other')",
        "time.sleep(0.2)",
        "module.PUSH.key = ''",
        "print(json.dumps({'threads': len(first), 'after': len(set(spawned))}))",
      ].join("\n");
      const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, HERMES_HOME: HERMES_HOME_WITH_LOG, LOG_ROOT: scratch, LOG_CONTEXT_SERVICE: "off" } });
      expect(run.status).toBe(0);
      const out = JSON.parse(run.stdout.trim()) as { threads: number; after: number };
      expect(out.threads).toBe(1);
      expect(out.after).toBe(2);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("adds what landed while a log tool ran to its result, and leaves other tools alone", () => {
    const scratch = mkdtempSync(join(tmpdir(), "harnessContract-pyHermesLive-"));
    try {
      const stubRoot = join(scratch, "root");
      mkdirSync(join(stubRoot, "scripts", "hooks"), { recursive: true });
      writeFileSync(
        join(stubRoot, "scripts", "hooks", "event.ts"),
        "const input = JSON.parse(await Bun.stdin.text())\nprocess.stdout.write(JSON.stringify({ context: `${process.argv[2]}|${input.tool_name}|${input.session_id}` }))\n",
      );
      const plugin = join(root, HERMES_PLUGIN_DIR, "__init__.py");
      const script = [
        "import importlib.util, json",
        `spec = importlib.util.spec_from_file_location("logHooks", ${JSON.stringify(plugin)})`,
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "direct = module.transform_tool_result(tool_name='mcp__log__discordSendLive', args={}, result='sent', session_id='s')",
        "wrapped = module.transform_tool_result(tool_name='mcp__tool_call', args={'calls': [{'name': 'mcp__log__voice'}]}, result='gated', session_id='s')",
        "other = module.transform_tool_result(tool_name='mcp__terminal', args={}, result='ls', session_id='s')",
        "print(json.dumps({'direct': direct, 'wrapped': wrapped, 'other': other}))",
      ].join("\n");
      const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, HERMES_HOME: HERMES_HOME_WITH_LOG, LOG_ROOT: stubRoot, LOG_CONTEXT_SERVICE: "off" } });
      expect(run.status).toBe(0);
      const out = JSON.parse(run.stdout.trim()) as { direct: string; wrapped: string; other: string | null };
      expect(out.direct.startsWith("sent")).toBe(true);
      expect(out.direct.endsWith("PostToolUse|mcp__log__discordSendLive|s")).toBe(true);
      expect(out.wrapped.endsWith("PostToolUse|mcp__log__voice|s")).toBe(true);
      expect(out.other).toBeNull();
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("pre_tool_call refuses a script that greps or parses log output and names the flag; post_llm_call sends Stop with the turn's tool calls", () => {
    const scratch = mkdtempSync(join(tmpdir(), "harnessContract-pyTools-"));
    try {
      const stubRoot = join(scratch, "root");
      mkdirSync(join(stubRoot, "scripts", "hooks"), { recursive: true });
      const said = join(scratch, "said.json").replace(/\\/g, "/");
      writeFileSync(join(stubRoot, "scripts", "hooks", "event.ts"), `const raw = await Bun.stdin.text()\nawait Bun.write(${JSON.stringify(said)}, JSON.stringify({ event: process.argv[2], input: JSON.parse(raw) }))\n`);
      const plugin = join(root, HERMES_PLUGIN_DIR, "__init__.py");
      const script = [
        "import importlib.util, json, threading",
        `spec = importlib.util.spec_from_file_location("logHooks", ${JSON.stringify(plugin)})`,
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "grep = module.pre_tool_call(tool_name='terminal', args={'command': 'log discord chats --account a --json | grep -i grace'})",
        "parse = module.pre_tool_call(tool_name='execute_code', args={'code': \"import json, subprocess\\nr = subprocess.run(['log', 'inbox', 'waiting', '--json'], capture_output=True)\\njson.loads(r.stdout)\"})",
        "fine = [module.pre_tool_call(tool_name='terminal', args={'command': c}) for c in ('git log --oneline | grep fix', 'bun bin/log.ts discord chats --account a | grep x', 'ls')]",
        "module.post_llm_call(session_id='s', conversation_history=[{'role': 'user'}, {'role': 'assistant', 'tool_calls': [1, 2]}, {'role': 'tool'}, {'role': 'assistant', 'tool_calls': [3]}])",
        "[t.join(20) for t in threading.enumerate() if t is not threading.current_thread()]",
        "print(json.dumps({'grep': grep, 'parse': parse, 'fine': fine}))",
      ].join("\n");
      const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, HERMES_HOME: HERMES_HOME_WITH_LOG, LOG_ROOT: stubRoot, LOG_CONTEXT_SERVICE: "off" } });
      expect(run.status).toBe(0);
      const out = JSON.parse(run.stdout.trim()) as { grep: { action: string; message: string }; parse: { message: string }; fine: unknown[] };
      expect(out.grep.action).toBe("block");
      expect(out.grep.message).toStartWith("log has a flag for this: discordChats --kind dm,group, --name <text>; don't parse log output with scripts.");
      expect(out.parse.message).toStartWith("log has a flag for this: inboxWaiting --tail <n>");
      expect(out.fine).toEqual([null, null, null]);
      const stop = JSON.parse(readFileSync(said, "utf8")) as { event: string; input: Record<string, unknown> };
      expect(typeof stop.input.log_sent_at).toBe("number");
      delete stop.input.log_sent_at;
      expect(stop).toEqual({ event: "Stop", input: { hook_event_name: "Stop", session_id: "s", tool_calls: 3 } });
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  test("asks the warm context service over localhost first and starts no process; a closed port falls back to the event script", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "harnessContract-pyService-"));
    const posted: { path: string; body: Record<string, unknown> }[] = [];
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        const url = new URL(request.url);
        posted.push({ path: `${url.pathname}${url.search}`, body: (await request.json()) as Record<string, unknown> });
        return Response.json({ context: `served ${url.pathname.split("/").pop()}` });
      },
    });
    try {
      const stubRoot = join(scratch, "root");
      mkdirSync(join(stubRoot, "scripts", "hooks"), { recursive: true });
      writeFileSync(join(stubRoot, "scripts", "hooks", "event.ts"), "await Bun.stdin.text()\nprocess.stdout.write(JSON.stringify({ context: `spawned ${process.argv[2]}` }))\n");
      const plugin = join(root, HERMES_PLUGIN_DIR, "__init__.py");
      const script = [
        "import importlib.util, json",
        `spec = importlib.util.spec_from_file_location("logHooks", ${JSON.stringify(plugin)})`,
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "print(json.dumps(module.pre_llm_call(session_id='s', user_message='hi', is_first_turn=True)))",
      ].join("\n");
      const run = (port: number) => Bun.spawn([process.env.LOG_PYTHON || "python", "-c", script], { stdout: "pipe", stderr: "pipe", windowsHide: true, env: { ...process.env, HERMES_HOME: HERMES_HOME_WITH_LOG, LOG_ROOT: stubRoot, LOG_CONTEXT_PORT: String(port), LOG_CONTEXT_SERVICE: "" } });
      const warm = run(server.port ?? 0);
      const warmOut = await new Response(warm.stdout).text();
      expect(await warm.exited).toBe(0);
      expect(JSON.parse(warmOut.trim())).toEqual({ context: "served SessionStart\n\nserved UserPromptSubmit" });
      expect(posted.map((p) => p.path).sort()).toEqual(["/hooks/SessionStart?host=hermes", "/hooks/UserPromptSubmit?host=hermes"]);
      expect(posted.every((p) => typeof p.body.log_sent_at === "number" && p.body.prompt === "hi")).toBe(true);
      const closedPort = server.port ?? 0;
      server.stop(true);
      const cold = run(closedPort);
      const coldOut = await new Response(cold.stdout).text();
      expect(await cold.exited).toBe(0);
      expect(JSON.parse(coldOut.trim())).toEqual({ context: "spawned SessionStart\n\nspawned UserPromptSubmit" });
    } finally {
      server.stop(true);
      rmSync(scratch, { recursive: true, force: true });
    }
  }, 30000);
});

describe("the native Hermes plugin installed on its own, with no log launch --setup", () => {
  test("finds log's global install by itself and runs its event script", () => {
    const scratch = mkdtempSync(join(tmpdir(), "harnessContract-pyHermesAlone-"));
    try {
      const bunHome = join(scratch, "bun");
      const installed = join(bunHome, "install", "global", "node_modules", "@listeningkit", "log");
      mkdirSync(join(installed, "scripts", "hooks"), { recursive: true });
      writeFileSync(join(installed, "scripts", "hooks", "event.ts"), "await Bun.stdin.text()\nprocess.stdout.write(JSON.stringify({ context: `found ${process.argv[2]}` }))\n");
      const pluginDir = join(scratch, "hermes", "plugins", "log");
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(join(pluginDir, "plugin.yaml"), readFileSync(join(root, HERMES_PLUGIN_DIR, "plugin.yaml"), "utf8"));
      writeFileSync(join(pluginDir, "__init__.py"), readFileSync(join(root, HERMES_PLUGIN_DIR, "__init__.py"), "utf8"));
      const script = [
        "import importlib.util, json",
        `spec = importlib.util.spec_from_file_location("logHooks", ${JSON.stringify(join(pluginDir, "__init__.py"))})`,
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "print(json.dumps({'root': str(module.log_root()), 'answer': module.pre_llm_call(session_id='s', user_message='hi', is_first_turn=False)}))",
      ].join("\n");
      const env: Record<string, string | undefined> = { ...process.env, HERMES_HOME: HERMES_HOME_WITH_LOG, BUN_INSTALL: bunHome, LOG_ROOT: "", LOG_CONTEXT_SERVICE: "off" };
      const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env });
      expect(run.status).toBe(0);
      const out = JSON.parse(run.stdout.trim()) as { root: string; answer: { context: string } };
      expect(realpathSync.native(out.root).toLowerCase()).toBe(realpathSync.native(installed).toLowerCase());
      expect(out.answer.context).toBe("found UserPromptSubmit");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe("the one Hermes plugin carries what the portable half used to", () => {
  test("registers every play as a skill and says when config.yaml has no log MCP server", () => {
    const scratch = mkdtempSync(join(tmpdir(), "harnessContract-onePlugin-"));
    try {
      const withServer = join(scratch, "with.yaml");
      const without = join(scratch, "without.yaml");
      writeFileSync(withServer, "model: x\nmcp_servers:\n  other:\n    command: a\n  log:\n    command: logMcp\n");
      writeFileSync(without, "model: x\nmcp_servers:\n  other:\n    command: a\n");
      const plugin = join(root, HERMES_PLUGIN_DIR, "__init__.py");
      const script = [
        "import importlib.util, json",
        `spec = importlib.util.spec_from_file_location("logOnePlugin", ${JSON.stringify(plugin)})`,
        "module = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(module)",
        "class Ctx:",
        "    def __init__(self): self.skills = []",
        "    def register_skill(self, name, path): self.skills.append(name)",
        "ctx = Ctx()",
        "module.register_skills(ctx)",
        `print(json.dumps({'skills': ctx.skills, 'with': module.mcp_configured(${JSON.stringify(withServer)}), 'without': module.mcp_configured(${JSON.stringify(without)}), 'missing': module.mcp_configured(${JSON.stringify(join(scratch, "none.yaml"))})}))`,
      ].join("\n");
      const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, LOG_ROOT: root } });
      expect(run.status).toBe(0);
      const out = JSON.parse(run.stdout.trim()) as { skills: string[]; with: boolean; without: boolean; missing: boolean };
      const plays = readdirSync(join(root, HERMES_PLUGIN_DIR, "skills")).filter((name) => existsSync(join(root, HERMES_PLUGIN_DIR, "skills", name, "SKILL.md")));
      expect(out.skills.sort()).toEqual(plays.sort());
      expect({ with: out.with, without: out.without, missing: out.missing }).toEqual({ with: true, without: false, missing: false });
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

describe("the check's scratch state", () => {
  test("points every store the hooks open at the scratch folder and turns the service and the watchers off", () => {
    const dir = mkdtempSync(join(tmpdir(), "harnessContract-env-"));
    try {
      const env = scratchHookEnv(dir, { LOG_DB: "/real/log.db" });
      for (const key of ["LOG_DB", "LOG_INBOX_STATE", "LOG_CONTEXT_LAYER", "LOG_QUEUES_DIR", "LOG_TWITTER_STATE", "LOG_PLATFORM_STATE", "LOG_FBK_STATE", "LOG_HOOK_MEMORY"]) expect(String(env[key]).startsWith(dir)).toBe(true);
      expect(env.LOG_CONTEXT_SERVICE).toBe("off");
      expect(env.LOG_INBOX_POLL).toBe("off");
      expect(watcherLogsIn(dir)).toEqual([]);
      mkdirSync(join(dir, "inbox", "twitter", "fakeBird"), { recursive: true });
      writeFileSync(join(dir, "inbox", "twitter", "fakeBird", "watch.log"), "");
      expect(watcherLogsIn(dir).length).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
