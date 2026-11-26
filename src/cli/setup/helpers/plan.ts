import { SETUP_EXTENSIONS, setEnvValue, signInRouteOf, browserSignInSteps } from "../../launch/helpers/index.ts";
import { PLATFORM_LABELS } from "../../runner/helpers/platforms.ts";
import type { Platform } from "../../runner/helpers/platforms.ts";
import type { ExtensionId } from "../../launch/helpers/index.ts";

export type SetupStepKind = "agent" | "human";

export interface SetupStep {
  id: string;
  kind: SetupStepKind;
  label: string;
  detail: string;
  done: boolean;
  command?: string;
  url?: string;
  keyName?: string;
}

export interface SetupEnvResult {
  step: SetupStep;
  text: string;
  changed: boolean;
}

export function setupEnvStep(envFile: string, text: string, dryRun: boolean): SetupEnvResult {
  const done = /^\s*(?:export\s+)?LOG_ACCOUNTS\s*=/m.test(text);
  const changed = !done && !dryRun;
  const next = done ? text : setEnvValue(text, "LOG_ACCOUNTS", "local");
  return {
    step: {
      id: "env",
      kind: "agent",
      label: "Local accounts",
      detail: done ? `LOG_ACCOUNTS is already set in ${envFile}` : changed ? `Wrote LOG_ACCOUNTS=local to ${envFile}` : `Would write LOG_ACCOUNTS=local to ${envFile}`,
      done: done || changed,
    },
    text: next,
    changed,
  };
}

export function setupPlatformStep(platform: Platform): SetupStep {
  const label = PLATFORM_LABELS[platform];
  const route = signInRouteOf(platform);
  if (route.kind === "cookies") {
    return {
      id: `platform:${platform}`,
      kind: "human",
      label,
      detail: route.hint,
      done: false,
      command: `log ${platform} cookies save --account <name>`,
    };
  }
  if (route.kind === "connect") {
    return {
      id: `platform:${platform}`,
      kind: "human",
      label,
      detail: "Connect through the account's browser and its proxy.",
      done: false,
      command: `log ${platform} connect --account <name>`,
    };
  }
  return {
    id: `platform:${platform}`,
    kind: "human",
    label,
    detail: browserSignInSteps(platform, "<name>"),
    done: false,
    command: `log localAccount add --platform ${platform} --account <name>`,
  };
}

export function setupExtensionStep(id: ExtensionId): SetupStep {
  const extension = SETUP_EXTENSIONS.find((candidate) => candidate.id === id);
  if (!extension) throw new Error(`unknown extension ${id}`);
  if (extension.access.kind === "signIn") {
    return {
      id: `extension:${id}`,
      kind: "human",
      label: extension.label,
      detail: extension.adds,
      done: false,
      url: extension.signUpUrl,
      command: `${extension.access.command} ${extension.access.args.join(" ")}`,
    };
  }
  return {
    id: `extension:${id}`,
    kind: "human",
    label: extension.label,
    detail: `${extension.adds}. Add ${extension.access.keyName} to your settings file.`,
    done: false,
    url: extension.access.keyUrl,
    keyName: extension.access.keyName,
  };
}

export function setupHarnessStep(id: string, label: string, configPath: string, changed: boolean): SetupStep {
  return {
    id: `harness:${id}`,
    kind: "agent",
    label,
    detail: changed ? `Wired in ${configPath}` : `Already wired in ${configPath}`,
    done: true,
  };
}
