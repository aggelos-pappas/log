import { homedir } from "node:os";
import { join } from "node:path";

export function logHome(env: Record<string, string | undefined> = process.env): string {
  return env.LOG_HOME?.trim() || join(homedir(), ".logCli");
}

export function extraEnvFiles(env: Record<string, string | undefined> = process.env): string[] {
  return (env.LOG_ENV_FILES ?? "").split(/[,;]/).map((f) => f.trim()).filter(Boolean);
}
