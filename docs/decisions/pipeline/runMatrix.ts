import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { subqKey } from "../../../src/subq/decisions/index.ts";

const here = import.meta.dir;
const root = join(here, "..", "..", "..");
const url = "https://api.subq.ai/v1/systemone";
const model = "subq-snap-preview";
const dryRun = process.argv.includes("--dry-run");
const key = subqKey();
if (!key && !dryRun) throw new Error("no SubQ key found");

type Option = { id: string; name: string; description: string };
type Criterion = { id: string; question: string; levels: string[] };
type Decision = { id: string; question: string; options: Option[]; criteria: Criterion[] };

const decisions = JSON.parse(readFileSync(join(here, "decisions.json"), "utf8")) as Decision[];
const claims = JSON.parse(readFileSync(join(here, "claims.json"), "utf8")) as { id: string; statement: string }[];
const read = (rel: string) => readFileSync(join(root, rel), "utf8");
const evidence: [string, string][] = [
  ["docs/decisions/pipeline/issue.md", read("docs/decisions/pipeline/issue.md")],
  ["docs/decisions/pipeline/research.md", read("docs/decisions/pipeline/research.md")],
  ["docs/specs/people.md", read("docs/specs/people.md")],
  ["src/inbox/label/client.ts", read("src/inbox/label/client.ts")],
  ["src/inbox/label/types.ts", read("src/inbox/label/types.ts")],
  ["src/people/helpers/match.ts", read("src/people/helpers/match.ts")],
  ["src/models/manifest/types.ts", read("src/models/manifest/types.ts")],
];

function stateFor(decision: Decision): string {
  const situation = `SITUATION
log is a Bun/TypeScript CLI and MCP server that reads and answers its owner's DMs on X, Discord, Slack and Instagram (540 people). It labels each conversation and links one person's accounts across platforms; both are weak today. The machine is a Windows 11 laptop with a Ryzen 9 8945HS and no NVIDIA GPU. Decide: ${decision.question}
Judge only from the evidence below: the papers, the live labels and suggestions on this machine, the specs and log's code.

OPTIONS
${decision.options.map((o) => `- ${o.id}: ${o.name}. ${o.description}`).join("\n")}

CRITERIA
${decision.criteria.map((c) => `- ${c.id}: ${c.question}`).join("\n")}

CLAIMS
${claims.map((c) => `- ${c.id}: ${c.statement}`).join("\n")}

EVIDENCE`;
  return [situation, ...evidence.map(([name, body]) => `\n===== FILE: ${name} =====\n${body}`)].join("\n");
}

async function decide(state: string, questions: Record<string, unknown>) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, state, questions }) });
    if (response.ok) return (await response.json()) as { answers: Record<string, unknown>; usage?: { input_tokens?: number } };
    const body = await response.text();
    if (response.status === 429 || response.status >= 500) {
      await Bun.sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${response.status} ${body.slice(0, 300)}`);
  }
  throw new Error("SubQ kept failing after 4 attempts");
}

const results: Record<string, unknown> = { model, decisions: {}, claims: null, inputTokens: 0 };
let tokens = 0;
for (const decision of decisions) {
  const state = stateFor(decision);
  const optionsMap = Object.fromEntries(decision.options.map((o) => [o.id, o.name]));
  const choices = Object.fromEntries(decision.criteria.map((c) => [c.id, { type: "choice", instructions: `Which single option is best on this criterion? ${c.question}`, criteria: optionsMap }]));
  const overall = { overall: { type: "choice", instructions: `Taking every criterion together, which single option should log build? ${decision.question}`, criteria: optionsMap } };
  if (dryRun) {
    console.log(`${decision.id}: state chars ${state.length}, ${decision.criteria.length + 1} choice questions, ${decision.options.length} score passes`);
    continue;
  }
  const out: Record<string, unknown> = { stateChars: state.length, choices: null, scores: {} };
  const answered = await decide(state, { ...choices, ...overall });
  out.choices = answered.answers;
  tokens += answered.usage?.input_tokens ?? 0;
  console.log(`${decision.id} choices done`);
  for (const option of decision.options) {
    const scoreQuestions = Object.fromEntries(decision.criteria.map((c) => [c.id, { type: "score", instructions: `Rate option ${option.id} (${option.name}) on this criterion only. ${c.question} Higher is better.`, criteria: c.levels }]));
    const scored = await decide(state, scoreQuestions);
    (out.scores as Record<string, unknown>)[option.id] = scored.answers;
    tokens += scored.usage?.input_tokens ?? 0;
    console.log(`${decision.id} scores ${option.id} done`);
  }
  (results.decisions as Record<string, unknown>)[decision.id] = out;
}
if (dryRun) process.exit(0);
const claimQuestions = Object.fromEntries(claims.map((c) => [c.id, { type: "noul", instructions: `Is this claim true on the evidence? ${c.statement}`, criteria: { true: "The evidence supports the claim", false: "The evidence contradicts the claim or does not contain it" } }]));
const answeredClaims = await decide(stateFor(decisions[0]), claimQuestions);
results.claims = answeredClaims.answers;
tokens += answeredClaims.usage?.input_tokens ?? 0;
results.inputTokens = tokens;
writeFileSync(join(here, process.argv.includes("--second") ? "subqResults2.json" : "subqResults.json"), JSON.stringify(results, null, 2));
console.log(`total input tokens ${tokens}`);
