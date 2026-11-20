import { z } from "zod";
import { readIdentityProfile } from "../../../../inbox/profiles/index.ts";
import type { IdentityProfileView, ProfileQuery } from "../../../../inbox/profiles/index.ts";
import { readPlatformSenders, readTwitterSenders, SENDERS_MAX_LIMIT } from "../../../../inbox/senders/index.ts";
import type { SendersOptions, SendersReport } from "../../../../inbox/senders/index.ts";
import { readWaiting } from "../../../../inbox/waiting/index.ts";
import type { WaitingOptions, WaitingReport } from "../../../../inbox/waiting/index.ts";
import { PLATFORMS } from "../../../../cli/runner/helpers/platforms.ts";
import { profileBlocks, sendersBlocks, waitingBlocks } from "../presets.ts";
import type { ReportBlock, ReportRefusal } from "../types.ts";

export interface ReportDeps {
  readSenders: (options: SendersOptions) => SendersReport;
  readPlatformSenders: (platform: string, options: SendersOptions) => SendersReport;
  readProfile: (query: ProfileQuery) => IdentityProfileView;
  readWaiting: (options: WaitingOptions) => WaitingReport;
}

export const REPORT_DEPS: ReportDeps = { readSenders: readTwitterSenders, readPlatformSenders, readProfile: readIdentityProfile, readWaiting };

export class ReportSourceRefusal extends Error {
  constructor(readonly code: ReportRefusal, message: string) {
    super(message);
  }
}

const line = (max: number) => z.string().trim().min(1).max(max);
const since = line(40).optional().describe("Only messages from this date (2026-11-01) or span (7d, 4w, 12h) on");
const limit = z.number().int().min(1).max(SENDERS_MAX_LIMIT).optional().describe("How many people to list (default 20)");
const platform = z.enum(PLATFORMS);

const twitterDmsBySender = z.strictObject({
  source: z.literal("twitterDmsBySender").describe("Who messaged the X account in one-to-one DMs, from log.db"),
  account: line(80).optional().describe("One X account's accountName (default every X account)"),
  since,
  limit,
});

const dmsBySender = z.strictObject({
  source: z.literal("dmsBySender").describe("Who messaged the account in one-to-one chats on the platform you name, from log.db"),
  platform: platform.describe("The platform whose chats to count"),
  account: line(80).optional().describe("One account's accountName on that platform (default every account)"),
  since,
  limit,
});

const identityProfile = z.strictObject({
  source: z.literal("identityProfile").describe("One person's stored profile (name, bio, follower count, verified, avatar), from log.db"),
  platform: platform.describe("The platform the person is on"),
  userId: line(120).optional().describe("Their user id on that platform (give userId or handle)"),
  handle: line(120).optional().describe("Their handle on that platform (give userId or handle)"),
});

const waitingOnYou = z.strictObject({
  source: z.literal("waitingOnYou").describe("Who is waiting on the owner across every platform and account (the last word in the chat is theirs), and who opened his message without answering, each with who it is, the platform and account it is on, what they said and when, from log.db"),
  platform: platform.optional().describe("Only this platform (default every platform)"),
  account: line(80).optional().describe("Only this account's accountName (default every account)"),
  since: line(40).optional().describe("Only chats whose last message is from this date or span on (default 14d)"),
  limit,
});

type SourceInputs = { twitterDmsBySender: z.infer<typeof twitterDmsBySender>; dmsBySender: z.infer<typeof dmsBySender>; identityProfile: z.infer<typeof identityProfile>; waitingOnYou: z.infer<typeof waitingOnYou> };

export type ReportSourceName = keyof SourceInputs;

interface ReportSource<I> {
  schema: z.ZodType<I>;
  starter: string;
  read(input: I, deps: ReportDeps): unknown;
  blocks(read: unknown): ReportBlock[];
}

export const REPORT_SOURCES: { readonly [K in ReportSourceName]: ReportSource<SourceInputs[K]> } = {
  twitterDmsBySender: {
    schema: twitterDmsBySender,
    starter: "twitterDms",
    read: (input, deps) => deps.readSenders({ account: input.account ?? null, since: input.since ?? null, limit: input.limit }),
    blocks: (read) => sendersBlocks(read as SendersReport),
  },
  dmsBySender: {
    schema: dmsBySender,
    starter: "twitterDms",
    read: (input, deps) => deps.readPlatformSenders(input.platform, { account: input.account ?? null, since: input.since ?? null, limit: input.limit }),
    blocks: (read) => sendersBlocks(read as SendersReport),
  },
  identityProfile: {
    schema: identityProfile,
    starter: "person",
    read: (input, deps) => {
      if (!input.userId === !input.handle) throw new ReportSourceRefusal("reportFieldInvalid", "identityProfile: give userId or handle, one of them");
      return deps.readProfile({ platform: input.platform, userId: input.userId ?? null, handle: input.handle ?? null });
    },
    blocks: (read) => profileBlocks(read as IdentityProfileView),
  },
  waitingOnYou: {
    schema: waitingOnYou,
    starter: "waiting",
    read: (input, deps) => deps.readWaiting({ platform: input.platform ?? null, account: input.account ?? null, since: input.since ?? null, ...(input.limit ? { limit: input.limit } : {}) }),
    blocks: (read) => waitingBlocks(read as WaitingReport),
  },
};

export const REPORT_SOURCE_NAMES = Object.keys(REPORT_SOURCES) as ReportSourceName[];

export const reportDataSource = z.discriminatedUnion("source", [twitterDmsBySender, dmsBySender, identityProfile, waitingOnYou]);

export type ReportDataSource = z.infer<typeof reportDataSource>;

export function readReportSource(input: ReportDataSource, deps: ReportDeps): unknown {
  const source = REPORT_SOURCES[input.source] as ReportSource<ReportDataSource>;
  return source.read(input, deps);
}

export function sourceStarter(input: ReportDataSource): string {
  return REPORT_SOURCES[input.source].starter;
}

export function sourceBlocks(input: ReportDataSource, read: unknown): ReportBlock[] {
  return REPORT_SOURCES[input.source].blocks(read);
}
