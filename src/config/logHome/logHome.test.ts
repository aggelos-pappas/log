import { describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { extraEnvFiles, logHome } from "./index";

describe("one home for everything log keeps", () => {
  test("LOG_HOME moves it, and without it log keeps to ~/.logCli", () => {
    expect(logHome({ LOG_HOME: "/data/ada" })).toBe("/data/ada");
    expect(logHome({ LOG_HOME: "  " })).toBe(join(homedir(), ".logCli"));
    expect(logHome({})).toBe(join(homedir(), ".logCli"));
  });

  test("LOG_ENV_FILES names more key files, split on commas or semicolons", () => {
    expect(extraEnvFiles({ LOG_ENV_FILES: "/a/.env.local, /b/.env;/c/.env" })).toEqual(["/a/.env.local", "/b/.env", "/c/.env"]);
    expect(extraEnvFiles({})).toEqual([]);
  });
});
