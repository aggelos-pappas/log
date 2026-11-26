import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export const LOG_APP_DIRECTIVE = "logapp";
export const LOG_APP_URI_PREFIX = "ui://log/";
export const LOG_APP_TOOL = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
export const LOG_APP_VIEW_ID = /^[0-9a-f]{8}$/;
export const LOG_APP_ARGS_LIMIT = 4096;
export const LOG_APP_CLIENT = "logAppHost";
export const LOG_APP_REFUSALS = ["logAppInvalid", "logAppUnknown", "logAppToolRefused", "logAppViewMissing"] as const;
export type LogAppRefusal = (typeof LOG_APP_REFUSALS)[number];

export interface LogAppCsp {
  connectDomains: string[];
  resourceDomains: string[];
}

export interface LogAppTool {
  name: string;
  annotations?: { readOnlyHint?: boolean };
  _meta?: Record<string, unknown>;
}

export interface LogAppResource {
  tool: string;
  uri: string;
  html: string;
  csp: LogAppCsp;
}

export interface LogAppStoredView {
  title?: unknown;
  subtitle?: unknown;
  compiled?: unknown;
  data?: unknown;
  text?: unknown;
}

export interface LogAppDeps {
  tools: () => Promise<LogAppTool[]>;
  read: (uri: string) => Promise<{ contents?: { uri?: string; text?: string; _meta?: Record<string, unknown> }[] } | null>;
  call: (name: string, args: Record<string, unknown>) => Promise<CallToolResult>;
  view: (id: string) => LogAppStoredView | null;
}

export type LogAppRequest =
  | { op: "resource"; tool: string }
  | { op: "result"; tool: string; args?: Record<string, unknown>; view?: string }
  | { op: "call"; tool: string; name: string; arguments?: Record<string, unknown> };

export type LogAppAnswer = { ok: true; resource: LogAppResource } | { ok: true; result: CallToolResult } | { ok: false; error: LogAppRefusal; message: string };
