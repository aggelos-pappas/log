# Stately visualizer — REA evidence (editor.stately.ai/viz)

Related: [Research: the Relate state machine view](research.md) · [the earlier notes](stately.md) · [Research and decisions](../README.md)

Written 2026-11-22. Target: the public, login-free visualizer `https://editor.stately.ai/viz` (`@statelyai/editor` 0.55.19, deploy `viz-44901969068-1`). No account, no sign-in, no network recording: per the owner's correction the HAR step was dropped and the HAR that was briefly written was deleted. Everything below comes from **static** REA 6.10.1 analysis of the JavaScript bundles. No Stately code was copied into log; only facts, numbers and library names.

## How the evidence was produced

- REA was updated to **rea-agents 6.10.1** (`npm i -g rea-agents@latest`). It refuses Node 24.18.1, so every command ran under the bundled Node 26.12.1 (`~/bin/rea26` → `<tools>/node-26.12.1-win32-x64/node.exe …/rea-agents/scripts/rea.mjs`).
- `rea analyze-web-bundle` ran against a throwaway local Chrome (loopback CDP :9337, fresh profile, no login) on the viz page. It's a static bundle analysis of the scripts the page parsed. Evidence: `rea/webbundle.evidence.json` (`ev_e60aaa31…`). It saw 85 scripts: 75 are **byte-identical (sha256)** to the saved `js/*.js`, and 10 are inline. Fingerprints: Next.js (high confidence), React (medium). It found 6 route candidates, 67 low-confidence endpoint candidates, and no WebMCP tools. So the saved bundles are the live build.
- `rea analyze-javascript-application` read the saved `js/` directory as the application:
  - The full run (`rea/app.evidence.json`, 200 MB) hit the 300 s per-source deadline at file 68/76 and the 100k semantic-node cap. Its semantic coverage is the first 11 files only.
  - The targeted runs used `--source-path` and raised budgets:
    - `rea/viz.evidence.json` (`ev_28136155…`, 690 MB, `2jcmqco8wkwjd.js`, 400k semantic nodes; needed `NODE_OPTIONS=--max-old-space-size=16384` to pass the 512 MB transfer ceiling)
    - `rea/flow.evidence.json` (`ev_02ac1c0d…`: `2_1o-xvii-r5o.js`, `3186p7sycrje2.js`, `1n-x33n1t71nb.js`)
    - `rea/f_2-eybig0s36bz.evidence.json` (`ev_fd165ebb…`, the flow engine)
    - `rea/f_3ipc7qgmu07wn.evidence.json` (`ev_05010596…`)
    - `rea/theme.evidence.json` (`ev_9d04958c…`: `2c_-zpm4z-m4f.js`, `2z0aixa72nhem.js`, `2we_h-txzz_88.js`)
- **How to read a pointer.** Each fact gives the file and the absolute character offset of the quoted literal. It also names the REA Evidence file and ID, plus the innermost REA semantic `function` node (`jsrg_node_…`) whose source range contains that offset. The function's name is given when REA recovered one. Bundles are Turbopack chunks, and REA reports `module_format: unknown` / `export_names: []` for them, so the citations name function nodes and Turbopack module ids, not exports. The full machine-readable list is in `facts.json`.
- `rea trace-application-feature` with string seeds finds the semantic call-sites for a literal:
  - `prefers-color-scheme: dark` → 2 call-sites, `rea/trace_theme.json`.
  - `edge-label-grouped` → 2 call-sites, `rea/trace_viz_test.json`.
  - Each trace over the 690 MB viz bundle took about 3.5 min, so the remaining facts were located by reading the same Evidence's semantic nodes offline.
- `rea compare-javascript-export-shapes` doesn't apply here. It needs two distinct Evidence versions (`right: JavaScript export shape Evidence must be distinct`), and REA records no ESM exports for these Turbopack chunks. Only one build is public. Output: `rea/compare_exports.json`.
- **Limits.**
  - **CSS can't be read by REA.** `rea inspect-artifact js/01eer82cd_rgi.css` returns `target_unavailable: unsupported binary format`, and the JS application inventory skips `.css`. The theme hex values in section 3 and `theme.json` are therefore read from the CSS at the given byte offsets, and they're labelled as such. The JS that consumes each variable is REA-located.
  - **No source recovery.** `recover-javascript-sources` needs Wakaru on Linux x64, which isn't available here.
  - **Semantic coverage is partial.** REA's alias-selection budget was 512, so a few deep functions only resolve to their enclosing module factory.

**Corrections to the earlier `stately.md` (which had been grep-based):**

- `UNSELECTED_OPACITY` is **0.7**, not 0.5.
- The edge hit path is **20px** wide, not 16px.
- Orthogonal edges have **rounded corners**: `EDGE_PATH_RADIUS = 10`, so the paths aren't square `M/L` only.
- **Guarded transitions are dashed** `5,5`.
- The initial-state marker is **20px** with a 4px gap.
- The viz app's settings schema defaults `colorMode` to `dark`, but the flow engine defaults to `system`.

## 1. State node rendering

