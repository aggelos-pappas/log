import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { cancel, intro, isCancel, log, multiselect, outro, password, select, text } from "@clack/prompts";
import { userEnvPath } from "../../config/userEnv/index.ts";
import { connectCommand } from "../live/index.ts";
import { COMMAND_INDEX } from "../runner/helpers/commandIndex.ts";
import { buildBrowserCommand } from "../runner/helpers/openBrowser.ts";
import { PLATFORM_LABELS } from "../runner/helpers/platforms.ts";
import type { Platform } from "../runner/helpers/platforms.ts";
import type { Command, CommandContext, CommandResult } from "../runner/types.ts";
import { installOpenCode, opencodeConfigDir } from "../../agentHooks/opencode/index.ts";
import type { HarnessInstall } from "../../agentHooks/opencode/index.ts";
import { hermesHome, installHermes } from "../../agentHooks/hermes/index.ts";
import { agentSetupText, browserSignInSteps, parseLaunchArgs, platformOfAccount, platformOption, setEnvValue, SETUP_EXTENSIONS, SETUP_HARNESSES, setupSummary, shouldPrompt, signInRouteOf, START_ACTIONS, START_PLATFORMS } from "./helpers/index.ts";
import type { LaunchTTY, SetupExtension, SetupHarness, SetupOutcome } from "./helpers/index.ts";

export * from "./helpers/index.ts";

export const LAUNCH_USAGE = "Usage: log launch [--setup] [--json]";

class SetupCancelled extends Error {}

type PromptSelectOptions = Parameters<typeof select>[0];

interface LaunchPrompts {
  intro(title: string): void;
  outro(message?: string): void;
  cancel(message?: string): void;
  step(message: string): void;
  select(option: PromptSelectOptions): Promise<unknown>;
  text(option: Parameters<typeof text>[0]): Promise<unknown>;
  multiselect(option: Parameters<typeof multiselect>[0]): Promise<unknown>;
  password(option: Parameters<typeof password>[0]): Promise<unknown>;
}

const harnessHomes: Partial<Record<SetupHarness["id"], () => string>> = { opencode: opencodeConfigDir, hermes: hermesHome };

export const launchDeps: {
  prompts: LaunchPrompts;
  tty: () => LaunchTTY;
  run: (command: Command, context: CommandContext, argv: string[]) => Promise<CommandResult> | CommandResult;
  openUrl: (url: string) => boolean;
  runInTerminal: (command: string, args: readonly string[]) => { found: boolean; code: number };
  harnesses: () => readonly SetupHarness[];
  installHarness: (harness: SetupHarness) => HarnessInstall;
  envFile: () => string;
  readEnv: (file: string) => string;
  writeEnv: (file: string, text: string) => void;
} = {
  prompts: {
    intro,
    outro,
    cancel,
    step: (message) => log.step(message),
    select: select as LaunchPrompts["select"],
    text: text as LaunchPrompts["text"],
    multiselect: multiselect as LaunchPrompts["multiselect"],
    password: password as LaunchPrompts["password"],
  },
  tty: () => ({ stdinTTY: process.stdin?.isTTY, stdoutTTY: process.stdout?.isTTY }),
  run: (command, context, argv) => command.run(context, argv),
  openUrl: (url) => {
    const { command, args } = buildBrowserCommand(url, process.platform);
    return !spawnSync(command, args, { stdio: "ignore", windowsHide: true }).error;
  },
  runInTerminal: (command, args) => {
    const run = spawnSync(command, [...args], { stdio: "inherit", shell: process.platform === "win32", windowsHide: true });
    return { found: !run.error && run.status !== 9009 && run.status !== 127, code: run.status ?? 1 };
  },
  harnesses: () => SETUP_HARNESSES.filter((harness) => existsSync(harnessHomes[harness.id]?.() ?? "")),
  installHarness: (harness) => (harness.id === "hermes" ? installHermes() : installOpenCode()),
  envFile: () => userEnvPath(),
  readEnv: (file) => (existsSync(file) ? readFileSync(file, "utf8") : ""),
  writeEnv: (file, text) => {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text, { mode: 0o600 });
  },
};

async function commandFor(name: string, platform: string): Promise<Command> {
  const entry = COMMAND_INDEX.find((e) => e.name === name && e.platform === platform);
  if (!entry) throw new Error(`no ${platform} ${name} command`);
  const loaded = (await import(`../../../${entry.module}`)) as Record<string, unknown>;
  return loaded[entry.exportName] as Command;
}

async function delegate(command: Command, context: CommandContext, argv: string[]): Promise<{ code: number }> {
  const result = await launchDeps.run(command, context, argv);
  if (result.stdout) context.out(result.stdout);
  if (result.stderr) context.err(result.stderr);
  return { code: result.code };
}

