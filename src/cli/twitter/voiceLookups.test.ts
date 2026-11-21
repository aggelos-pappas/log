import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase } from "../../storage/schema";
import { appendEvent } from "../../inbox/store/index.ts";
import { hashEmbedder, loadConversations } from "../../search/conversations/index.ts";
import type { Conversation } from "../../search/conversations/index.ts";
import { buildVoiceIndex, closeSharedVoiceIndex, voiceDir } from "../../voice/pairs/index.ts";
import { buildProfile, saveConventions } from "../../voice/conventions/index.ts";
import type { ConventionsModel } from "../../voice/conventions/index.ts";
import type { DecisionRequest, DecisionsClient } from "../../subq/decisions/index.ts";
import { chatIdIn, chatOfHandle, resolveVoiceChat, voiceCommand, voiceDeps } from "./helpers/voice.ts";
import type { GateReading } from "./helpers/voice.ts";

const scratch = mkdtempSync(join(tmpdir(), "voiceLookups"));
const KEYS = ["LOG_DB", "LOG_HOME", "LOG_SEARCH_DIR", "LOG_CONVERSATIONS_DIR", "LOG_VOICE_GUIDE", "LOG_VOICE_TRAIN", "LOG_AI_TELLS", "LOG_INBOX_STATE"] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const deps = { decisions: voiceDeps.decisions, embedder: voiceDeps.embedder };
const context = { err: () => {}, out: () => {} } as never;

const THEM = "100200300";
const OWNER = "1990000000000000001";
const COLON = `${THEM}:${OWNER}`;
const DASH = `${THEM}-${OWNER}`;
const REVERSED = `${OWNER}:${THEM}`;
const SICK = "sick man ill be keen to see it land";
const TWO_LINES = "fml man the glazing with no offers is the worst part\nill send anything i see your way";
const MODEL_PARAGRAPH = "I completely understand how frustrating that must be. Getting a fix merged upstream can take time, but I would be happy to help you draft a patch and walk through the safeguards together whenever you are ready.";

function say(conversationId: string, fromMe: boolean, text: string, minute: number): void {
  const at = new Date(Date.UTC(2026, 10, 21, 8, minute)).toISOString();
  appendEvent({ platform: "twitter", account: "xAccount", conversationId, type: fromMe ? "ownMessage" : "message", with: "linus_k", text, sourceAt: at, receivedAt: at, payload: { senderId: fromMe ? OWNER : THEM } });
}

function detector(): ConventionsModel {
  const profile = buildProfile([
    ...["ill send it over now", "ill send the patch", "happy to help with that", "ill send you the details"].map((text, i) => ({ side: "ai" as const, text, chat: `chat${i}` })),
    ...["nah mate not yet", "yo lad filmed it today", "sound cheers"].map((text) => ({ side: "owner" as const, text, chat: "grace_ships" })),
  ]);
  const band = (name: "short" | "medium" | "long") => ({ band: name, threshold: 0.6, gramRatio: 0, ownerP50: 0.2, abstain: false, ownerHeldOut: 0, ownerFlagged: 0, aiHeldOut: 0, aiCaught: 0, auc: 0.9 });
  return { builtAt: new Date().toISOString(), embedModel: "hash", ngram: [2, 2], vocab: ["ll", "se", "ha", "de", "an", "in", "e "], idf: [1, 1, 1, 1, 1, 1, 1], gramWeights: [4, 4, 4, 4, 4, 4, 4], embedWeights: [], embedScale: 1, bias: 0, bands: [band("short"), band("medium"), band("long")], profile, mutedRules: [], ownersPhrases: [], report: {} as ConventionsModel["report"] };
}

const subq: DecisionsClient = async (request: DecisionRequest) => ({ model: "fake", usage: { input_tokens: 0, output_tokens: 0 }, answers: Object.fromEntries(Object.keys(request.questions).map((key) => [key, { type: "noul" as const, noul: 0.78 }])) });

async function gate(argv: string[]): Promise<{ code: number; reading: GateReading }> {
  const result = await voiceCommand.run(context, [...argv, "--json"]);
  return { code: result.code, reading: JSON.parse(result.stdout ?? "{}") as GateReading };
}

