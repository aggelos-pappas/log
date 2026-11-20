export interface CallRow {
  tool: string;
  callId: string;
  startedAt: number;
  ms: number;
  ok: boolean;
  code: string | null;
}

export interface RegisteredTool {
  name: string;
  module: string;
}

export interface GuideFile {
  path: string;
  text: string;
  committedAt: number | null;
}

export interface SchemaChange {
  module: string;
  sha: string;
  at: number;
}

export interface ToolRow {
  tool: string;
  calls: number;
  failures: number;
  failureRate: number;
  topCode: string | null;
  p50: number;
  p95: number;
  lastUsed: string;
}

export interface UnusedFlag {
  tool: string;
  calls: 0;
  namedBy: string[];
  offered: null;
  fix: string;
}

export interface FailingFlag {
  tool: string;
  calls: number;
  failures: number;
  failureRate: number;
  codes: Record<string, number>;
  lastFailedCall: string;
  fix: string;
}

export interface StaleFlag {
  guide: string;
  tool: string;
  reason: "schemaChanged" | "toolMissing";
  evidence: string;
  fix: string;
}

export interface HealthInput {
  days: number;
  now: number;
  calls: CallRow[];
  registered: RegisteredTool[];
  guides: GuideFile[];
  schemaChanges: SchemaChange[] | null;
  toolPrefixes: string[];
  untracked: string[];
}

export interface HealthReport {
  days: number;
  since: string;
  tools: ToolRow[];
  unused: UnusedFlag[];
  failing: FailingFlag[];
  stale: StaleFlag[];
  notes: string[];
}
