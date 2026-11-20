import { listUseCases } from "../../mcp/server/helpers/guides.ts";
import { localEmbedder } from "../../search/conversations/helpers/embed.ts";
import { EMBED_DIMENSIONS, EMBED_MODEL } from "../../search/conversations/types.ts";
import { buildMeaningIndex, routerCatalog, routerIndexState } from "../../useCases/router/index.ts";
import type { RouterIndexState } from "../../useCases/router/index.ts";
import { JSON_FLAG, parseArgs, parserSpecOf, refuseInput } from "../runner/helpers/index.ts";
import type { Command, CommandInput } from "../runner/types.ts";

export const ROUTER_USAGE = "Usage: log router index [--apply] [--json]   (is the prompt router's meaning index current; --apply builds it)";

export const ROUTER_INPUT: CommandInput = {
  forms: [
    {
      words: ["index"],
      summary: "Is the prompt router's meaning index of plays, tools and skills current; apply builds it",
      positionals: [],
      flags: [{ name: "apply", kind: "boolean", description: "Build it if stale" }, JSON_FLAG],
    },
  ],
};

const stateLine = (state: RouterIndexState): string => {
  const what = `${state.counts.play} plays, ${state.counts.tool} tools and ${state.counts.skill} skills (${state.texts} texts)`;
  if (state.fresh) return `The router's meaning index is current: ${what}, built ${state.builtAt} with ${EMBED_MODEL}.`;
  return `The router's meaning index is ${state.built ? "behind the catalog" : "not built"} (routerIndexStale): ${what}. The prompt hook ranks by words only until it is built, by the context service on its next start or by log router index --apply.`;
};

export const routerCommand: Command = {
  usage: ROUTER_USAGE,
  platform: "any",
  name: "router",
  effect: "read",
  input: ROUTER_INPUT,
  summary: "The prompt router's meaning index",
  args: "index [--apply] [--json]",
  async run(_context, argv) {
    const parsed = parseArgs(argv, parserSpecOf(ROUTER_INPUT));
    if (!parsed.ok) return refuseInput("router", parsed.error, ROUTER_USAGE);
    const [sub = "index", ...rest] = parsed.positionals;
    if (sub !== "index" || rest.length) return { code: 1, error: "inputInvalid", stderr: `log router: unexpected argument "${sub !== "index" ? sub : rest[0]}"\n${ROUTER_USAGE}` };
    const items = routerCatalog(listUseCases());
    let state = routerIndexState(items, EMBED_MODEL);
    let rebuilt = false;
    if (parsed.flags["apply"] && !state.fresh) {
      const embedder = localEmbedder();
      try {
        await buildMeaningIndex(items, embedder);
      } finally {
        embedder.stop?.();
      }
      state = routerIndexState(items, EMBED_MODEL);
      rebuilt = true;
    }
    if (parsed.flags["json"]) return { code: 0, stdout: JSON.stringify({ ...state, model: EMBED_MODEL, dimensions: EMBED_DIMENSIONS, rebuilt }, null, 2) };
    return { code: 0, stdout: `${rebuilt ? "Built. " : ""}${stateLine(state)}` };
  },
};
