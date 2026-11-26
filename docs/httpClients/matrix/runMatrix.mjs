import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const url = "https://api.subq.ai/v1/systemone";
const dryRun = process.argv.includes("--dry-run");
const key = process.env.SUBQ_API_KEY;
if (!key && !dryRun) throw new Error("SUBQ_API_KEY is not set");

const options = JSON.parse(readFileSync(join(here, "options.json"), "utf8"));
const criteria = JSON.parse(readFileSync(join(here, "criteria.json"), "utf8"));
const claims = JSON.parse(readFileSync(join(here, "claims.json"), "utf8"));
if (criteria.length > 16) throw new Error(`criteria: ${criteria.length}, Decisions API allows 16`);
if (claims.length > 16) throw new Error(`claims: ${claims.length}, Decisions API allows 16`);

const read = (rel) => readFileSync(join(root, rel), "utf8");
const evidence = [
  ["docs/httpClients/evidence.md", read("docs/httpClients/evidence.md")],
];

const situation = `SITUATION
log-cli talks to Facebook, X, Instagram, Slack, LinkedIn and Discord through vendored Python clients that use curl_cffi
(sync, asyncio and WebSocket), and to Reddit through wreq-js. Accounts sign in through Camoufox (Firefox 156).
Each client hard-codes its own impersonation target and user agent today. The owner wants one unified browser identity,
set once in environment variables, used by every client and by any new platform, so every account is consistent.
The question is which HTTP client stack to standardise on: curl_cffi, httpcloak, both behind a switch, or wreq/rnet.
Judge only from the evidence below: log's code inventory, a live fingerprint test against real Chrome on this machine,
each library's docs, and what Scraping Enthusiasts members said. Do not invent features a doc does not show.

OPTIONS
${options.map((o) => `- ${o.id}: ${o.name}. ${o.description}`).join("\n")}

CRITERIA
${criteria.map((c) => `- ${c.id}: ${c.question}`).join("\n")}

CLAIMS
${claims.map((c) => `- ${c.id}: ${c.statement}`).join("\n")}

EVIDENCE`;

const state = [situation, ...evidence.map(([name, body]) => `\n===== FILE: ${name} =====\n${body}`)].join("\n");

async function decide(questions) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "subq-snap-preview", state, questions }),
    });
    if (response.ok) return response.json();
    const body = await response.text();
    if (response.status === 429 || response.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${response.status} ${body.slice(0, 500)}`);
  }
  throw new Error("SubQ kept failing after 5 attempts");
}

const choiceQuestions = Object.fromEntries(
  criteria.map((c) => [
    c.id,
    {
      type: "choice",
      instructions: `Which single option is best on this criterion? ${c.question}`,
      criteria: Object.fromEntries(options.map((o) => [o.id, o.name])),
    },
  ]),
);

const scoreQuestions = (option) =>
  Object.fromEntries(
    criteria.map((c) => [
      c.id,
      {
        type: "score",
        instructions: `Rate option ${option.id} (${option.name}) on this criterion only. ${c.question} Higher is better.`,
        criteria: c.levels,
      },
    ]),
  );

const claimQuestions = Object.fromEntries(
  claims.map((c) => [
    c.id,
    {
      type: "noul",
      instructions: `Is this claim true on the evidence? ${c.statement}`,
      criteria: { true: "The evidence supports the claim", false: "The evidence contradicts the claim or does not contain it" },
    },
  ]),
);

if (dryRun) {
  console.log(`state chars ${state.length}`);
  console.log(`choice questions ${Object.keys(choiceQuestions).length}`);
  console.log(`score passes ${options.length}`);
  console.log(`claims ${Object.keys(claimQuestions).length}`);
  process.exit(0);
}

const results = {
  model: "subq-snap-preview",
  endpoint: url,
  stateChars: state.length,
  passA: [],
  passB: {},
  passC: [],
  inputTokens: 0,
};

for (let i = 0; i < 2; i++) {
  const answered = await decide(choiceQuestions);
  results.inputTokens += answered.usage.input_tokens;
  results.passA.push(answered.answers);
  console.log(`pass A ${i + 1}/2, ${answered.usage.input_tokens} input tokens`);
}

for (const option of options) {
  const answered = await decide(scoreQuestions(option));
  results.inputTokens += answered.usage.input_tokens;
  results.passB[option.id] = answered.answers;
  console.log(`pass B ${option.id}, ${answered.usage.input_tokens} input tokens`);
}

for (let i = 0; i < 2; i++) {
  const answered = await decide(claimQuestions);
  results.inputTokens += answered.usage.input_tokens;
  results.passC.push(answered.answers);
  console.log(`pass C ${i + 1}/2, ${answered.usage.input_tokens} input tokens`);
}

writeFileSync(join(here, "subqResults.json"), JSON.stringify(results, null, 2));
console.log(`total input tokens: ${results.inputTokens}`);
