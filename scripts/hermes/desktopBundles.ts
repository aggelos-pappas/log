import { join } from "node:path";
import type { BunPlugin } from "bun";
import { hermesKitCss } from "../../src/mcp/apps/report/view/server.tsx";

const root = join(import.meta.dir, "..", "..");
const HOST_MODULES = ["react", "react/jsx-runtime", "@hermes/plugin-sdk"];

export const DESKTOP_BUNDLES = [
  { entry: "src/mcp/apps/report/view/hermesDesktop.tsx", out: "hermesPlugin/desktop/plugin.js" },
  { entry: "vendor/hermesGenui/web/src/plugin.tsx", out: "vendor/hermesGenui/desktop/plugin.js" },
] as const;

function textModule(name: string, text: string): BunPlugin {
  return {
    name,
    setup(build) {
      build.onResolve({ filter: new RegExp(`^${name}$`) }, () => ({ path: name, namespace: name }));
      build.onLoad({ filter: /.*/, namespace: name }, () => ({ contents: `export default ${JSON.stringify(text)};`, loader: "js" }));
    },
  };
}

export async function desktopBundle(entry: string): Promise<string> {
  const output = await Bun.build({
    entrypoints: [join(root, entry)],
    target: "browser",
    format: "esm",
    minify: true,
    external: HOST_MODULES,
    loader: { ".css": "text" },
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [textModule("logViewCss", hermesKitCss())],
  });
  if (!output.success || !output.outputs[0]) throw new Error(`hermesDesktopBuildFailed: ${entry}: ${output.logs.map((log) => log.message).join("; ")}`);
  const text = await output.outputs[0].text();
  const outside = [...text.matchAll(/from\s*"([^"]+)"/g)].map((m) => m[1]).filter((name) => !HOST_MODULES.includes(name));
  if (outside.length) throw new Error(`hermesDesktopBuildFailed: ${entry} imports ${outside.join(", ")}, which Hermes Desktop doesn't provide`);
  return text;
}