- State node base class: `relative border-(length:--viz-entity-border) rounded-(--viz-entity-radius) text-foreground overflow-hidden outline-none` (border width/radius come from CSS vars).
  - Evidence: `2_1o-xvii-r5o.js` @1579 (line 1 col 1579) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_f88b430c259ca63e…` [1202–2702]; innermost `expression` node `jsrg_node_3708b574c254511d…`
- Header padding class `px-(--viz-entity-inset) py-(--viz-entity-header-y)`; header layout `flex items-center justify-start gap-2 whitespace-nowrap`; compact header padding `px-2.5 py-1.5` (STATE_NODE_HEADER_COMPACT_PADDING_CLASS).
  - Evidence: `2_1o-xvii-r5o.js` @1732 (line 1 col 1732) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_f88b430c259ca63e…` [1202–2702]; innermost `expression` node `jsrg_node_3708b574c254511d…`
- Body/header background = `var(--entity-fill)` (getStateNodeBackground / getStateNodeBodyStyle / getStateNodeHeaderStyle); children area = `color-mix(in oklab, var(--entity-fill) 30%, transparent)` (getStateNodeChildrenStyle).
  - Evidence: `2_1o-xvii-r5o.js` @1853 (line 1 col 1853) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_f88b430c259ca63e…` [1202–2702]; innermost `expression` node `jsrg_node_3708b574c254511d…`
- Border colour = `color-mix(in srgb, var(--entity-border) calc(var(--node-content-opacity,1)*100%), transparent)` (getStateNodeBorderStyle).
  - Evidence: `2_1o-xvii-r5o.js` @1919 (line 1 col 1919) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_f88b430c259ca63e…` [1202–2702]; innermost `expression` node `jsrg_node_3708b574c254511d…`
- getStateNodeClasses: `border-dashed` when isDashed; selected adds `outline-2 outline-solid outline-(--viz-selection-color)`; connection target adds `outline-2 outline-(--viz-highlight-color)`.
  - Evidence: `2_1o-xvii-r5o.js` @2241 (line 1 col 2241) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_f88b430c259ca63e…` [1202–2702]; innermost `expression` node `jsrg_node_3708b574c254511d…`
- entityColorAttribute(color) returns the colour name or "gray" (drives `data-color` attribute -> CSS entity tokens).
  - Evidence: `2_1o-xvii-r5o.js` @1769 (line 1 col 1769) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_f88b430c259ca63e…` [1202–2702]; innermost `expression` node `jsrg_node_3708b574c254511d…`
- Typography classes: title `text-entity-title` (compact `text-entity-title-compact`), body `text-entity-body`, section heading `text-entity-section text-(--entity-ink-soft)`.
  - Evidence: `2_1o-xvii-r5o.js` @38560 (line 1 col 38560) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_38409fab50d1d182…` [38069–38678]; innermost `expression` node `jsrg_node_c62bc1f9028ece9c…`
- State node DOM: outer `div[data-entity=node]` (w-max, aria-current when active) -> optional InitialEdgeViz marker -> `div[data-state-node-surface]` with `data-color` and getStateNodeClasses; parallel-region children are dashed (isDashed).
  - Evidence: `2jcmqco8wkwjd.js` @1402527 (line 103 col 48761) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_e384a7467038f135…` [1389956–1413597]; innermost `call-site` node `jsrg_node_182f9dac6c590e44…`
- Initial-state marker: size 20, gap 4 px, placed `left` (or `top` when it would collide) outside the node (getNodeInitialStateMarkerPlacement).
  - Evidence: `2jcmqco8wkwjd.js` @615161 (line 3 col 18868) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_d646d5d6fc9a09cb…` [614466–615528]; innermost `expression` node `jsrg_node_8e93f36fc7d184a5…`
- InitialEdgeViz draws an SVG: a filled circle r=size/5 plus a quadratic curve `M..Q..L` with strokeWidth 2, stroke `var(--viz-transition-color, var(--edge))`, ending in an ArrowMarker.
  - Evidence: `2jcmqco8wkwjd.js` @629704 (line 3 col 33411) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_722ebde6045b8cf7…` [629213–643924]; innermost `expression` node `jsrg_node_1cfee495ece12619…`
- Compound (group) node = `.stately-flow__node-<kind>` wrapper with two absolutely-positioned layers: header surface `rounded-t-md border-2 border-b-0` (height = measured content height) and child area `rounded-b-md border-2 bg-transparent` starting below it.
  - Evidence: `2jcmqco8wkwjd.js` @1540583 (line 103 col 186817) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_8cec677d94ece057…` [1537708–1543519] (`eZ`); innermost `call-site` node `jsrg_node_7718c0d5bc53ecd8…`
- Children of a `parallel` parent are drawn with `border-dashed` (selector checks parent data.type === "parallel").
  - Evidence: `2jcmqco8wkwjd.js` @1538318 (line 103 col 184552) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_8cec677d94ece057…` [1537708–1543519] (`eZ`)
