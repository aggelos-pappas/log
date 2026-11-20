import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { logHome } from "../logHome/index";

export function userEnvPath(env: Record<string, string | undefined> = process.env): string {
  return env.LOG_USER_ENV || join(logHome(), ".env");
}

export function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2].trim();
    const quoted = /^(["'])(.*)\1$/.exec(value);
    values[match[1]] = quoted ? quoted[2] : value;
  }
  return values;
}

export function loadUserEnv(env: Record<string, string | undefined> = process.env, path = userEnvPath(env)): string[] {
  if (!existsSync(path)) return [];
  const added: string[] = [];
  for (const [key, value] of Object.entries(parseEnvFile(readFileSync(path, "utf8")))) {
    if (env[key] !== undefined && env[key] !== "") continue;
    env[key] = value;
    added.push(key);
  }
  return added;
}