async function pick(options: PromptSelectOptions): Promise<string | null> {
  const value = await launchDeps.prompts.select(options);
  if (isCancel(value) || typeof value !== "string") {
    launchDeps.prompts.cancel("Launch cancelled.");
    throw new SetupCancelled();
  }
  return value;
}

async function ask(message: string, placeholder?: string, optional = false): Promise<string | null> {
  const value = await launchDeps.prompts.text({ message, ...(placeholder ? { placeholder } : {}) });
  if (isCancel(value) || typeof value !== "string" || (!optional && !value.trim())) {
    launchDeps.prompts.cancel("Launch cancelled.");
    throw new SetupCancelled();
  }
  return value.trim();
}

export interface PickedAccount {
  platform: Platform;
  accountName: string;
}

async function pickAccount(context: CommandContext, message: string, keep: (account: PickedAccount) => boolean): Promise<PickedAccount | null | string> {
  const rows = (await context.accounts.list("socialAccounts")) as unknown as Record<string, unknown>[];
  const accounts = rows
    .flatMap((row): PickedAccount[] => {
      const platform = platformOfAccount(row.platform);
      const accountName = String(row.accountName || row.name || "");
      return platform && accountName ? [{ platform, accountName }] : [];
    })
    .filter(keep);
  if (!accounts.length) return "no account yet: pick Add an account first.";
  const picked = await pick({ message, options: accounts.map((a, i) => ({ value: String(i), label: a.accountName, hint: PLATFORM_LABELS[a.platform] })) });
  return picked === null ? null : accounts[Number(picked)];
}

export async function signInAccount(context: CommandContext, account: PickedAccount): Promise<{ code: number }> {
  const route = signInRouteOf(account.platform);
  if (route.kind === "cookies") {
    context.out(`Sign in ${account.accountName}: ${route.hint}. The prompt hides what you paste.`);
    return delegate(await commandFor("cookies", account.platform), context, ["save", "--account", account.accountName]);
  }
  if (route.kind === "connect") {
    const now = await pick({
      message: `Connect ${account.accountName} now? It opens the account's browser through its proxy and signs in.`,
      options: [
        { value: "yes", label: "Connect now", hint: `log facebook connect --account ${account.accountName}` },
        { value: "no", label: "Later" },
      ],
    });
    if (now === null) return { code: 1 };
    if (now === "no") {
      context.out(`Later: log facebook connect --account ${account.accountName}`);
      return { code: 0 };
    }
    return delegate(connectCommand, context, ["--account", account.accountName]);
  }
  context.out(browserSignInSteps(account.platform, account.accountName));
  return { code: 0 };
}

async function addAccount(context: CommandContext, preset?: Platform): Promise<{ code: number }> {
  const platform = preset ?? ((await pick({ message: "Which platform?", options: START_PLATFORMS.map(platformOption) })) as Platform | null);
  if (platform === null) return { code: 1 };
  const placeholder = platform === "linkedin" ? "the part after linkedin.com/in/" : platform === "twitter" ? "the handle, without @" : "a name you'll know it by";
  const name = await ask(`The account's name on ${PLATFORM_LABELS[platform]}`, placeholder);
  if (name === null) return { code: 1 };
  const accountName = name.replace(/^@/, "");
  if (signInRouteOf(platform).kind === "cookies") return signInAccount(context, { platform, accountName });
  const argv = ["add", "--platform", platform, "--account", accountName];
  if (platform === "facebook") {
    const proxy = await ask("Its proxy (scheme://user:pass@host:port, in the account's country)");
    if (proxy === null) return { code: 1 };
    const home = await ask("Its home country code", "US");
    if (home === null) return { code: 1 };
    const city = await ask("Its home city", "Bethlehem");
    if (city === null) return { code: 1 };
    argv.push("--proxy", proxy, "--home", home.toUpperCase(), "--city", city);
  }
  const added = await delegate(await commandFor("localAccount", "any"), context, argv);
  if (added.code !== 0) return added;
  return signInAccount(context, { platform, accountName });
}

async function pickMany(options: Parameters<typeof multiselect>[0]): Promise<string[] | null> {
  const value = await launchDeps.prompts.multiselect(options);
  if (isCancel(value) || !Array.isArray(value)) {
    launchDeps.prompts.cancel("Setup cancelled.");
    throw new SetupCancelled();
  }
  return value.map(String);
}

async function askSecret(message: string): Promise<string | null> {
  const value = await launchDeps.prompts.password({ message, mask: "•" });
  if (isCancel(value)) {
    launchDeps.prompts.cancel("Setup cancelled.");
    throw new SetupCancelled();
  }
  return typeof value === "string" ? value.trim() : "";
}