- Flow node wrapper attributes: data-flow-node-id, data-color, data-flow-node-kind (default "state"), data-flow-parent-id; class `stately-flow__node-${kind}` + `selected`/`dragging`.
  - Evidence: `2jcmqco8wkwjd.js` @1539999 (line 103 col 186233) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_8cec677d94ece057…` [1537708–1543519] (`eZ`); innermost `call-site` node `jsrg_node_a3012267e3f7f5ad…`
- Group child area carries `data-flow-group-child-area` and drag-handle strips of height = connection-boundary width.
  - Evidence: `2jcmqco8wkwjd.js` @1540789 (line 103 col 187023) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_8cec677d94ece057…` [1537708–1543519] (`eZ`); innermost `call-site` node `jsrg_node_fc5eda4a6ba9abad…`
- **Measured sizes.** None were recorded by REA, which is static only. The earlier DOM measurement (`dom_light.json`, not REA) gave 221×143, 223×79 and 129×45 px. Width hugs the content, with the description capped by `--viz-entity-description-width` (384px, from the CSS).
- **Final states.** Final states are pinned to the last layer (section 4), and the header icon is chosen by state type. Header icon glyph identities weren't individually traced.

## 2. Edge routing and drawing

- ArrowMarker: `<marker viewBox="0 0 10 10" markerWidth=size markerHeight=size refX=5 refY=5 markerUnits="strokeWidth" orient="auto">` with closed triangle `M0,0 L0,10 L10,5 z`; default size 5.
  - Evidence: `2jcmqco8wkwjd.js` @629649 (line 3 col 33356) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_d80c1911ecf74938…` [629421–629680] (`g`); innermost `expression` node `jsrg_node_dfb078c84c2017bb…`
- Arrowhead path uses `fill: context-stroke`, so the head takes the edge stroke colour.
  - Evidence: `2jcmqco8wkwjd.js` @636936 (line 3 col 40643) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_b3d65eb6983b7ae3…` [633685–641990] (`A`); innermost `call-site` node `jsrg_node_491a8958e2daf3c9…`
- Edge path component defaults: interactionWidth 20 (invisible hit path), overlapWidth 6 (halo stroke `var(--edge-halo)`), highlightWidth 8.
  - Evidence: `2jcmqco8wkwjd.js` @630728 (line 3 col 34435) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_f7b1329c5eec5e63…` [630660–632448] (`m`)
- EDGE_PATH_RADIUS = 10: orthogonal routes are rounded at corners (roundCorners(pathFromPoints(points),{radius:10})); fallback path is a 3-segment orthogonal `M x y L mid y L mid y2 L x2 y2`.
  - Evidence: `2jcmqco8wkwjd.js` @50974 (line 1 col 50974) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_32b027b616516dda…` [50437–52232]; innermost `expression` node `jsrg_node_8bef5b3ee6fe8caa…`
- ELK route -> SVG: ORTHOGONAL routes go through pathFromPoints + roundCorners(radius 10) + toSvgPath; other styles use cubic segments.
  - Evidence: `2jcmqco8wkwjd.js` @54476 (line 1 col 54476) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_dcaee2f99f8c96cd…` [53903–54625]; innermost `return-site` node `jsrg_node_938953d2859f82b1…`
- getEdgeStroke(): `var(--entity-edge)`; hovered -> getEdgeHoverStroke() = `var(--entity-edge-hover)`.
  - Evidence: `2-eybig0s36bz.js` @236060 (line 1 col 236060) — rea/f_2-eybig0s36bz.evidence.json `ev_fd165ebb0d325365…`; REA function node `jsrg_node_b7e503287f84dae1…` [235073–237114]; innermost `expression` node `jsrg_node_c6cd55569560a1a7…`
- getTransitionEdgeStrokeStyle: guarded transitions are dashed `5,5` (offset 2.5); architecture "sends/event" edges `2,4`.
  - Evidence: `2-eybig0s36bz.js` @235222 (line 1 col 235222) — rea/f_2-eybig0s36bz.evidence.json `ev_fd165ebb0d325365…`; REA function node `jsrg_node_b7e503287f84dae1…` [235073–237114]
- Hover/elevation: setEdgePathHover / setEdgePathElevated re-append the hovered SVG path last in its parent (paint on top) using an "edge-paint-order" comment anchor.
  - Evidence: `2-eybig0s36bz.js` @236268 (line 1 col 236268) — rea/f_2-eybig0s36bz.evidence.json `ev_fd165ebb0d325365…`; REA function node `jsrg_node_b7e503287f84dae1…` [235073–237114]; innermost `expression` node `jsrg_node_c6cd55569560a1a7…`
- Edge label pill: `border-2 rounded-label px-2 py-1 w-max` (compact `border-2 px-2 py-1 w-max` + rounded-label/rounded-md; expanded `border-2 rounded-xl px-3 py-2 w-max`); background `var(--entity-label-fill)`, border colour getEdgeStroke(); dashed when q.
  - Evidence: `2jcmqco8wkwjd.js` @1463576 (line 103 col 109810) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_64bd585b47883b39…` [1457224–1465164] (`ek`); innermost `call-site` node `jsrg_node_9b4ff53d65911ba2…`
