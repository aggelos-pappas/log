import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const RESULT_CAP_BYTES = 40_000;

const HEAD_ROWS = 8;
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

export function jsonHead(json: unknown, rows: number = HEAD_ROWS): unknown {
  if (Array.isArray(json)) return { count: json.length, first: json.slice(0, rows) };
  if (!json || typeof json !== "object") return json;
  const head: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
    if (Array.isArray(value)) head[key] = { count: value.length, first: value.slice(0, rows) };
    else head[key] = sizeOf(value) > 2_000 ? `(${sizeOf(value)} bytes left out)` : value;
  }
  return head;
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

export function capLine(tool: string, bytes: number, flags: readonly string[]): string {
  const named = flags.length ? `${tool}'s flags: ${flags.map((f) => `--${f}`).join(", ")}` : `${tool}'s narrowing flags`;
  return `This answer was ${Math.round(bytes / 1000)} KB, over log's ${RESULT_CAP_BYTES / 1000} KB cap, so only its head and counts are here. Call it again narrowed with ${named}; never parse log output with a script.`;
}

export function capResult(tool: string, result: CallToolResult, flags: readonly string[], cap: number = RESULT_CAP_BYTES): CallToolResult {
  const texts = (result.content ?? []).filter((c): c is { type: "text"; text: string } => c.type === "text");
  const textBytes = texts.reduce((n, c) => n + Buffer.byteLength(c.text, "utf8"), 0);
  const structured = result.structuredContent as Record<string, unknown> | undefined;
  const bytes = Math.max(textBytes, sizeOf(structured));
  if (bytes <= cap) return result;
  const note = capLine(tool, bytes, flags);
  const json = structured && "json" in structured ? jsonHead(structured.json) : undefined;
  const headText = json !== undefined ? JSON.stringify(json, null, 1) : textHead(String(structured?.stdout ?? texts[0]?.text ?? ""), Math.floor(cap / 2));
  const firstText = texts[0]?.text ?? "";
  const lead = firstText.slice(0, firstText.indexOf("\n\n") + 1 || 0);
  const content = [{ type: "text" as const, text: textHead(`${lead}\n${headText}`, Math.floor(cap * 0.8)) + `\n\n${note}` }, ...(result.content ?? []).filter((c) => c.type !== "text")];
  const shrunk = structured
    ? { ...structured, stdout: textHead(String(structured.stdout ?? ""), 2_000), ...(json !== undefined ? { json } : {}), log: (structured.log as unknown[] | undefined)?.slice(-5) ?? [], progress: (structured.progress as unknown[] | undefined)?.slice(-5) ?? [] }
    : undefined;
  return { ...result, content, ...(shrunk ? { structuredContent: shrunk } : {}) };
}
