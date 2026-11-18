import type { IdentityProfileView } from "../../../inbox/profiles/index.ts";
import type { SendersReport } from "../../../inbox/senders/index.ts";
import type { WaitingReport, WaitingRow } from "../../../inbox/waiting/index.ts";
import type { ReportBlock } from "./types.ts";

const ago = (at: string | null, now: number): string => {
  const time = Date.parse(at ?? "");
  if (Number.isNaN(time)) return "";
  const hours = Math.max(0, Math.round((now - time) / 3_600_000));
  return hours < 1 ? "just now" : hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

export function sendersBlocks(report: SendersReport, now: number = Date.now()): ReportBlock[] {
  const days = report.byDay.slice(-30);
  const top = report.senders.slice(0, 10);
  return [
    { type: "stat", items: [{ label: "Messages", value: report.messages }, { label: "People", value: report.people }, ...(top[0] ? [{ label: "Top", value: `@${top[0].handle}`, hint: `${top[0].count.toLocaleString("en-US")} messages` }] : [])] },
    ...(top.length ? [{ type: "barChart", title: "Who messages most", unit: "msgs", data: top.map((s) => ({ label: s.name, value: s.count })) } as ReportBlock] : []),
    ...(days.length > 1 ? [{ type: "lineChart", title: "Messages per day", x: days.map((d) => d.day.slice(5)), series: [{ name: "Messages", values: days.map((d) => d.count) }] } as ReportBlock] : []),
    ...(top.length ? [{ type: "table", title: "Latest from each", columns: [{ key: "name", label: "Person" }, { key: "last", label: "Last" }, { key: "said", label: "Latest message" }], rows: top.map((s) => ({ name: `${s.name} @${s.handle}`, last: ago(s.lastAt, now), said: s.lastMessage ?? "" })) } as ReportBlock] : []),
  ];
}

export function profileBlocks(profile: IdentityProfileView): ReportBlock[] {
  const extra = Object.entries(profile.extra).map(([key, value]) => ({ field: key, value: String(value) }));
  return [
    { type: "heading", text: `${profile.name}${profile.handle ? ` @${profile.handle}` : ""} on ${profile.platform}` },
    ...(profile.bio ? [{ type: "text", text: profile.bio } as ReportBlock] : []),
    { type: "stat", items: [...(profile.followerCount !== null ? [{ label: "Followers", value: profile.followerCount }] : []), ...(profile.verified !== null ? [{ label: "Verified", value: profile.verified ? "yes" : "no" }] : []), { label: "Profile kept", value: profile.fetchedAt.slice(0, 10) }] },
    ...(extra.length ? [{ type: "table", title: "More", columns: [{ key: "field", label: "Field" }, { key: "value", label: "Value" }], rows: extra } as ReportBlock] : []),
  ];
}

const waitingRows = (rows: readonly WaitingRow[], now: number) => rows.map((r) => ({ who: r.who, on: `${r.platform}${r.kind === "group" ? " group" : ""}`, account: r.account, said: r.said, when: ago(r.at, now) }));

const WAITING_COLUMNS = [{ key: "who", label: "Who" }, { key: "on", label: "Platform" }, { key: "account", label: "Account" }, { key: "said", label: "What they said" }, { key: "when", label: "When" }];

export function waitingBlocks(report: WaitingReport, now: number = Date.now()): ReportBlock[] {
  return [
    { type: "stat", items: [{ label: "Waiting on you", value: report.waiting.length }, { label: "Opened, no reply", value: report.followUps.length }, ...report.byPlatform.slice(0, 4).map((p) => ({ label: p.platform, value: p.waiting, hint: `${p.followUps} opened, no reply` }))] },
    ...(report.waiting.length ? [{ type: "table", title: "Waiting on you", columns: WAITING_COLUMNS, rows: waitingRows(report.waiting, now) } as ReportBlock] : [{ type: "callout", tone: "success", text: "Nobody is waiting on you in this window." } as ReportBlock]),
    ...(report.followUps.length ? [{ type: "table", title: "They opened it and didn't answer", columns: WAITING_COLUMNS, rows: waitingRows(report.followUps, now) } as ReportBlock] : []),
  ];
}