- Selected label: outline 2px counter-scaled by zoom (`calc(2px / var(--zoom,1))`), offset 2px, colour `--viz-selection-color`.
  - Evidence: `2jcmqco8wkwjd.js` @1379220 (line 103 col 25454) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_e3b7b1ef2ceec60e…` [1377791–1379764] (`x`); innermost `expression` node `jsrg_node_ff390f008444d4ea…`
- Default label mode "edge-label-grouped": labels become layout nodes (transitionNodes) so the pill sits on the route; live routing forces `elk.edgeRouting: ORTHOGONAL`.
  - Evidence: `2jcmqco8wkwjd.js` @570009 (line 1 col 570009) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_5608569d9c7b7934…` [570009–572241] (`_`)
- Self-transitions: ELK graph option `org.statelyai.selfLoops: "lanes"` (and pele `selfLoops:"lanes"`), i.e. self loops routed in lanes beside the node.
  - Evidence: `2jcmqco8wkwjd.js` @575613 (line 1 col 575613) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_68946711c91b1213…` [572241–576423] (`L`)
- Edge context menu has "Make self-transition" / "Make targetless transition" / "Switch source and target".
  - Evidence: `2jcmqco8wkwjd.js` @1487389 (line 103 col 133623) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_64a443adb0901b3e…` [1482903–1488522]; innermost `call-site` node `jsrg_node_f997ebb1e9d78057…`
- Edge stroke width defaults to 2; the selection path is max(4, width+2) with `vector-effect: non-scaling-stroke`; visible path class `stately-flow__edge-path`, hit path `stately-flow__edge-interaction` (transparent, linecap square).
  - Evidence: `2jcmqco8wkwjd.js` @631804 (line 3 col 35511) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_f7b1329c5eec5e63…` [630660–632448] (`m`); innermost `expression` node `jsrg_node_3c503afccea169ca…`

## 3. Theme system

- Theme switch: resolved colour mode toggles `.dark` / `.light` classes on `document.documentElement`.
  - Evidence: `2c_-zpm4z-m4f.js` @20437 (line 1 col 20437) — rea/theme.evidence.json `ev_9d04958c3fc37912…`; REA function node `jsrg_node_4e0e5ec3c18e69ef…` [20388–20515]; innermost `call-site` node `jsrg_node_17a8744364964a64…`
- "system" mode follows `prefers-color-scheme: dark` with a change listener.
  - Evidence: `2c_-zpm4z-m4f.js` @19744 (line 1 col 19744) — rea/theme.evidence.json `ev_9d04958c3fc37912…`; REA function node `jsrg_node_56b466ae5aad4cff…` [19740–19801] inside named fn `o` [19702–20065]; innermost `call-site` node `jsrg_node_cfb37afe0f619b25…`
- URL/hash params read: `theme`, `colorMode`, `mode`, `expanded`, `simulation.openPanelOnStart`, `validation.showValidations`.
  - Evidence: `2z0aixa72nhem.js` @9250 (line 1 col 9250) — rea/theme.evidence.json `ev_9d04958c3fc37912…`; REA function node `jsrg_node_5da7616f04bcc33e…` [8867–9462] (`t`); innermost `expression` node `jsrg_node_da5cb38fb8007ab6…`
- Command palette "Switch to dark/light mode" updates settings.appearance.colorMode.
  - Evidence: `2jcmqco8wkwjd.js` @1630463 (line 103 col 276697) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_f88582354b50c90b…` [1622450–1646014]; innermost `call-site` node `jsrg_node_72f25ce06caa6bdc…`
- Settings schema: appearance.colorMode enum light|dark|system, default "dark" (the public viz embed passes theme=light|dark).
  - Evidence: `2we_h-txzz_88.js` @30134 (line 1 col 30134) — rea/theme.evidence.json `ev_9d04958c3fc37912…`; REA function node `jsrg_node_bc0d54b6c22dda41…` [22371–45406]
