const TAGS = new Set([
  "div", "span", "p", "h1", "h2", "h3", "h4", "strong", "b", "em", "i", "small", "time", "a", "button", "section", "header", "footer",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col", "ul", "ol", "li", "blockquote", "code", "pre", "br", "hr", "img",
  "label", "svg", "g", "path", "line", "rect", "circle", "ellipse", "polyline", "polygon", "text", "tspan", "title",
]);

const ATTRS = new Set([
  "class", "style", "role", "title", "datetime", "alt", "src", "colspan", "rowspan", "disabled", "type", "dataask", "tabindex",
  "xmlns", "viewbox", "preserveaspectratio", "focusable", "d", "fill", "fillopacity", "fillrule", "cliprule", "stroke", "strokewidth",
  "strokelinecap", "strokelinejoin", "strokedasharray", "strokeopacity", "vectoreffect", "opacity", "transform", "x", "y", "x1", "x2",
  "y1", "y2", "cx", "cy", "r", "rx", "ry", "dx", "dy", "width", "height", "points", "textanchor",
  "dominantbaseline", "fontsize", "fontweight",
]);

const UNSAFE_STYLE = /url\s*\(|expression\s*\(|@import|javascript:/i;
const IMAGE_SOURCE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i;

const plain = (name: string) => name.toLowerCase().replace(/[-_:]/g, "");

function keeps(tag: string, name: string, value: string): boolean {
  const key = plain(name);
  if (key.startsWith("aria")) return true;
  if (!ATTRS.has(key)) return false;
  if (key === "style") return !UNSAFE_STYLE.test(value);
  if (key === "src") return tag === "img" && IMAGE_SOURCE.test(value.trim());
  if (key === "fill" || key === "stroke") return !UNSAFE_STYLE.test(value);
  return true;
}

export function cleanView(root: Element): Element {
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const tag = el.tagName.toLowerCase();
    if (!TAGS.has(tag)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) if (!keeps(tag, attr.name, attr.value)) el.removeAttribute(attr.name);
    if (tag === "button") el.setAttribute("type", "button");
  }
  return root;
}

export function cleanViewHtml(html: string, parser: DOMParser = new DOMParser()): string {
  const doc = parser.parseFromString(`<!doctype html><body><div>${html}</div></body>`, "text/html");
  const root = doc.body.firstElementChild;
  return root ? cleanView(root).innerHTML : "";
}
