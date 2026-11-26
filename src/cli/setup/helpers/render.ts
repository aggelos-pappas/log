import type { SetupStep } from "./plan.ts";

export interface SetupReport {
  ok: boolean;
  reason: string | null;
  envFile: string;
  completed: readonly SetupStep[];
  pending: readonly SetupStep[];
  next: readonly string[];
  dryRun: boolean;
}

export function renderSetupReport(report: SetupReport, json: boolean): string {
  if (json) return JSON.stringify(report, null, 2);
  const lines = [
    `log setup: ${report.ok ? "ready" : "waiting on a person"}${report.dryRun ? " (dry run)" : ""}`,
    `Settings: ${report.envFile}`,
    "",
    "Done by the agent:",
  ];
  if (!report.completed.length) lines.push("  none");
  for (const step of report.completed) lines.push(`  ✓ ${step.label}: ${step.detail}`);
  lines.push("", "Needs you:");
  if (!report.pending.length) lines.push("  nothing — log is ready");
  for (const step of report.pending) {
    lines.push(`  · ${step.label}: ${step.detail.replace(/\n/g, "\n    ")}`);
    if (step.command) lines.push(`    Run: ${step.command}`);
    if (step.url) lines.push(`    Sign up: ${step.url}`);
    if (step.keyName) lines.push(`    Key: ${step.keyName}`);
  }
  if (report.next.length) lines.push("", "Next, in order:", ...report.next.map((command) => `  ${command}`));
  return lines.join("\n");
}