- Canvas grid: `LinesBackground` (class stately-flow__background) shown when `canvas.showGrid`; line colour light `color-mix(in srgb, var(--color-gray-100) 55%, var(--color-gray-50))`, dark `color-mix(in srgb, var(--color-gray-850) 55%, var(--color-gray-900))`.
  - Evidence: `2jcmqco8wkwjd.js` @1803204 (line 106 col 1568) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_1873eafd8d649a6f…` [1802752–1804420] inside named fn `te` [1775754–1806740]; innermost `call-site` node `jsrg_node_5f9c74dc2a3647df…`

### CSS variables (not REA: CSS at the given byte offsets of `js/01eer82cd_rgi.css`)

Every resolved light and dark token is in `theme.json`. Blocks:
- Light: `:root,.light` at css@297443–309762.
- Dark: `.dark` at css@328497–341260.
- Node metrics: `:root` at css@201991 (`--viz-entity-border:2px; --viz-entity-radius:6px; --viz-entity-inset:12px; --viz-entity-header-y:8px; --viz-entity-description-width:384px`).
- Per-colour mapping: `[data-color]` / `[data-color=<c>]` at css@341309–346319.
- Tailwind `@theme` scale: `:root,:host` at css@2744.

| token | light | dark |
|---|---|---|
| `--canvas` | #eff1f3 (`var(--color-gray-50)`) | #15151d (`var(--color-gray-900)`) |
| `--floating` | #fdfdfe (`#fdfdfe`) | #1f1f29 (`var(--color-gray-850)`) |
| `--raised` | #dfe3e7 (`var(--color-gray-100)`) | #2e2f3c (`var(--color-gray-800)`) |
| `--border` | #dfe3e7 (`var(--color-gray-100)`) | #ffffff1a (`#ffffff1a`) |
| `--fg` | #15151d (`var(--color-gray-900)`) | #f5f7f7 (`var(--color-gray-25)`) |
| `--fg-muted` | #4d4f5f (`var(--color-gray-700)`) | #9da1b1 (`var(--color-gray-400)`) |
| `--primary` | #0f6ee5 (`var(--color-statelyBlue-500)`) | #0f6ee5 (`var(--color-statelyBlue-500)`) |
| `--state-fill` | #dfe3e7 (`var(--color-gray-100)`) | #2e2f3c (`var(--color-gray-800)`) |
| `--state-border` | #72758b (`var(--color-gray-500)`) | #72758b (`var(--color-gray-500)`) |
| `--edge` | #72758b (`var(--state-border)`) | #72758b (`var(--state-border)`) |
| `--edge-hover` | #4d4f5f (`var(--color-gray-700)`) | #9da1b1 (`var(--color-gray-400)`) |
| `--edge-halo` | white (`white`) | black (`black`) |
| `--chip` | #f5f7f7 (`var(--color-gray-25)`) | #1f1f29 (`var(--color-gray-850)`) |
| `--chip-border` | #ced1da (`var(--color-gray-200)`) | #4d4f5f (`var(--color-gray-700)`) |
| `--selection` | #3178aa (`var(--color-blue-500)`) | #3178aa (`var(--color-blue-500)`) |
| `--runtime` | #005cde (`var(--color-statelyBlue-600)`) | #63a3fc (`var(--color-statelyBlue-400)`) |
| `--scrim` | #0000004d (`#0000004d`) | #00000080 (`#00000080`) |
| `--success` | #0f7528 (`var(--color-green-600)`) | #54b559 (`var(--color-green-400)`) |
| `--warning` | #905900 (`var(--color-yellow-600)`) | #f8b632 (`var(--color-yellow-300)`) |
| `--danger` | #bd2b29 (`var(--color-red-600)`) | #f17f7b (`var(--color-red-400)`) |

The entity colours `gray blue teal green yellow orange red pink purple` each map to these steps:

| part | light step | dark step |
|---|---|---|
| fill | C-100 | C-800 |
| border | C-400 | C-700 |
| ink | C-900 | C-100 |
| edge | C-600 | C-500 |

The label fill is the colour's 200 step at 25% alpha in light mode, and the 900 step mixed 65% toward black at 50% alpha in dark mode. The resolved hexes are in `theme.json`.

**How the theme switches.** The resolved mode sets the `.dark`/`.light` class on `<html>`, and `color-scheme` comes from the lightningcss light/dark variables in those blocks. The mode comes from:
- the URL `theme`/`colorMode` parameters;
- an embed `@statelyai.setTheme` message (`1bt3ry37moi1m.js`@46009, not semantically analysed);
- the palette toggle;
- the system preference.

**Fonts** (CSS): sans is `"Inter Variable", Inter, -apple-system, …`, mono is `ui-monospace, SFMono-Regular, …`. Text sizes:
- `.text-entity-title`: 1.25rem/1.5625rem, weight 600, tracking −0.01em (css@74531).
- `-compact`: .875rem/1.25rem, weight 600 (css@74687).
- `.text-entity-body`: .75rem/1rem, weight 400 (css@74955).
- `.text-entity-section`: .6875rem/1rem, weight 600 (css@75063).

**Other CSS:**
- `.rounded-label{border-radius:14px}` (css@51521).
- The sim-path edge is dashed `6 4` (css@316458).
- Edge stroke transitions use `var(--duration-standard) var(--ease-standard)` (css@317072).
- Motion: `--ease-out-expo: cubic-bezier(.16,1,.3,1)`, `--duration-spatial: .3s`.
- The grid's pattern size wasn't located in the bundles. The engine's `snapGrid` is [10,10].

## 4. Layout pipeline

- toElkGraph root options: `elk.algorithm: layered`, direction upper-cased (default DOWN), `elk.spacing.nodeNode` = nodeSpacing ?? 60, `elk.layered.spacing.nodeNodeBetweenLayers` = rankSpacing ?? 90; INCLUDE_CHILDREN when hierarchy edges exist.
  - Evidence: `2jcmqco8wkwjd.js` @560890 (line 1 col 560890) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_355f0cacaea50df4…` [559809–563789]; innermost `return-site` node `jsrg_node_51136fd61b8717ff…`
- Group padding: content band (header) height is added to the padding side (`top` by default): `[top=header+max(pad,label),left,bottom,right]`; nodeSize constraints `NODE_LABELS PORTS MINIMUM_SIZE`; contentAlignment H_CENTER for top/bottom.
  - Evidence: `2jcmqco8wkwjd.js` @562204 (line 1 col 562204) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_00f73c88b7bcc7c4…` [561288–563757] (`e`)
