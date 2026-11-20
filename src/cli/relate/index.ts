import { buildGraph, pointerOf, eventsThrough, queryGraph, relateContext, verifyGraph, graphDir } from "../../relate/graph/index.ts";
import type { GraphCounts } from "../../relate/graph/index.ts";
import { defaultDbPath, openDatabase } from "../../storage/schema/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const RELATE_USAGE = [
  "Usage: log relate build [--json]            (projects log.db's people, rooms, posts and who said or engaged what into a new Relate graph file, then points at it)",
  "       log relate status [--json]           (which graph file is current, through which event, and how far behind log.db it is)",
  "       log relate verify [--json]           (compares every node and edge count in the graph with what log.db derives now)",
  "       log relate ask \"<text>\" [--json]     (the connected context the hook injects for the people that text names, e.g. \"@someone\")",
  "       log relate query \"<cypher>\" [--json] (a read-only Cypher query on the current graph, at most 100 rows)",
  "The graph is a projection: log.db's events stay the record, and a build can always be thrown away and redone (docs/relateGraph.md).",
].join("\n");

export const RELATE_INPUT: CommandInput = {
  forms: [
    { words: ["build"], effect: "write", summary: "Project log.db into a new Relate graph file and make it the current one (local only, nothing is sent)", positionals: [], flags: [JSON_FLAG] },
    { words: ["status"], summary: "Show the current Relate graph file, the event it was built through and how far behind log.db it is", positionals: [], flags: [JSON_FLAG] },
    { words: ["verify"], summary: "Compare every node and edge count in the Relate graph with what log.db derives now", positionals: [], flags: [JSON_FLAG] },
    { words: ["ask"], summary: "Show the connected context (chats, engagement, shared groups, who could introduce, same orbit) for the people a text names", positionals: [{ name: "text", kind: "string", required: true, description: "A prompt or note naming people, e.g. \"reply to @someone\"" }], flags: [JSON_FLAG] },
    { words: ["query"], summary: "Run a read-only Cypher query on the current Relate graph (at most 100 rows)", positionals: [{ name: "cypher", kind: "string", required: true, description: "The Cypher to run, e.g. MATCH (i:Identity)-[:ENGAGED]->(p:Post) RETURN i.handle, p.text LIMIT 5" }], flags: [JSON_FLAG] },
  ],
};

const countsLine = (c: GraphCounts): string => `${c.accounts} accounts, ${c.identities} people, ${c.rooms} rooms, ${c.posts} posts, ${c.memberOf} memberships, ${c.said} said, ${c.engaged} engaged`;

export const relateCommand: Command = {
  usage: RELATE_USAGE,
  platform: "any",
  name: "relate",
  effect: "read",
  input: RELATE_INPUT,
  summary: "A Relate (Neo4j) graph of who talks, engages and shares rooms with the owner's accounts, projected from log.db and injected as connected context",
  args: "build|status|verify|ask <text>|query <cypher> [--json]",
  run(context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(RELATE_INPUT));
    if (!parsed.ok) return refuseInput("relate", parsed.error, RELATE_USAGE);
    const [sub, ...rest] = parsed.positionals;
    const json = parsed.flags["json"] === true;
    const dbPath = defaultDbPath();
    if (sub === "build") {
      context.err(`log relate build: projecting ${dbPath} into a new graph under ${graphDir(dbPath)}`);
      const pointer = buildGraph(dbPath);
      if (json) return { code: 0, stdout: JSON.stringify(pointer, null, 2) };
      return { code: 0, stdout: `log relate build: ${countsLine(pointer.counts)}, through event ${pointer.throughSeq}, in ${pointer.ms} ms.\n  ${pointer.file}` };
    }
    if (sub === "status") {
      const handle = openDatabase(dbPath);
      const pointer = pointerOf(dbPath, handle);
      const through = eventsThrough(handle);
      if (json) return { code: 0, stdout: JSON.stringify({ pointer, eventsThrough: through, behind: pointer ? through - pointer.throughSeq : null }, null, 2) };
      if (!pointer) return { code: 1, stdout: "log relate status: no graph for this log.db yet. `log relate build` makes one." };
      return { code: 0, stdout: `log relate status: ${pointer.file}\n  built ${pointer.builtAt} through event ${pointer.throughSeq} (log.db is at ${through}, ${through - pointer.throughSeq} behind)\n  ${countsLine(pointer.counts)}` };
    }
    if (sub === "verify") {
      const result = verifyGraph(dbPath);
      if (json) return { code: result.ok ? 0 : 1, stdout: JSON.stringify(result, null, 2) };
      if (!result.pointer) return { code: 1, stdout: "log relate verify: no graph for this log.db yet. `log relate build` makes one." };
      if (result.behind > 0) return { code: 1, stdout: `log relate verify: the graph is ${result.behind} events behind log.db, so its counts can't match yet. \`log relate build\` catches it up.` };
      const lines = (Object.keys(result.expected) as (keyof GraphCounts)[]).map((k) => `  ${k.padEnd(10)} log.db ${String(result.expected[k]).padStart(6)}  graph ${String(result.found[k]).padStart(6)}  ${result.differs.includes(k) ? "DIFFERS" : "same"}`);
      return { code: result.ok ? 0 : 1, stdout: [result.ok ? "log relate verify: the graph holds exactly what log.db derives." : `log relate verify: >>> DIFFERS: ${result.differs.join(", ")}. \`log relate build\` replaces it.`, ...lines].join("\n") };
    }
    if (sub === "ask" && rest.length === 1) {
      const answer = relateContext(rest[0], dbPath);
      if (json) return { code: 0, stdout: JSON.stringify(answer, null, 2) };
      if (answer.outcome === "noGraph") return { code: 1, stdout: "log relate ask: no graph for this log.db yet. `log relate build` makes one." };
      return { code: 0, stdout: answer.text || "log relate ask: that text names nobody the graph knows." };
    }
    if (sub === "query" && rest.length === 1) {
      const result = queryGraph(rest[0], {}, dbPath);
      if (json) return { code: 0, stdout: JSON.stringify({ rows: result.rows, truncated: result.truncated, throughSeq: result.pointer.throughSeq }, null, 2) };
      return { code: 0, stdout: [...result.rows.map((r) => JSON.stringify(r)), result.truncated ? "(more rows: the first 100 are shown)" : `(${result.rows.length} rows, graph through event ${result.pointer.throughSeq})`].join("\n") };
    }
    return refuseInput("relate", 'say build, status, verify, ask "<text>" or query "<cypher>"', RELATE_USAGE);
  },
};
