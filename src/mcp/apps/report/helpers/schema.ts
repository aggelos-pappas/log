import { z } from "zod";
import { MACHINE_DIRECTIONS, MACHINE_LIMITS as M, MACHINE_PLATFORMS, MACHINE_TONES, MACHINE_VIEWS } from "../../../../relate/machine/types.ts";
import { MAP_LIMITS as MP, MAP_PLATFORMS, MAP_TONES, MAP_VIEWS } from "../../../../relate/map/types.ts";
import { REPORT_BLOCK_TYPES, REPORT_LIMITS as L } from "../types.ts";
import type { ReportCheck, ReportRefusal, ReportSpec } from "../types.ts";

const line = (max: number = L.label) => z.string().trim().min(1).max(max);
const finite = z.number().finite();

const heading = z.strictObject({ type: z.literal("heading"), text: line(L.title), level: z.union([z.literal(2), z.literal(3)]).optional() });
const text = z.strictObject({ type: z.literal("text"), text: line(L.text) });
const stat = z.strictObject({
  type: z.literal("stat"),
  items: z.array(z.strictObject({ label: line(), value: z.union([finite, line()]), unit: line(12).optional(), delta: line(24).optional(), hint: line().optional() })).min(1).max(L.stats),
});
const barChart = z.strictObject({
  type: z.literal("barChart"),
  title: line(L.title).optional(),
  unit: line(24).optional(),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  data: z.array(z.strictObject({ label: line(), value: finite.min(0), hint: line().optional() })).min(1).max(L.bars),
});
const lineChart = z
  .strictObject({
    type: z.literal("lineChart"),
    title: line(L.title).optional(),
    unit: line(24).optional(),
    x: z.array(line(24)).min(2).max(L.points),
    series: z.array(z.strictObject({ name: line(), values: z.array(finite).min(2).max(L.points) })).min(1).max(L.series),
  })
  .superRefine((block, ctx) => {
    block.series.forEach((s, i) => {
      if (s.values.length !== block.x.length) ctx.addIssue({ code: "custom", path: ["series", i, "values"], message: `has ${s.values.length} values for ${block.x.length} x labels`, params: { refusal: "reportSeriesMismatch" } });
    });
  });
const cell = z.union([finite, z.string().max(L.text), z.null()]);
const table = z
  .strictObject({
    type: z.literal("table"),
    title: line(L.title).optional(),
    columns: z.array(z.strictObject({ key: line(40), label: line(), align: z.enum(["left", "right"]).optional(), format: z.enum(["text", "number", "date"]).optional() })).min(1).max(L.columns),
    rows: z.array(z.record(z.string(), cell)).max(L.rows),
  })
  .superRefine((block, ctx) => {
    const keys = new Set(block.columns.map((c) => c.key));
    if (keys.size !== block.columns.length) ctx.addIssue({ code: "custom", path: ["columns"], message: "column keys repeat", params: { refusal: "reportColumnUnknown" } });
    block.rows.forEach((row, i) => {
      for (const key of Object.keys(row)) if (!keys.has(key)) ctx.addIssue({ code: "custom", path: ["rows", i, key], message: `no column has key "${key}"`, params: { refusal: "reportColumnUnknown" } });
    });
  });
const personList = z.strictObject({
  type: z.literal("personList"),
  title: line(L.title).optional(),
  unit: line(24).optional(),
  people: z.array(z.strictObject({ name: line(), handle: line(60).optional(), count: finite.min(0).optional(), note: line(L.title).optional() })).min(1).max(L.people),
});
const callout = z.strictObject({ type: z.literal("callout"), tone: z.enum(["info", "success", "warning"]).optional(), title: line().optional(), text: line(L.text) });