- Live (stately router) ELK options: edgeNode 24, edgeNodeBetweenLayers 24, edgeEdge 48, favorStraightEdges true, bk.edgeStraightening IMPROVE_STRAIGHTNESS, feedbackEdges true, unnecessaryBendpoints true, hierarchyHandling INCLUDE_CHILDREN, components MODEL_ORDER + separateConnectedComponents false when an initial state exists.
  - Evidence: `2jcmqco8wkwjd.js` @582319 (line 1 col 582319) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_64ae329beac2a787…` [582200–586304] (`H`)
- Rank pinning: initial child -> `layering.layerConstraint: FIRST_SEPARATE`; final states (when eligible) -> `LAST`; edge labels inline (`edgeLabels.inline: true`).
  - Evidence: `2jcmqco8wkwjd.js` @581402 (line 1 col 581402) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_f0ed9e3b8aa3d433…` [581175–581451] inside named fn `$` [580089–582200]; innermost `expression` node `jsrg_node_a10d48bf084c5d63…`
- Ports: side chosen from relative centre position (EAST/WEST/SOUTH/NORTH) and node gets `elk.portConstraints: FIXED_SIDE`.
  - Evidence: `2jcmqco8wkwjd.js` @50016 (line 1 col 50016) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_f0b886a66424bcd5…` [49698–50205] (`facePeers`)
- pele engine call maps spacing {node,layer,edge} from the ELK keys with peleLayoutDefaults fallback; unmeasured nodes default to 200x100.
  - Evidence: `2jcmqco8wkwjd.js` @59162 (line 1 col 59162) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_58c3f563b377f899…` [57428–60620]; innermost `expression` node `jsrg_node_f70507652b7103a1…`
- ELK option schema defaults (zod, elkLayoutDefaults): nodeNode 50, edgeEdge 10, edgeNode 10, nodeNodeBetweenLayers 30, edgeNodeBetweenLayers 10, edgeRouting ORTHOGONAL, direction DOWN, cycleBreaking MODEL_ORDER, nodePlacement BRANDES_KOEPF, crossingMinimization LAYER_SWEEP, nodeSelfLoop 24, thoroughness 7, edgeLabels.inline true.
  - Evidence: `2we_h-txzz_88.js` @1972 (line 1 col 1972) — rea/theme.evidence.json `ev_9d04958c3fc37912…`; REA function node `jsrg_node_7efab6c94500569b…` [119–22351]; innermost `expression` node `jsrg_node_f819e0be099ae908…`
- defaultLayoutPreferences = {policy:"auto", overrides:{}}.
  - Evidence: `2we_h-txzz_88.js` @25266 (line 1 col 25266) — rea/theme.evidence.json `ev_9d04958c3fc37912…`; REA function node `jsrg_node_bc0d54b6c22dda41…` [22371–45406]; innermost `expression` node `jsrg_node_49133860278a401e…`
- **Libraries** (bundled `package.json`, `3ipc7qgmu07wn.js`@5750–16400, REA `f_3ipc7qgmu07wn.evidence.json`):
  - The layout engine is ELK through `elkjs` → `npm:@statelyai/layout@0.6.1`, with `@statelyai/layout` 0.14.5 (EPL-2.0/GPL fork of elkjs).
  - There's an alternative `pele` ^1.5.2 engine and a `stately` router: `resolveLayoutEngine` is in `2y06tgqaa_fgx.js`@43325, which wasn't semantically analysed.
  - pele defaults are nodeNode 40, layers 44, edgeEdge 16 (`2y06tgqaa_fgx.js`@42987).

## 5. Interactions

- Viz viewport limits: minZoom 0.1, maxZoom 10.
  - Evidence: `2jcmqco8wkwjd.js` @1774026 (line 103 col 420260) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_e46883b96d5c6354…` [1770703–1808089]
- Flow engine store defaults: minZoom 0.1, maxZoom 4, snapGrid [10,10] (snapToGrid off), dragThreshold 3, autoPanOnDrag true (threshold 40, speed 15), selectionMode "partial", colorMode "system".
  - Evidence: `2-eybig0s36bz.js` @129760 (line 1 col 129760) — rea/f_2-eybig0s36bz.evidence.json `ev_fd165ebb0d325365…`; REA function node `jsrg_node_de2db38a352de4d1…` [129463–174452]
- Engine fit-bounds: padding 0.1, minZoom 0.1, maxZoom 2 by default.
  - Evidence: `2-eybig0s36bz.js` @23480 (line 1 col 23480) — rea/f_2-eybig0s36bz.evidence.json `ev_fd165ebb0d325365…`; REA function node `jsrg_node_7d1f07c6985def66…` [23480–23829] (`N`)
- "Fit to content" command: fit({maxZoom:1, padding:0.1}).
  - Evidence: `2jcmqco8wkwjd.js` @1655371 (line 103 col 301605) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_38acaed634c20f1f…` [1655366–1655401]; innermost `call-site` node `jsrg_node_4c0bb043d0434bc9…`
