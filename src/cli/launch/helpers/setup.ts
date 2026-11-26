import { HARNESSES } from "../../../agentHooks/harness/types.ts";
import type { HarnessId } from "../../../agentHooks/harness/types.ts";

export type ExtensionId = "treg" | "memelord" | "inworld" | "fishAudio";

export type ExtensionAccess = { kind: "signIn"; command: string; args: readonly string[] } | { kind: "apiKey"; keyName: string; keyUrl: string; keyHint: string };

export interface SetupExtension {
  id: ExtensionId;
  label: string;
  adds: string;
  signUpUrl: string;
  signUpNote?: string;
  access: ExtensionAccess;
}

export const SETUP_EXTENSIONS: readonly SetupExtension[] = [
  {
    id: "treg",
    label: "treg",
    adds: "the tool catalog: web search, X and TikTok data, SEO, enrichment, with the keys held by treg",
    signUpUrl: "https://treg.to/?ref=matthewdonse-aebsh",
    access: { kind: "signIn", command: "treg", args: ["login"] },
  },
  {
    id: "memelord",
    label: "Memelord",
    adds: "memes, clips and stickers found for the moment in a chat",
    signUpUrl: "https://www.memelord.com/sign-up?ref=kfwut9wc",
    access: { kind: "apiKey", keyName: "MEMELORD_API_KEY", keyUrl: "https://www.memelord.com/settings/developer", keyHint: "Settings, Developer, create an API key" },
  },
  {
    id: "inworld",
    label: "Inworld",
    adds: "voice notes in your own cloned voice (the default voice provider)",
    signUpUrl: "https://inworld.ai/signup?ref=FSNLMJ2H",
    signUpNote: "Subscribe through this link and you get $10 in credits.",
    access: { kind: "apiKey", keyName: "INWORLD_API_KEY", keyUrl: "https://platform.inworld.ai", keyHint: "Settings, API Keys, copy the Basic (Base64) key" },
  },
  {
    id: "fishAudio",
    label: "Fish Audio",
    adds: "voice notes in your own cloned voice, as a second voice provider",
    signUpUrl: "https://fish.audio/?aff=Q6W4DNSLJCSXG",
    access: { kind: "apiKey", keyName: "FISH_API_KEY", keyUrl: "https://fish.audio/app/api-keys", keyHint: "API Keys, create a key" },
  },
];

const SETUP_ADDS: Readonly<Partial<Record<HarnessId, string>>> = {
  opencode: "log's tools as native tools (never Code Mode) and the hooks running, in ~/.config/opencode",
  hermes: "the one native log plugin in Hermes's plugins folder (HERMES_HOME, else ~/.hermes, else %LOCALAPPDATA%\\hermes on Windows): log's plays as skills, GenUI, the dashboard and Desktop halves, and the pre_llm_call hook that puts the play, pending messages and browser states before each model call; it retires the old logHooks half (then: hermes plugins enable log, and hermes mcp add log --command logMcp if config.yaml has no mcp_servers.log)",
};

export interface SetupHarness {
  id: HarnessId;
  label: string;
  adds: string;
}

export const SETUP_HARNESSES: readonly SetupHarness[] = HARNESSES.filter((h) => h.installedBy === "launchSetup").map((h) => ({ id: h.id, label: h.label, adds: SETUP_ADDS[h.id] ?? `log's hooks for ${h.label}` }));

export function setEnvValue(text: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex((raw) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(raw));
  if (at >= 0) {
    lines[at] = line;
    return lines.join("\n");
  }
  const body = text.replace(/\s+$/, "");
  return `${body ? `${body}\n` : ""}${line}\n`;
}

export interface SetupOutcome {
  label: string;
  ok: boolean;
  detail: string;
}

export function setupSummary(outcomes: readonly SetupOutcome[], envFile: string): string {
  const lines = ["Setup summary:"];
  for (const outcome of outcomes) lines.push(`  ${outcome.ok ? "✓" : "·"} ${outcome.label}: ${outcome.detail}`);
  if (!outcomes.length) lines.push("  nothing was set up this time");
  lines.push(
    "",
    `Your keys are in ${envFile}.`,
    "Run it again any time: log launch --setup",
    "Check an account: log <platform> session check --account <name>",
    "See every provider's balance: log balance",
    "Connect your agent: claude mcp add log -- logMcp",
  );
  return lines.join("\n");
}
