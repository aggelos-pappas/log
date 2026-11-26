import { spawnSync } from "node:child_process";

export function buildBrowserCommand(url: string, platform: string): { command: string; args: string[] } {
  if (platform === "win32") {
    const encoded = Buffer.from(`Start-Process '${url}'`, "utf16le").toString("base64");
    return { command: "powershell", args: ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded] };
  }
  if (platform === "darwin") return { command: "open", args: [url] };
  return { command: "xdg-open", args: [url] };
}

export function openBrowser(url: string): boolean {
  if (url.includes("'")) return false;
  const { command, args } = buildBrowserCommand(url, process.platform);
  return !spawnSync(command, args, { stdio: "ignore", timeout: 15_000, windowsHide: true }).error;
}