- Zoom-to-selection options {maxZoom:2, padding:0.1}; arrow keys map to left/right/up/down navigation.
  - Evidence: `2jcmqco8wkwjd.js` @1684876 (line 103 col 331110) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_eaaddee6394b9102…` [1682703–1703317]
- Wheel gesture: ctrl/meta+wheel zooms (zoom * 2^(-deltaY*0.002), x10 for pinch), plain wheel pans (panBy).
  - Evidence: `2-eybig0s36bz.js` @107807 (line 1 col 107807) — rea/f_2-eybig0s36bz.evidence.json `ev_fd165ebb0d325365…`; REA function node `jsrg_node_56f6cd182f96c726…` [107786–108370] (`ne`); innermost `return-site` node `jsrg_node_1c0faa1f81d889b0…`
- Edge dimming: opacity 1 when highlighted/selected/hovered-related, else UNSELECTED_OPACITY; temp edges 0.5; hovered/selected edges get zIndex 1000.
  - Evidence: `2jcmqco8wkwjd.js` @637747 (line 3 col 41454) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_b3d65eb6983b7ae3…` [633685–641990] (`A`)
- Node dimming: exporting 1, temp 0.5, sim-visited 0.8, highlighted/active 1, otherwise 1 if `canvas.dimUnselected` is off or node is relevant to the selection, else UNSELECTED_OPACITY; non-visited nodes in simulation 0.5.
  - Evidence: `2jcmqco8wkwjd.js` @1400266 (line 103 col 46500) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_e384a7467038f135…` [1389956–1413597]
- UNSELECTED_OPACITY exported from the shared utils module (value assigned `tf=.7` in the same module).
  - Evidence: `1n-x33n1t71nb.js` @124500 (line 1 col 124500) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_4e030c461312aeb5…` [124369–141373]; innermost `expression` node `jsrg_node_18e059a615f40764…`
- Highlight outline: width `var(--viz-highlight-width)`, offset 2px, dashed/double/solid by state, colour mixed 50%/100%.
  - Evidence: `3186p7sycrje2.js` @233521 (line 8 col 104946) — rea/flow.evidence.json `ev_02ac1c0dde519f84…`; REA function node `jsrg_node_56b19a0ff9befded…` [232563–234341] (`e8`); innermost `expression` node `jsrg_node_d6afc772826b142b…`
- Viewport writes `--flow-zoom` and `--flow-inverse-zoom` (1/zoom) on the viewport element so chrome can counter-scale.
  - Evidence: `3ipc7qgmu07wn.js` @42686 (line 1 col 42686) — rea/f_3ipc7qgmu07wn.evidence.json `ev_05010596dc86ce26…`; REA function node `jsrg_node_f170dff33162bd01…` [42608–42779] (`l`); innermost `call-site` node `jsrg_node_673450ccd4e9854a…`
- Command palette entries include toggle-grid ("Hide grid"/"Show grid"), toggle color mode, list/graph view, Go to state.
  - Evidence: `2jcmqco8wkwjd.js` @1640160 (line 103 col 286394) — rea/viz.evidence.json `ev_2813615599f4c3ba…`; REA function node `jsrg_node_f88582354b50c90b…` [1622450–1646014]; innermost `call-site` node `jsrg_node_2c9c9e9aededb856…`

## 6. Licences

- Bundled package.json: `@statelyai/editor` 0.55.19, private, **license UNLICENSED** (proprietary).
  - Evidence: `3ipc7qgmu07wn.js` @5750 (line 1 col 5750) — rea/f_3ipc7qgmu07wn.evidence.json `ev_05010596dc86ce26…`; REA function node `jsrg_node_5fbfc380aca15792…` [5718–16616]; innermost `expression` node `jsrg_node_90c3d5212d73a02f…`
- Deps: elkjs aliased to @statelyai/layout@0.6.1; @statelyai/layout 0.14.5; @statelyai/flow ^0.14.0; @statelyai/flow-react ^0.12.3; @statelyai/graph ^2.1.0; pele ^1.5.2; next-themes ^0.4.6; xstate 6.0.0-beta.4; react ^19.2.5; tailwindcss ^4.1.18; @fontsource-variable/inter ^5.2.8.
  - Evidence: `3ipc7qgmu07wn.js` @13691 (line 1 col 13691) — rea/f_3ipc7qgmu07wn.evidence.json `ev_05010596dc86ce26…`; REA function node `jsrg_node_5fbfc380aca15792…` [5718–16616]; innermost `expression` node `jsrg_node_90c3d5212d73a02f…`
