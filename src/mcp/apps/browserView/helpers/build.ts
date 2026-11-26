import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { BROWSER_BRANDS } from "../../../../browser/driver/brands.ts";
import { FRAME_STYLE_ID } from "../widget/viewStyle.ts";
import { widgetStyle } from "./style.ts";

export const WIDGET_ENTRY = fileURLToPath(new URL("../widget/main.ts", import.meta.url));
const FONT_DIR = new URL("../../../../../site/apps/web/public/fonts/satoshi-webfont/", import.meta.url);
const FONTS = [
  { file: "Satoshi-Medium.woff", weight: 500 },
  { file: "Satoshi-Bold.woff", weight: 700 },
];

let built: Promise<string> | null = null;

export function fontFaces(): string {
  return FONTS.map(({ file, weight }) => {
    const path = fileURLToPath(new URL(file, FONT_DIR));
    if (!existsSync(path)) return "";
    return `@font-face{font-family:"Satoshi";font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/woff;base64,${readFileSync(path).toString("base64")}) format("woff")}`;
  }).join("");
}

export async function buildWidgetScript(): Promise<string> {
  const output = await Bun.build({ entrypoints: [WIDGET_ENTRY], target: "browser", format: "esm", minify: true });
  if (!output.success || !output.outputs[0]) throw new Error(`browserViewBuildFailed: ${output.logs.map((log) => log.message).join("; ")}`);
  return output.outputs[0].text();
}

const LOGO_DIR = new URL("../../../../../site/apps/web/public/", import.meta.url);

export function browserLogos(): Record<string, string> {
  const logos: Record<string, string> = {};
  for (const [name, brand] of Object.entries(BROWSER_BRANDS)) {
    if (!brand.logo) continue;
    const path = fileURLToPath(new URL(`.${brand.logo}`, LOGO_DIR));
    if (!existsSync(path)) continue;
    const type = path.endsWith(".svg") ? "image/svg+xml" : "image/png";
    logos[name] = `data:${type};base64,${readFileSync(path).toString("base64")}`;
  }
  return logos;
}

export function widgetPage(script: string): string {
  const safe = script.replace(/<\/script/gi, "<\\/script");
  const logos = JSON.stringify(browserLogos()).replace(/</g, "\\u003c");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Live browser</title><style id="${FRAME_STYLE_ID}">${fontFaces()}${widgetStyle}</style></head><body><main id="app"></main><script type="application/json" id="browserLogos">${logos}</script><script type="module">${safe}</script></body></html>`;
}

export function widgetHtml(): Promise<string> {
  built ??= buildWidgetScript().then(widgetPage).catch((error: unknown) => {
    built = null;
    throw error;
  });
  return built;
}