const ms = finite.min(0).nullable().optional();
export const machinePersonFact = z.strictObject({ slot: line(40), text: line(M.quote), quote: line(M.quote), at: line(40) });
export const machinePersonLane = z.strictObject({ platform: line(M.platform), state: line(M.label) });
export const machinePerson = z.strictObject({
  key: line(M.label),
  handle: line(M.label),
  name: line(M.label).optional(),
  initials: line(4),
  platform: line(M.platform),
  at: ms,
  quiet: z.boolean().optional(),
  fit: finite.optional(),
  next: line(M.event).optional(),
  tool: line(M.tool).optional(),
  lanes: z.array(machinePersonLane).max(M.lanes).optional(),
  facts: z.array(machinePersonFact).max(M.personFacts).optional(),
});
export const machineState = z.strictObject({
  id: line(M.id),
  label: line(M.label),
  note: line(M.note).optional(),
  explain: line(M.explain).optional(),
  tone: z.enum(MACHINE_TONES).optional(),
  count: finite.min(0).optional(),
  chips: z.array(line(M.label)).max(M.chips).optional(),
  at: ms,
  current: z.boolean().optional(),
  visited: z.boolean().optional(),
  initial: z.boolean().optional(),
  final: z.boolean().optional(),
  details: z.array(z.strictObject({ label: line(), value: line(M.note) })).max(M.details).optional(),
  platform: line(M.platform).optional(),
  people: z.array(machinePerson).max(M.people).optional(),
  peopleMore: finite.min(0).optional(),
  quietCount: finite.min(0).optional(),
});
export const machineTransition = z.strictObject({
  id: line(M.id),
  from: line(M.id),
  to: line(M.id),
  event: line(M.event),
  tool: line(M.tool).optional(),
  by: z.enum(["you", "them"]).optional(),
  at: ms,
  count: finite.min(0).optional(),
  taken: z.boolean().optional(),
  next: z.boolean().optional(),
  dashed: z.boolean().optional(),
  note: line(M.note).optional(),
  platform: line(M.platform).optional(),
});
const machineAccount = z.strictObject({ platform: line(M.platform), handle: line(M.label), link: z.enum(["linked", "suggested"]) });
const machinePlatformView = z.strictObject({
  platform: z.enum(MACHINE_PLATFORMS),
  count: finite.min(0),
  summary: line(L.text).optional(),
  states: z.array(machineState).min(1).max(M.states),
  transitions: z.array(machineTransition).max(M.transitions),
});
export const stateMachine = z
  .strictObject({
    type: z.literal("stateMachine"),
    title: line(L.title).optional(),
    view: z.enum(MACHINE_VIEWS).optional(),
    direction: z.enum(MACHINE_DIRECTIONS).optional(),
    summary: line(L.text).optional(),
    states: z.array(machineState).min(1).max(M.states),
    transitions: z.array(machineTransition).max(M.transitions),
    platform: z.enum(MACHINE_PLATFORMS).optional(),
    accounts: z.array(machineAccount).max(M.accounts).optional(),
    platforms: z.array(machinePlatformView).max(MACHINE_PLATFORMS.length).optional(),
  })
  .superRefine((block, ctx) => {
    const ids = new Set(block.states.map((s) => s.id));
    if (ids.size !== block.states.length) ctx.addIssue({ code: "custom", path: ["states"], message: "state ids repeat" });
    block.transitions.forEach((t, i) => {
      for (const [end, id] of Object.entries({ from: t.from, to: t.to })) if (!ids.has(id)) ctx.addIssue({ code: "custom", path: ["transitions", i, end], message: `no state has id "${id}"` });
    });
  });