function saveKey(context: CommandContext, keyName: string, value: string): void {
  const file = launchDeps.envFile();
  launchDeps.writeEnv(file, setEnvValue(launchDeps.readEnv(file), keyName, value));
  process.env[keyName] = value;
  context.out(`  ✓ ${keyName} saved in ${file}`);
}

async function openSignUp(context: CommandContext, label: string, url: string, note?: string): Promise<boolean | null> {
  const choice = await pick({
    message: `${label}: do you have an account?`,
    options: [
      { value: "signUp", label: "No, open the sign-up page", hint: url },
      { value: "have", label: "Yes, I have one" },
      { value: "skip", label: `Skip ${label}` },
    ],
  });
  if (choice === null) return null;
  if (choice === "skip") return false;
  if (choice === "signUp") {
    if (note) context.out(`  ${note}`);
    context.out(launchDeps.openUrl(url) ? `  Opened ${url} in your browser.` : `  Open this in your browser: ${url}`);
  }
  return true;
}

async function setUpExtension(context: CommandContext, extension: SetupExtension): Promise<SetupOutcome | null> {
  context.out(`\n${extension.label}: ${extension.adds}`);
  const go = await openSignUp(context, extension.label, extension.signUpUrl, extension.signUpNote);
  if (go === null) return null;
  if (!go) return { label: extension.label, ok: false, detail: "skipped" };
  const access = extension.access;
  if (access.kind === "signIn") {
    const command = `${access.command} ${access.args.join(" ")}`;
    context.out(`  Signing in: ${command} opens your browser.`);
    const run = launchDeps.runInTerminal(access.command, access.args);
    if (!run.found) return { label: extension.label, ok: false, detail: `${access.command} isn't installed: install it from ${extension.signUpUrl}, then run ${command}` };
    return run.code === 0 ? { label: extension.label, ok: true, detail: "signed in" } : { label: extension.label, ok: false, detail: `sign-in didn't finish: run ${command}` };
  }
  context.out(launchDeps.openUrl(access.keyUrl) ? `  Opened ${access.keyUrl} for the key (${access.keyHint}).` : `  Get the key at ${access.keyUrl} (${access.keyHint}).`);
  const key = await askSecret(`Paste the ${extension.label} key (${access.keyName}), or leave it empty to skip`);
  if (key === null) return null;
  if (!key) return { label: extension.label, ok: false, detail: `no key: add ${access.keyName} to ${launchDeps.envFile()} later` };
  saveKey(context, access.keyName, key);
  return { label: extension.label, ok: true, detail: `${access.keyName} saved` };
}

async function setUpHarness(harness: SetupHarness): Promise<SetupOutcome> {
  try {
    const got = launchDeps.installHarness(harness);
    const desktop = got.desktopPlugin ? `; Desktop plugin ${got.desktopPlugin.changed ? "copied to" : "already at"} ${got.desktopPlugin.path}` : "";
    const detail = `${got.changed ? `wired: ${got.configPath}` : `already wired: ${got.configPath}`}${desktop}`;
    return { label: harness.label, ok: true, detail: `${detail}, hooks in ${got.pluginDir}` };
  } catch (error) {
    return { label: harness.label, ok: false, detail: `couldn't wire it: ${String(error).slice(0, 200)}` };
  }
}

async function runSetup(context: CommandContext): Promise<CommandResult> {
  const outcomes: SetupOutcome[] = [];
  context.out(`Your settings and keys go in ${launchDeps.envFile()}. Space picks, Enter goes on.`);
  launchDeps.prompts.step("Platforms");
  const picked = await pickMany({ message: "Which platforms do you want log on?", options: START_PLATFORMS.map(platformOption), required: false });
  if (picked === null) return { code: 1 };
  const platforms = START_PLATFORMS.filter((platform) => picked.includes(platform));
  for (const platform of platforms) {
    const label = PLATFORM_LABELS[platform];
    launchDeps.prompts.step(label);
    context.out(`\n${label}: add the account and sign it in.`);
    const added = await addAccount(context, platform);
    outcomes.push({ label, ok: added.code === 0, detail: added.code === 0 ? "account added and signed in" : "not signed in yet: log launch, Sign in an account you added" });
  }
  launchDeps.prompts.step("Extensions");
  const chosen = await pickMany({
    message: "Which extensions do you want?",
    options: SETUP_EXTENSIONS.map((extension) => ({ value: extension.id, label: extension.label, hint: extension.adds })),
    required: false,
  });
  if (chosen === null) return { code: 1 };
  for (const extension of SETUP_EXTENSIONS.filter((e) => chosen.includes(e.id))) {
    const outcome = await setUpExtension(context, extension);
    if (outcome === null) return { code: 1 };
    outcomes.push(outcome);
  }
  const offered = launchDeps.harnesses();
  if (offered.length) {
    launchDeps.prompts.step("Agent harnesses");
    const wired = await pickMany({
      message: "Which agent harnesses should log wire itself into?",
      options: offered.map((harness) => ({ value: harness.id, label: harness.label, hint: harness.adds })),
      required: false,
    });
    if (wired === null) return { code: 1 };
    for (const harness of offered.filter((h) => wired.includes(h.id))) outcomes.push(await setUpHarness(harness));
  }
  context.out(`\n${setupSummary(outcomes, launchDeps.envFile())}`);
  return { code: 0 };
}

