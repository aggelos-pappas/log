# Research: the Relate state machine view (#267)

Written 2026-11-22 for the Relate hackathon entry. The visual research on Stately's editor is in [stately.md](stately.md), with its screenshots in [images/](images/). The static bundle analysis that corrected it is in [rea.md](rea.md), with every cited fact in [facts.json](facts.json) and every light and dark token in [theme.json](theme.json); the design-system extraction of the live page is in [tokens.json](tokens.json) and [tokens.css](tokens.css). Back to [Research and decisions](../README.md).

## What the owner asked for

Not a who-knows-who graph. A relationship drawn as a state machine: the states are where it stands (new, follows you, talks to your followers, engaged with you, in conversation) and the people a route passes through; the transitions are the moves that push it on, each with the log tool that makes it; the person's real history is the path taken; where it stands now is highlighted and the next move is the outgoing transition. Three views: one person, the route to someone, the whole network with counts.

## Decisions

| Question | Picked | Why |
| --- | --- | --- |
| A standalone MCP App, or a block | A `stateMachine` block in the `report` view's block list, which `relateMachine` returns | Any report can carry it, and it reaches every host the report view already reaches (MCP Apps, Hermes Desktop, text). One bundled file, no CDN. |
| Rendering engine | SVG strings from our own code (`src/relate/machine/render`), wrapped by a small React component in the report kit | `@xyflow/react` is not installed and a new dependency was out of scope; the vendored diagram skill (`vendor/diagram`) already defines the primitives: start dot, masked labels, orthogonal connectors leaving each face perpendicular, fanned ports, accessible `title`/`desc`. |
| Layout | A deterministic layered layout in `render/layout.ts`: longest-path ranks after breaking cycles in model order, edge labels placed as nodes between ranks (Stately's grouped edge labels), barycenter ordering, orthogonal routing with rounded corners, back edges on an outer lane | `node_modules` has no `@dagrejs/dagre` or `elkjs`; only `dagre-d3-es` arrives through mermaid, which is not a direct dependency. ELK's licence (EPL-2.0) was also a reason in [stately.md](stately.md). |
| Direction | Left to right when it fits the frame at 72% or more, else top to bottom; the toolbar turns it | Six states in a row are about 2,800 px wide, too small to read in a chat column. |
| Look | Stately's values as measured: 2px borders, 6px radius, header padding 12/8, 20px semibold titles over 12px descriptions, label pills with a 2px border, 14px radius and 8x4 padding, 5x5 arrowheads in the edge colour, rounded edge corners at radius 10, a 20px invisible hit path, guarded moves dashed 5,5, a 20px initial marker with a 4px gap, dimming to 0.7 on selection; log's own font, Satoshi, embedded in place of Stately's Inter | All of it lives in one file, `src/relate/machine/theme.ts`, so a later read of Stately can retune it without touching the drawing. |
| Theme | CSS variables for both palettes, switched by a `.dark` or `.light` class (on the root or the block), with `data-theme` and the system preference as fallbacks | Stately toggles `.dark`/`.light` on the root ([rea.md](rea.md) section 3); `data-theme` stays for the report kit's hosts. |
| Spacing | 50px between nodes in a layer and 30px between layers, initial states in the first layer and final states in the last | Measured on the live page. rea read 60/90 from the bundle's ELK options, but the page draws with its settings defaults (50/30, [rea.md](rea.md) schema defaults), and the side-by-side matched only at 50/30. |
| Platforms | A platform filter (all, X, Discord, Instagram, Slack, Reddit, Facebook, LinkedIn) on the network and person views, drawn as toggles with a count each; one person's machine reads every account linked to them by personId, tags each move with the platform it happened on and lists the accounts | Same-handle accounts nobody linked show as a suggested link and are never merged. |

## Progress

| Step | State |
| --- | --- |
| States and moves from the Relate graph and log.db's interactions | built |
| Person, route and network views | built |
| `stateMachine` report block, text fallback | built |
| `relateMachine` tool and `log relate machine` | built |
| Screenshots of each view in light and dark from the demo world | taken, below |
| Upstream genui blocks (show_blocks) drawing the same block | not built |
| Font embedded in the view | built: log's brand font Satoshi (Regular 400, Medium 500, Bold 700, the unchanged WOFF files the site ships; no 600 file exists, so 600 titles draw in Bold), ITF Free Font License 2.0 (`site/apps/web/public/fonts/satoshi-webfont/LICENSE.txt`), which allows embedding in log's own app but not modifying, subsetting or converting the files. Inter is no longer bundled. |
| Platform filter and one person across linked accounts | built |
| Side-by-side with the live Stately page, light and dark | [light](images/compare_light.png), [dark](images/compare_dark.png) |

## Screenshots (demo world, `src/relate/machine/fixtures/machineWorld.ts`)

| View | Light | Dark |
| --- | --- | --- |
| One person's machine | [light](images/machine_person_light.png) | [dark](images/machine_person_dark.png) |
| The route to someone | [light](images/machine_route_light.png) | [dark](images/machine_route_dark.png) |
| The network by state | [light](images/machine_network_light.png) | [dark](images/machine_network_dark.png) |

## Stately measured again (v2)

Three sources, in this order of trust: computed styles read from the live page (`editor.stately.ai/viz` with a pasted six-state machine, light and dark, at 100%), [rea.md](rea.md)'s static reading of the bundles, and `extract-design-system` run on the live page. Only measured values were taken; no Stately code was copied (the editor is unlicensed).

| Value | Used | Source | Differs from |
| --- | --- | --- | --- |
| Unselected opacity | 0.7 | rea | [stately.md](stately.md) had 0.5 |
| Edge hit path | 20px, transparent, square caps | rea, and the live `stately-flow__edge-interaction` stroke | stately.md had 16px |
| Edge corners | rounded, radius 10 | rea, and live paths drawn with `A 10 10` arcs | stately.md had square corners |
| Guarded moves | dashed 5,5, offset 2.5 | rea | stately.md had 6,4 |
| Initial marker | 20px, 4px gap, dot of size/5 | rea | stately.md had a 4px dot only |
| Title | Inter Variable 20px, weight 600, line 25px, tracking -0.2px | live | the v1 render used 16px |
| Description | 12px, line 16px, 2px below the title, colour `fg` 85% over the canvas | live | |
| Label pill | 12px weight 500, border 2, radius 14, padding 8x4, 28px tall for one line, fill at 25% (light) or 50% (dark) of the state fill | live and rea | v1 used weight 600 and 10x5 padding |
| Layer spacing | 50 between nodes, 30 between layers | live | rea's ELK options say 60/90 |
| Colours | every token in [theme.json](theme.json) | rea (CSS byte offsets) | `extract-design-system` agreed on all 94 colour variables it found; its one difference, `--primary-text` #63a3fc, is the dark value because the page opens dark, so each theme keeps its own |
| Font | Satoshi, then system-ui and the system stack, at Stately's sizes, weights and tracking; text width estimates scaled by Satoshi's measured advance widths against Inter (title 0.97, description 0.92, pill and chip 0.94), cap height 0.72 | Satoshi files (OS/2 and hmtx tables) | Stately uses Inter Variable (live and `extract-design-system`) |

`extract-design-system` found little on this page (one palette colour, 4/8px spacing, Inter Variable): the canvas is drawn after load and its colours sit in CSS variables. What it found is committed as [tokens.json](tokens.json) and [tokens.css](tokens.css).

What still differs: our states are coloured by stage (Stately's entity colours, which its own editor lets a user pick); each move's pill carries its log tool on a second line; the path taken is drawn in the runtime blue and the current state has a selection ring; Stately's compound and parallel states have no counterpart here, so no state draws a header band over a body.
