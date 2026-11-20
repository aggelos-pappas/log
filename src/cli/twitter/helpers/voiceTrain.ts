import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../../../inbox/store/index.ts";
import { getState, putState } from "../../../storage/state/index.ts";
import { localEmbedder } from "../../../search/conversations/index.ts";
import { openSharedVoiceIndex, voiceDir } from "../../../voice/pairs/index.ts";
import { agentSessionDrafts, BUILD_GRACE_MS, conventionsBuiltAt, corpusCount, freshModels, openAiAsk, openConventions, OWNER_MIN_FOR_TRAINING, ownerMessages, pythonFit, saveConventions, saveCorpus, SPEND_CAP_USD, trainConventions, trainLines } from "../../../voice/conventions/index.ts";
import type { LoadedConventions, TrainDeps, TrainOptions } from "../../../voice/conventions/index.ts";
import type { CommandContext, CommandResult } from "../../runner/types.ts";
import { refuse } from "../../runner/helpers/index.ts";
import { voiceDeps } from "./voice.ts";

const REPO = resolve(fileURLToPath(new URL("../../../..", import.meta.url)));

export function aiTellsMode(env: Record<string, string | undefined> = process.env): "conventions" | "jina" {
  return env.LOG_AI_TELLS?.trim().toLowerCase() === "jina" ? "jina" : "conventions";
}

export function conventionsStale(builtAt: string | null, pairsFile = join(voiceDir(), "pairs.json")): boolean {
  if (!builtAt) return true;
  if (!existsSync(pairsFile)) return false;
  return statSync(pairsFile).mtimeMs > Date.parse(builtAt);
}

function ownersWritten(): number {
  try {
    return (db().prepare(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM messages WHERE fromOwner = 1 LIMIT ${OWNER_MIN_FOR_TRAINING})`).get() as { n: number }).n;
  } catch {
    return 0;
  }
}

export const conventionsDeps: { start: () => boolean; now: () => number } = {
  now: () => Date.now(),
  start: () => {
    const child = spawn("bun", [join(REPO, "bin", "log.ts"), "voice", "train"], { cwd: REPO, detached: true, stdio: "ignore", windowsHide: true, env: process.env });
    child.on("error", () => undefined);
    child.unref();
    return true;
  },
};

export function trainInBackground(context: CommandContext, why: string): boolean {
  if (process.env.LOG_VOICE_TRAIN === "off") return false;
  if (ownersWritten() < OWNER_MIN_FOR_TRAINING) return false;
  const now = conventionsDeps.now();
  const building = getState<{ at: number }>("voiceConventionsBuilding", "owner");
  if (building && now - building.updatedAt < BUILD_GRACE_MS) return false;
  putState("voiceConventionsBuilding", "owner", { at: now }, now);
  const started = conventionsDeps.start();
  if (started) context.err(`voice: the frontier-conventions detector is ${why}, so \`log voice train\` is rebuilding it in the background from his messages and the AI drafts log holds; this gate ${why === "missing" ? "reads no AI conventions" : "uses the older one"}`);
  return started;
}

export function ensureConventions(context: CommandContext): LoadedConventions | null {
  const loaded = openConventions();
  const builtAt = loaded?.model.builtAt ?? conventionsBuiltAt();
  if (!loaded) trainInBackground(context, "missing");
  else if (conventionsStale(builtAt)) trainInBackground(context, "older than his voice index");
  return loaded;
}

export function recordDrafts(texts: readonly string[], to: string, moment: string | null): void {
  try {
    saveCorpus(texts.map((text) => ({ side: "ai" as const, family: "agent", model: null, source: "gate", chatKey: to.replace(/^@/, "").toLowerCase().trim() || "unknown", momentKey: texts.length > 1 ? `gate:${moment ?? Date.now()}` : null, text, at: new Date().toISOString() })));
  } catch {
    return;
  }
}

export function trainDeps(context: CommandContext): TrainDeps & { stop: () => void } {
  let raw: ReturnType<typeof localEmbedder> | null = null;
  let stored: ReturnType<typeof voiceDeps.embedder> | null = null;
  const storedOf = () => (stored ??= voiceDeps.embedder());
  const rawOf = () => (raw ??= localEmbedder());
  return {
    get embedModel() {
      return storedOf().model;
    },
    embed: (texts) => storedOf().embed(texts),
    rawEmbed: (texts) => rawOf().embed(texts),
    fit: pythonFit(),
    agentDrafts: () => agentSessionDrafts(),
    owner: (aiTexts) => ownerMessages(db(), aiTexts),
    log: (line) => context.err(line),
    stop: () => raw?.stop?.(),
  };
}

export async function runVoiceTrain(context: CommandContext, input: { fresh?: number; spend?: number; drafts?: string; json?: boolean }, deps: TrainDeps & { stop?: () => void } = trainDeps(context), options: Partial<TrainOptions> = {}): Promise<CommandResult> {
  const started = Date.now();
  try {
    const ask = input.fresh ? options.ask ?? openAiAsk() : null;
    const result = await trainConventions(deps, { ...(input.drafts ? { draftsFile: input.drafts } : {}), ...(input.fresh ? { fresh: input.fresh, spendUsd: input.spend ?? SPEND_CAP_USD, ask, models: options.models ?? freshModels(), index: options.index ?? (() => openSharedVoiceIndex(voiceDeps.embedder())) } : {}) });
    putState("voiceConventionsBuilding", "owner", { at: 0, done: new Date().toISOString() }, 0);
    if (!result.model || !result.report) return { code: 1, stdout: input.json ? JSON.stringify({ ok: false, why: result.why, imported: result.imported, aiDrafts: corpusCount("ai") }, null, 2) : `log voice train: ${result.why}; grade drafts with the voice gate (each is kept) or add fresh ones with --fresh <n>` };
    saveConventions(result.model);
    const fresh = result.fresh ? [`fresh drafts: ${result.fresh.calls} of his past moments answered by ${Object.entries(result.fresh.byFamily).map(([f, n]) => `${f} ${n}`).join(", ")}; estimated $${result.fresh.estimateUsd.toFixed(2)}, spent $${result.fresh.spentUsd.toFixed(3)}${result.fresh.failed.length ? `; ${result.fresh.failed.length} calls failed (${[...new Set(result.fresh.failed.map((f) => f.model))].join(", ")})` : ""}`] : [];
    if (input.json) return { code: 0, stdout: JSON.stringify({ ok: true, builtAt: result.model.builtAt, report: result.report, imported: result.imported, fresh: result.fresh ? { calls: result.fresh.calls, spentUsd: result.fresh.spentUsd, estimateUsd: result.fresh.estimateUsd, byFamily: result.fresh.byFamily, failed: result.fresh.failed } : null, overused: result.model.profile.grams.slice(0, 20), habits: result.model.profile.habits }, null, 2) };
    const top = result.model.profile.grams.slice(0, 8).map((g) => `"${g.gram}" ${g.ratio.toFixed(0)}x`).join(", ");
    const habits = result.model.profile.habits.filter((h) => h.flags).map((h) => h.habit).join(", ");
    return { code: 0, stdout: [`log voice train: the frontier-conventions detector is rebuilt (${((Date.now() - started) / 1000).toFixed(0)} s) and the gate reads it as "not an AI tell"`, ...fresh, ...trainLines(result.report), `words models over-use against his: ${top || "none yet"}`, `habits models have and he doesn't: ${habits || "none"}`].join("\n") };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "spendOverCap" || code === "llmNotConfigured" || code === "sklearnMissing") return refuse("voice train", code, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    deps.stop?.();
  }
}
