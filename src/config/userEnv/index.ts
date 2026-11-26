import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { logHome } from "../logHome/index";
import { readSecret, sealVerified, secretStoreDeps, secretStoreReady, warnPlainOnce } from "../../storage/secrets/index";

export const SEALED_KEYS = "LOG_SEALED_KEYS";

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

export function isSecretEnvName(name: string): boolean {
  if (name.startsWith("LOG_STORE_") || name === SEALED_KEYS) return false;
  return /(?:API_KEY|_TOKEN|_SECRET|PASSWORD)$/.test(name);
}

export function sealedNamesOf(values: Record<string, string>): string[] {
  return (values[SEALED_KEYS] ?? "").split(",").map((name) => name.trim()).filter(Boolean);
}

export function envSecretRef(name: string): string {
  return `env:${name}`;
}

export function rewriteEnvFile(path: string, set: ReadonlyMap<string, string>, remove: ReadonlySet<string> = new Set()): void {
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  const lines = existing.split(/\r?\n/).filter((line) => {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    return !match || (!set.has(match[1]) && !remove.has(match[1]));
  });
  while (lines.at(-1) === "") lines.pop();
  for (const [name, value] of set) lines.push(`${name}="${value}"`);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const pending = `${path}.${process.pid}.pending`;
  writeFileSync(pending, `${lines.join("\n")}\n`, { mode: 0o600 });
  chmodSync(pending, 0o600);
  renameSync(pending, path);
}

export function plainEnvSecrets(values: Record<string, string>): string[] {
  return Object.keys(values).filter((name) => isSecretEnvName(name) && values[name]);
}

function sealPlainKeys(env: Record<string, string | undefined>, path: string, values: Record<string, string>): string[] {
  const plain = plainEnvSecrets(values);
  if (!plain.length) return sealedNamesOf(values);
  if (!secretStoreReady(env)) {
    warnPlainOnce(path, env);
    return sealedNamesOf(values);
  }
  const sealed = plain.filter((name) => sealVerified(envSecretRef(name), "apiKey", values[name], env));
  if (!sealed.length) return sealedNamesOf(values);
  const names = [...new Set([...sealedNamesOf(values), ...sealed])].sort();
  rewriteEnvFile(path, new Map([[SEALED_KEYS, names.join(",")]]), new Set(sealed));
  return names;
}

export function loadUserEnv(env: Record<string, string | undefined> = process.env, path = userEnvPath(env)): string[] {
  if (!existsSync(path)) return [];
  const values = parseEnvFile(readFileSync(path, "utf8"));
  const added: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (env[key] !== undefined && env[key] !== "") continue;
    env[key] = value;
    added.push(key);
  }
  let sealed: string[] = sealedNamesOf(values);
  try {
    sealed = sealPlainKeys(env, path, values);
  } catch {
    warnPlainOnce(path, env);
  }
  for (const name of sealed) {
    if (env[name] !== undefined && env[name] !== "") continue;
    try {
      const value = readSecret(envSecretRef(name), env);
      if (value === null) continue;
      env[name] = value;
      added.push(name);
    } catch (error) {
      secretStoreDeps.warn(`log: ${name} is sealed in log.db but could not be opened here (${(error as Error).message}); it is left unset.`);
    }
  }
  return added;
}
