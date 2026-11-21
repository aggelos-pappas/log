import { describe, expect, test } from "bun:test";
import { buildGraph, deadEndsOf, depthsOf, orphansOf, resolveTarget, targetsOf } from "./checkDocLinks.ts";

const pages: Record<string, string> = {
  "README.md": "Start with [install](docs/install.md) and [use cases](docs/useCases).",
  "docs/install.md": "Then [accounts](accounts.md#add). Up: [README](../README.md).",
  "docs/accounts.md": "Back to [install](./install.md) or [gone](missing.md).",
  "docs/useCases/README.md": "Nothing links out from here except [outside](https://example.com).",
  "docs/lonely.md": "See [install](https://github.com/matthewdonsemail-lab/log/blob/main/docs/install.md).",
};
const files = new Set([...Object.keys(pages), "docs/useCases"]);
const graph = buildGraph(Object.keys(pages), (p) => pages[p], (p) => files.has(p));

describe("doc links (#255)", () => {
  test("links are read from prose, not from code", () => {
    expect(targetsOf("see [a](a.md) and `[b](b.md)`\n```\n[c](c.md)\n```\n[d]: d.md\n<a href=\"e.md\">e</a>")).toEqual(["a.md", "d.md", "e.md"]);
  });
  test("relative, folder and repo urls resolve to repo paths; other urls and anchors do not", () => {
    expect(resolveTarget("docs/install.md", "../README.md#top")).toBe("README.md");
    expect(resolveTarget("docs/a/b.md", "https://github.com/matthewdonsemail-lab/log/blob/main/docs/x.md")).toBe("docs/x.md");
    expect(resolveTarget("docs/a.md", "https://example.com/x.md")).toBeNull();
    expect(resolveTarget("docs/a.md", "#section")).toBeNull();
  });
  test("a link to a page that is not there is broken", () => {
    expect(graph.broken).toEqual([{ from: "docs/accounts.md", target: "missing.md" }]);
  });
  test("a folder link reaches its README", () => {
    expect(graph.links["README.md"]).toContain("docs/useCases/README.md");
  });
  test("orphans have no inbound doc link, dead ends no outbound one", () => {
    expect(orphansOf(graph)).toEqual(["docs/lonely.md"]);
    expect(deadEndsOf(graph)).toEqual(["docs/useCases/README.md"]);
  });
  test("click depth is counted from the README", () => {
    expect(depthsOf(graph)).toEqual({ "README.md": 0, "docs/install.md": 1, "docs/useCases/README.md": 1, "docs/accounts.md": 2 });
  });
});
