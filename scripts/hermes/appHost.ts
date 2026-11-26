#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { settleLocation } from "../../src/mcp/apps/browserView/index.ts";
import { answerAppRequest, warmApps } from "../../src/mcp/apps/logApp/index.ts";
import type { LogAppRequest } from "../../src/mcp/apps/logApp/index.ts";
import { codeStampWatcher } from "../../src/mcp/freshness/index.ts";
import { parseEnvText } from "../../src/mcp/server/helpers/index.ts";

const root = join(import.meta.dir, "..", "..");
const CODE_CHECK_MS = 5000;
const write = (line: unknown) => process.stdout.write(`${JSON.stringify(line)}\n`);

process.chdir(root);
const envPath = join(root, ".env.local");
if (existsSync(envPath)) for (const [key, value] of Object.entries(parseEnvText(readFileSync(envPath, "utf8")))) process.env[key] ??= value;
console.log = console.error;
settleLocation("local");

let inFlight = 0;
const code = codeStampWatcher(root);
setInterval(() => {
  if (inFlight === 0 && code.refresh()) process.exit(0);
}, CODE_CHECK_MS);

const lines = createInterface({ input: process.stdin });
lines.on("line", (line) => {
  let request: (LogAppRequest & { id?: unknown }) | null = null;
  try {
    request = JSON.parse(line) as LogAppRequest & { id?: unknown };
  } catch {
    return;
  }
  const id = request.id;
  inFlight++;
  void answerAppRequest(request)
    .then((answer) => write({ id, ...answer }))
    .catch((error: unknown) => write({ id, ok: false, error: "logAppUnknown", message: String(error) }))
    .finally(() => {
      inFlight--;
      if (closed && inFlight === 0) process.exit(0);
    });
});
let closed = false;
lines.on("close", () => {
  closed = true;
  if (inFlight === 0) process.exit(0);
});
write({ id: null, ok: true, ready: true });
void warmApps().catch(() => null);