const mapRoom = z.strictObject({ key: line(MP.id), name: line(MP.label), server: z.string().max(MP.label).nullable().optional(), kind: line(MP.platform), platform: line(MP.platform), meaning: line(MP.label), at: z.string().max(MP.at).nullable().optional(), members: z.array(line(MP.label)).max(MP.members) });
const mapFact = z.strictObject({ slot: line(40), text: line(MP.text), quote: line(MP.quote), at: line(40) });
const mapLane = z.strictObject({ platform: line(MP.platform), state: line(MP.label) });
const mapNext = z.strictObject({ text: line(MP.text), tool: line(MP.platform) });
const mapNode = z.strictObject({
  key: line(MP.id), handle: line(MP.label), name: line(MP.label).optional(), initials: line(4),
  avatar: z.string().startsWith("data:image/").max(6_000_000).nullable().optional(),
  platform: line(MP.platform), platforms: z.array(line(MP.platform)).max(8),
  ring: z.number().int().min(1).max(4), tone: z.enum(MAP_TONES), why: line(MP.why),
  rooms: z.array(mapRoom).max(MP.nodeRooms), facts: z.array(mapFact).max(MP.facts),
  next: mapNext.optional(), lanes: z.array(mapLane).max(MP.lanes),
  quiet: z.boolean(), talk: z.boolean(), at: ms, machine: stateMachine,
});
const mapEdge = z.strictObject({ a: line(MP.id), b: line(MP.id), kind: z.enum(["direct", "shared", "mention", "reply", "quote", "reacted"]), room: line(MP.label), at: z.string().max(MP.at).nullable().optional() });
const mapRing = z.strictObject({ id: z.number().int().min(1).max(4), label: line(MP.label), tone: z.enum(MAP_TONES), count: finite.min(0), nodes: z.array(line(MP.id)).max(MP.nodes) });
const mapHop = z.strictObject({ key: line(MP.id), handle: line(MP.label), room: line(MP.label).optional(), at: z.string().max(MP.at).nullable().optional() });
export const networkMap = z
  .strictObject({
    type: z.literal("networkMap"), title: line(L.title).optional(), summary: line(L.text).optional(),
    view: z.enum(MAP_VIEWS).optional(), platform: z.enum(MAP_PLATFORMS).optional(),
    cursor: finite.min(0), nextCursor: finite.min(0).nullable(), total: finite.min(0),
    rings: z.array(mapRing).max(4), nodes: z.array(mapNode).max(MP.nodes),
    edges: z.array(mapEdge).max(MP.edges), rooms: z.array(mapRoom).max(MP.rooms),
    path: z.array(mapHop).max(MP.path), target: line(MP.id).optional(),
  })
  .superRefine((block, ctx) => {
    const keys = new Set(block.nodes.map((n) => n.key));
    block.edges.forEach((e, i) => {
      for (const end of ["a", "b"] as const) {
        const key = e[end];
        if (key !== "owner" && !keys.has(key)) ctx.addIssue({ code: "custom", path: ["edges", i, end], message: `no node has key "${key}"` });
      }
    });
  });

const block = z.discriminatedUnion("type", [heading, text, stat, barChart, lineChart, table, personList, callout, stateMachine, networkMap]);

export const reportSchema = z.strictObject({
  title: line(L.title),
  subtitle: line(L.title).optional(),
  blocks: z.array(block).min(1).max(L.blocks),
});

const where = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((out, part) => (typeof part === "number" ? `${out}[${part}]` : out ? `${out}.${String(part)}` : String(part)), "") || "report";

function refusalOf(issue: z.core.$ZodIssue): ReportRefusal {
  const named = (issue as { params?: { refusal?: ReportRefusal } }).params?.refusal;
  if (named) return named;
  if (issue.code === "invalid_union" && (issue as { discriminator?: string }).discriminator === "type") return "reportBlockUnknown";
  if (issue.code === "too_big" && (issue.origin === "array" || issue.origin === "string")) return "reportTooLarge";
  return "reportFieldInvalid";
}

function messageOf(issue: z.core.$ZodIssue, code: ReportRefusal): string {
  if (code === "reportBlockUnknown") return `is not a block type: use one of ${REPORT_BLOCK_TYPES.join(", ")}`;
  return issue.message;
}

export function checkReport(input: unknown): ReportCheck {
  const parsed = reportSchema.safeParse(input);
  if (parsed.success) return { ok: true, spec: parsed.data as ReportSpec };
  const coded = parsed.error.issues.map((issue) => ({ issue, code: refusalOf(issue) }));
  const first = coded.find((c) => c.code !== "reportFieldInvalid") ?? coded[0];
  return { ok: false, code: first.code, issues: coded.slice(0, 8).map(({ issue, code }) => `${where(issue.path)}: ${messageOf(issue, code)}`) };
}