- **No licence header comments** were found in the 75 bundles: there are no `/*!`, `@license`, `Copyright` or `SPDX` banners. The only hits are code strings:
  - Babel's comment filter `e.includes("@license")` (`21f7_4lavuqd8.js`@670991).
  - A bundled xstate `package.json` with `license:"MIT"` (`21f7_4lavuqd8.js`@4818).
  - core-js's `copyright:"© 2019 Denis Pushkarev"` (`2ujzli3513l7i.js`@4323).
  - For `21f7_4lavuqd8.js`, REA retained module facts only (its semantic graph exceeded the result budget; `flow.evidence.json` limitation).
- **Open-source libraries** you can reuse:
  - MIT: `@statelyai/flow` ^0.14.0, `@statelyai/flow-react` ^0.12.3, `@statelyai/graph` ^2.1.0, next-themes ^0.4.6, React ^19.2.5, Tailwind ^4.1.18, xstate 6.0.0-beta.4, cmdk, react-hotkeys-hook, lucide-react.
  - OFL: `@fontsource-variable/inter` ^5.2.8.
  - EPL-2.0 OR GPL-3.0: the elkjs fork `@statelyai/layout`.
  - These licence families come from npm, as recorded in `stately.md`. The bundles themselves carry no headers.

## Commands run

- `npm i -g rea-agents@latest   # -> 6.10.1 (needs Node >=24.22.1; run via node-26.12.1 wrapper ~/bin/rea26)`
- `rea26 --version`
- `chrome --remote-debugging-port=9337 --user-data-dir=<scratch>/chrome-profile about:blank ; PUT /json/new?<viz url>   # throwaway, no login`
- `rea26 list-browser-targets http://127.0.0.1:9337 --json`
- `rea26 analyze-web-bundle http://127.0.0.1:9337 <targetId> --allowed-origins https://editor.stately.ai --observation-ms 8000 --max-heap-mb 4096 --analysis-timeout-ms 120000 --total-analysis-timeout-ms 560000 --detail summary --view '{"kind":"web-bundle","collection":"summary"}' --evidence_output rea/webbundle.evidence.json --json`
- `rea26 analyze-javascript-application <scratch>/stately/js --artifact-format directory --detail summary --evidence_output rea/app.evidence.json --max-heap-mb 4096 --json`
- `NODE_OPTIONS=--max-old-space-size=16384 rea26 analyze-javascript-application <js> --artifact-format directory --source-path 2jcmqco8wkwjd.js --max-semantic-nodes 400000 --max-semantic-nodes-per-file 400000 --max-semantic-unknowns 200000 --max-semantic-unknowns-per-file 200000 --max-heap-mb 8192 --analysis-timeout-ms 1700000 --detail summary --evidence_output rea/viz.evidence.json --json`
- `rea26 analyze-javascript-application <js> --artifact-format directory --source-path 2-eybig0s36bz.js --source-path 2_1o-xvii-r5o.js --source-path 3186p7sycrje2.js --source-path 3ipc7qgmu07wn.js --source-path 1n-x33n1t71nb.js --source-path 21f7_4lavuqd8.js --max-semantic-nodes 1000000 ... --detail summary --evidence_output rea/flow.evidence.json --json`
- `rea26 analyze-javascript-application <js> --artifact-format directory --source-path 3ipc7qgmu07wn.js ... --evidence_output rea/f_3ipc7qgmu07wn.evidence.json --json`
- `NODE_OPTIONS=--max-old-space-size=12288 rea26 analyze-javascript-application <js> --artifact-format directory --source-path 2-eybig0s36bz.js --max-semantic-nodes 300000 ... --evidence_output rea/f_2-eybig0s36bz.evidence.json --json`
- `rea26 analyze-javascript-application <js> --artifact-format directory --source-path 2c_-zpm4z-m4f.js --source-path 2z0aixa72nhem.js --source-path 2we_h-txzz_88.js --detail summary --evidence_output rea/theme.evidence.json --json`
- `rea26 trace-application-feature '{"application":{"kind":"retained-evidence","evidence_id":"ev_9d04958c…"},"seed":{"kind":"string","value":"prefers-color-scheme: dark","match":"contains"},"direction":"both"}' --evidence-bundle rea/theme.evidence.json --json`
- `rea26 trace-application-feature '{…"evidence_id":"ev_28136155…","seed":{"kind":"string","value":"edge-label-grouped","match":"contains"},"direction":"outgoing"}' --evidence-bundle rea/viz.evidence.json --json`
- `rea26 compare-javascript-export-shapes '{…2we_h-txzz_88.js defaultLayoutPreferences…}' --evidence-bundle rea/theme.evidence.json   # refused: needs two distinct versions`
- `rea26 inspect-artifact js/01eer82cd_rgi.css   # refused: unsupported format (CSS)`
- `rea26 recover-javascript-sources js/2jcmqco8wkwjd.js rea/recovered_viz --extraction-mode structural   # refused: needs Wakaru (Linux x64)`
- `rea26 search js/2jcmqco8wkwjd.js nodeNodeBetweenLayers   # refused: native providers only`
- `rea26 export-web-scripts rea/webbundle.evidence.json rea/webscripts   # refused: needs inspect_web_page/scenario capture`