async function runStart(context: CommandContext, action: string): Promise<CommandResult> {
  if (action === "setup") return runSetup(context);
  if (action === "add") return addAccount(context);
  if (action === "agent") {
    context.out(agentSetupText());
    return { code: 0 };
  }
  if (action === "console") {
    const { runConsoleMenu } = await import("../console/index.ts");
    return runConsoleMenu(context);
  }
  if (action === "signIn") {
    const account = await pickAccount(context, "Which account to sign in?", () => true);
    if (typeof account === "string") return { code: 1, stderr: `log launch: ${account}` };
    return account === null ? { code: 1 } : signInAccount(context, account);
  }
  const account = await pickAccount(context, "Which account to check?", (a) => a.platform !== "facebook");
  if (typeof account === "string") return { code: 1, stderr: `log launch: ${account} Facebook accounts are checked when they connect.` };
  if (account === null) return { code: 1 };
  return checkAccountSession(context, account);
}

export async function checkAccountSession(context: CommandContext, account: Pick<PickedAccount, "platform" | "accountName">): Promise<{ code: number }> {
  return delegate(await commandFor("session", account.platform), context, ["check", "--account", account.accountName]);
}

export async function runLaunch(context: CommandContext, argv: string[]): Promise<CommandResult> {
  const parsed = parseLaunchArgs(argv);
  if (!parsed.ok) return { code: 1, stderr: `log launch: ${parsed.error}\n${LAUNCH_USAGE}` };

  if (parsed.json) {
    return {
      code: 0,
      stdout: JSON.stringify(
        {
          ok: true,
          interactive: false,
          start: [...START_ACTIONS],
          hint: "Run `log launch` in an interactive terminal (no --json) for guided mode.",
        },
        null,
        2,
      ),
    };
  }

  if (!shouldPrompt(false, launchDeps.tty())) {
    return {
      code: 2,
      stderr:
        `log launch: guided mode needs an interactive terminal.\n` +
        `Use the scriptable commands instead: log localAccount add, log twitter cookies save, log <platform> session check.\n` +
        LAUNCH_USAGE,
    };
  }

  const prompts = launchDeps.prompts;
  try {
    prompts.intro(parsed.setup ? "log setup" : "log launch");
    if (parsed.setup) {
      const result = await runSetup(context);
      if (result.code === 0) prompts.outro("Done.");
      return result;
    }
    const start = await pick({
      message: "What do you want to do?",
      options: [
        { value: "setup", label: "Set up log: pick platforms, sign in, add extensions", hint: "log launch --setup" },
        { value: "add", label: "Add an account and sign it in", hint: "log localAccount add" },
        { value: "signIn", label: "Sign in an account you added", hint: "log <platform> cookies save" },
        { value: "check", label: "Check an account is still signed in", hint: "log <platform> session check" },
        { value: "agent", label: "Connect your agent (Claude Code, Codex)", hint: "logMcp" },
        { value: "console", label: "Console: this machine's status, accounts, usage, events and settings", hint: "log console" },
      ],
    });
    if (start === null) return { code: 1 };
    const result = await runStart(context, start);
    if (result.code === 0) prompts.outro("Done.");
    return result;
  } catch (error) {
    if (error instanceof SetupCancelled) return { code: 130 };
    prompts.outro("Failed");
    const message = error instanceof Error ? error.message : String(error);
    return { code: 2, stderr: `log launch failed: ${message}` };
  }
}

export const launchCommand: Command = {
  usage: LAUNCH_USAGE,
  platform: "any",
  name: "launch",
  terminalOnly: "prompts in a terminal (Clack). Call the commands it wraps directly.",
  effect: "write",
  summary: "Start here: a guided menu to set log up (platforms, sign-ins, the account's browser and extensions), add an account, sign it in, check it and connect your agent",
  args: "[--setup] [--json]",
  run: runLaunch,
};
