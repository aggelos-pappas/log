import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const RESULT_CAP_BYTES = 40_000;

const HEAD_ROWS = 8;
const NESTED_ROWS = 3;
const STRING_CHARS = 280;
const QUIET_FLAGS = new Set(["account", "json", "confirmLive", "confirmBypass", "approvedBy", "waitMs", "live"]);

export function narrowingFlags(flags: readonly { name: string }[]): string[] {
  return flags.map((f) => f.name).filter((n) => !QUIET_FLAGS.has(n));
}

function sizeOf(value: unknown): number {
  try {
    return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value ?? ""), "utf8");
  } catch {
    return 0;
  }
}

function trimmed(value: unknown, depth: number): unknown {
  if (typeof value === "string") return value.length > STRING_CHARS ? `${value.slice(0, STRING_CHARS)}…` : value;
  if (Array.isArray(value)) {
    if (depth === 0) return value.map((v) => trimmed(v, depth + 1));
    const kept = value.slice(0, NESTED_ROWS).map((v) => trimmed(v, depth + 1));
    return value.length > NESTED_ROWS ? [...kept, `(${value.length - NESTED_ROWS} more left out)`] : kept;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) out[key] = trimmed(v, depth + 1);
    return out;
  }
  return value;
}

function headOf(json: unknown, rows: number): unknown {
  if (Array.isArray(json)) return { count: json.length, first: trimmed(json.slice(0, rows), 0) };
  if (!json || typeof json !== "object") return trimmed(json, 1);
  const head: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (Array.isArray(value)) head[key] = { count: value.length, first: trimmed(value.slice(0, rows), 0) };
    else head[key] = sizeOf(value) > 2_000 ? `(${sizeOf(value)} bytes left out)` : value;
  }
  return head;
}

export function jsonHead(json: unknown, rows: number = HEAD_ROWS, budget: number = Math.floor(RESULT_CAP_BYTES / 2)): unknown {
  for (let n = rows; n >= 1; n = Math.floor(n / 2)) {
    const head = headOf(json, n);
    if (sizeOf(head) <= budget) return head;
  }
  const smallest = headOf(json, 0);
  return sizeOf(smallest) <= budget ? smallest : `(${sizeOf(json)} bytes left out)`;
}

function textHead(text: string, budget: number): string {
  if (Buffer.byteLength(text, "utf8") <= budget) return text;
  const lines = text.split("\n");
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    const size = Buffer.byteLength(line, "utf8") + 1;
    if (used + size > budget) break;
    kept.push(line);
    used += size;
  }
  return `${kept.join("\n")}\n… ${lines.length - kept.length} more line(s) left out`;
}

export const BROWSERS_HEAD = "Browsers: ";

export function capLine(tool: string, bytes: number, flags: readonly string[]): string {
  const named = flags.length ? `${tool}'s flags: ${flags.map((f) => `--${f}`).join(", ")}` : `${tool}'s narrowing flags`;
  return `This answer was ${Math.round(bytes / 1000)} KB, over log's ${RESULT_CAP_BYTES / 1000} KB cap, so only its head and counts are here. Call it again narrowed with ${named}; never parse log output with a script.`;
}

export function capResult(tool: string, result: CallToolResult, flags: readonly string[], cap: number = RESULT_CAP_BYTES): CallToolResult {
  const texts = (result.content ?? []).filter((c): c is { type: "text"; text: string } => c.type === "text");
  const textBytes = texts.reduce((n, c) => n + Buffer.byteLength(c.text, "utf8"), 0);
  const structured = result.structuredContent as Record<string, unknown> | undefined;
  const bytes = textBytes + sizeOf(structured);
  if (bytes <= cap) return result;
  const note = capLine(tool, bytes, flags);
  const json = structured && "json" in structured ? jsonHead(structured.json, HEAD_ROWS, Math.floor(cap * 0.35)) : undefined;
  const headText = json !== undefined ? JSON.stringify(json, null, 1) : textHead(String(structured?.stdout ?? texts[0]?.text ?? ""), Math.floor(cap * 0.35));
  const firstText = texts[0]?.text ?? "";
  const lead = firstText.startsWith(BROWSERS_HEAD) ? firstText.slice(0, firstText.indexOf("\n\n") + 1 || 0) : "";
  const content = [{ type: "text" as const, text: textHead(lead ? `${lead}\n${headText}` : headText, Math.floor(cap * 0.4)) + `\n\n${note}` }, ...(result.content ?? []).filter((c) => c.type !== "text")];
  const shrunk = structured
    ? { ...structured, stdout: textHead(String(structured.stdout ?? ""), 2_000), ...(json !== undefined ? { json } : {}), log: [], progress: [] }
    : undefined;
  return { ...result, content, ...(shrunk ? { structuredContent: shrunk } : {}) };
}