beforeAll(async () => {
  for (const dir of ["home", "search"]) mkdirSync(join(scratch, dir), { recursive: true });
  process.env.LOG_DB = join(scratch, "log.db");
  process.env.LOG_HOME = join(scratch, "home");
  process.env.LOG_SEARCH_DIR = join(scratch, "search");
  process.env.LOG_CONVERSATIONS_DIR = scratch;
  process.env.LOG_VOICE_GUIDE = join(scratch, "guide.md");
  process.env.LOG_VOICE_TRAIN = "off";
  delete process.env.LOG_AI_TELLS;
  delete process.env.LOG_INBOX_STATE;
  writeFileSync(process.env.LOG_VOICE_GUIDE, "lowercase, short, no commas, no emoji");
  voiceDeps.decisions = () => subq;
  voiceDeps.embedder = () => hashEmbedder();
  say(DASH, false, "keen to see the eyes plugin when its out", 0);
  say(COLON, false, "my plugin works but i cant push it before this lands", 1);
  say(COLON, true, SICK, 2);
  say(COLON, false, "nothing on the job front yet still looking", 3);
  say(COLON, true, "fml man the glazing with no offers is the worst part", 4);
  say(COLON, true, "ill send anything i see your way", 5);
  say(COLON, false, "o same it gives us more control", 6);
  await buildVoiceIndex(loadConversations(), hashEmbedder(), voiceDir());
  saveConventions(detector());
});

afterAll(async () => {
  voiceDeps.decisions = deps.decisions;
  voiceDeps.embedder = deps.embedder;
  await closeSharedVoiceIndex();
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  openDatabase(join(scratch, "log.db")).close();
  Bun.gc(true);
  rmSync(scratch, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
});

describe("one X conversation id, whichever way it is written", () => {
  const conversations: Conversation[] = [
    { platform: "twitter", account: "xAccount", conversationId: COLON, box: "xchat", with: ["linus_k"], messages: [] },
    { platform: "twitter", account: "xAccount", conversationId: DASH, box: "inbox", with: ["linus_k"], messages: [] },
    { platform: "twitter", account: "xAccount", conversationId: `200300400:${OWNER}`, box: "xchat", with: ["grace_ships"], messages: [] },
  ];

  test("colon, dash and either pair order name the same chat, and a handle finds it too", () => {
    for (const id of [COLON, DASH, REVERSED, `${OWNER}-${THEM}`]) expect(chatIdIn(conversations, [], id)).toBe("twitter:linus_k");
    expect(chatIdIn(conversations, [], `999:${OWNER}`)).toBeNull();
    expect(resolveVoiceChat(context, "", "@Linus_K", conversations)).toBe("twitter:linus_k");
    expect(resolveVoiceChat(context, COLON, "grace_ships", conversations)).toBe("twitter:linus_k");
    expect(resolveVoiceChat(context, `999:${OWNER}`, "grace_ships", conversations)).toBe("twitter:grace_ships");
  });

  test("a handle with no one-to-one chat resolves to nothing", () => {
    expect(chatOfHandle([], "linus_k")).toBeNull();
    expect(resolveVoiceChat(context, "", "nobody_here", conversations)).toBe("");
  });
});

describe("the gate reads the owner's own replies as his", () => {
  test("his own sent lines pass through the colon id, the dash id, the reversed pair and the handle alone", async () => {
    for (const argv of [["--with", COLON], ["--with", DASH], ["--with", REVERSED], []]) {
      for (const text of [SICK, TWO_LINES]) {
        const { code, reading } = await gate(["--to", "linus_k", ...argv, "--text", text]);
        expect(reading.firstContact).toBe(false);
        expect(reading.owned?.lines.length).toBe(text.split("\n").length);
        expect(reading.conventions?.value).toBe(1);
        expect(reading.score!.score).toBeGreaterThanOrEqual(0.7);
        expect(reading.score!.threshold).toBe(0.7);
        expect(code).toBe(0);
      }
    }
  }, 60000);

  test("nearest real reply comes from his messages in this chat", async () => {
    const { reading } = await gate(["--to", "linus_k", "--with", COLON, "--text", SICK]);
    expect(reading.nearest?.reply).toBe(SICK);
    expect(reading.nearest?.cosine).toBeGreaterThan(0.99);
  });

  test("a model-written paragraph is still flagged and fails in the same chat", async () => {
    const { code, reading } = await gate(["--to", "linus_k", "--with", COLON, "--text", MODEL_PARAGRAPH]);
    expect(reading.owned).toBeUndefined();
    expect(reading.conventions?.flagged).toBe(true);
    expect(reading.score!.score).toBeLessThan(0.7);
    expect(code).toBe(1);
  });

  test("a first message is called one only when log.db holds nothing between them", async () => {
    const { reading } = await gate(["--to", "grace_ships", "--text", "yo saw your post on the launch"]);
    expect(reading.firstContact).toBe(true);
  });
});
