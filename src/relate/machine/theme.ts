import { MACHINE_TONES } from './types'
import type { MachineTone } from './types'

export const MACHINE_FONT = {
  face: 'Inter Variable',
  sans: '"Inter Variable", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  capRatio: 0.727,
  title: { size: 20, line: 25, weight: 600, tracking: '-0.2px', charWidth: 0.6 },
  body: { size: 12, line: 16, weight: 400, charWidth: 0.53 },
  chip: { size: 11, line: 16, weight: 500, charWidth: 0.55 },
  pill: { size: 12, line: 16, weight: 500, charWidth: 0.56 },
  tool: { size: 12, line: 16, weight: 400, charWidth: 0.6 },
  mark: { size: 9, line: 14, weight: 700, charWidth: 0.62 },
}

export const MACHINE_SIZE = {
  border: 2,
  radius: 6,
  pillRadius: 14,
  pillBorder: 2,
  chipRadius: 4,
  grid: 12,
  padX: 12,
  padY: 8,
  gapY: 2,
  chipGap: 4,
  chipPadX: 6,
  chipHeight: 18,
  chipRowPad: 4,
  pillPadX: 8,
  pillPadY: 4,
  markPadX: 4,
  markHeight: 14,
  markRadius: 4,
  markGap: 4,
  nodeMinWidth: 96,
  nodeMaxWidth: 412,
  pillMaxWidth: 220,
  nodeSep: 50,
  dummySep: 16,
  rankGap: 30,
  laneGap: 28,
  laneStep: 20,
  margin: 36,
  corner: 10,
  port: 10,
  edge: 2,
  edgeHit: 20,
  arrow: 5,
  ring: 2,
  ringGap: 0,
  initialSize: 20,
  initialGap: 4,
  initialDotRatio: 5,
  finalSize: 16,
  finalGap: 8,
  finalDot: 4,
  panelWidth: 360,
  narrow: 720,
  dim: 0.7,
  hover: 0.8,
}

export const MACHINE_EDGE_STYLE = { dash: '5 5', dashOffset: 2.5, nextDash: '5 5', drawMs: 900 }

export const MACHINE_MOTION = { ease: 'cubic-bezier(0, 0, .58, 1)', standard: '.15s' }

const GRAY = { 25: '#f5f7f7', 50: '#eff1f3', 100: '#dfe3e7', 200: '#ced1da', 300: '#bdc2cc', 400: '#9da1b1', 500: '#72758b', 600: '#606478', 700: '#4d4f5f', 800: '#2e2f3c', 850: '#1f1f29', 875: '#1a1a23', 900: '#15151d' }

const STATELY_BLUE = { 400: '#63a3fc', 500: '#0f6ee5', 600: '#005cde' }

const SELECTION = '#3178aa'

interface EntityTokens {
  fill: string
  border: string
  ink: string
  inkSoft: string
  edge: string
  edgeHover: string
  chip: string
  chipBorder: string
}

const ENTITY: Record<'light' | 'dark', Record<Exclude<MachineTone, 'gray'>, EntityTokens>> = {
  light: {
    blue: { fill: '#beeaf9', border: '#43abdf', ink: '#0a213d', inkSoft: '#20527f', edge: '#27699c', edgeHover: '#20527f', chip: '#dbf3fc', chipBorder: '#8fdbf8' },
    teal: { fill: '#c3eaee', border: '#48afc2', ink: '#0a2333', inkSoft: '#1c5572', edge: '#166d8b', edgeHover: '#1c5572', chip: '#def3f6', chipBorder: '#99dce7' },
    green: { fill: '#c9edbc', border: '#54b559', ink: '#0c2612', inkSoft: '#265a2f', edge: '#0f7528', edgeHover: '#265a2f', chip: '#e1f5da', chipBorder: '#a8df97' },
    yellow: { fill: '#fde283', border: '#da931e', ink: '#2e1e00', inkSoft: '#714700', edge: '#905900', edgeHover: '#714700', chip: '#feefbb', chipBorder: '#f9cb50' },
    orange: { fill: '#ffdeae', border: '#f18622', ink: '#3d1400', inkSoft: '#8a3500', edge: '#af4108', edgeHover: '#8a3500', chip: '#ffedd2', chipBorder: '#ffc77a' },
    red: { fill: '#f8dcd8', border: '#f17f7b', ink: '#300408', inkSoft: '#982020', edge: '#bd2b29', edgeHover: '#982020', chip: '#fbecea', chipBorder: '#f4c4c0' },
    pink: { fill: '#fdd7fd', border: '#f571d3', ink: '#44032f', inkSoft: '#95146b', edge: '#bd0c8b', edgeHover: '#95146b', chip: '#fee9fe', chipBorder: '#fbbdf8' },
    purple: { fill: '#edddfb', border: '#b092ee', ink: '#241257', inkSoft: '#5c31b9', edge: '#7245dc', edgeHover: '#5c31b9', chip: '#f5ecfd', chipBorder: '#dac9f7' },
  },
  dark: {
    blue: { fill: '#123153', border: '#20527f', ink: '#beeaf9', inkSoft: '#8fdbf8', edge: '#3178aa', edgeHover: '#43abdf', chip: '#102b49', chipBorder: '#20527f' },
    teal: { fill: '#103348', border: '#1c5572', ink: '#c3eaee', inkSoft: '#99dce7', edge: '#227c93', edgeHover: '#48afc2', chip: '#0e2d3f', chipBorder: '#1c5572' },
    green: { fill: '#14371c', border: '#265a2f', ink: '#c9edbc', inkSoft: '#a8df97', edge: '#29833b', edgeHover: '#54b559', chip: '#123019', chipBorder: '#265a2f' },
    yellow: { fill: '#432b00', border: '#714700', ink: '#fde283', inkSoft: '#f9cb50', edge: '#a06500', edgeHover: '#da931e', chip: '#3b2600', chipBorder: '#714700' },
    orange: { fill: '#561e00', border: '#8a3500', ink: '#ffdeae', inkSoft: '#ffc77a', edge: '#c14f0f', edgeHover: '#f18622', chip: '#4c1a00', chipBorder: '#8a3500' },
    red: { fill: '#5d1219', border: '#982020', ink: '#f8dcd8', inkSoft: '#f4c4c0', edge: '#d4332d', edgeHover: '#f17f7b', chip: '#521016', chipBorder: '#982020' },
    pink: { fill: '#5d0843', border: '#95146b', ink: '#fdd7fd', inkSoft: '#fbbdf8', edge: '#cf249b', edgeHover: '#f571d3', chip: '#52073b', chipBorder: '#95146b' },
    purple: { fill: '#341c79', border: '#5c31b9', ink: '#edddfb', inkSoft: '#dac9f7', edge: '#8355e5', edgeHover: '#b092ee', chip: '#2e196a', chipBorder: '#5c31b9' },
  },
}

export const MACHINE_PALETTE = {
  light: {
    canvas: GRAY[50],
    grid: `color-mix(in srgb, ${GRAY[100]} 55%, ${GRAY[50]})`,
    floating: '#fdfdfe',
    raised: GRAY[100],
    border: GRAY[100],
    borderStrong: GRAY[200],
    fg: GRAY[900],
    fgMuted: GRAY[700],
    stateFill: GRAY[100],
    stateBorder: GRAY[500],
    edge: GRAY[500],
    edgeHover: GRAY[700],
    edgeHalo: 'white',
    chip: GRAY[25],
    chipBorder: GRAY[200],
    chipFg: GRAY[900],
    selection: SELECTION,
    selectionHighlight: `color-mix(in srgb, ${SELECTION} 70%, transparent)`,
    runtime: STATELY_BLUE[600],
    primary: STATELY_BLUE[500],
    primaryText: STATELY_BLUE[600],
    focus: STATELY_BLUE[600],
    labelTone: '100%',
    labelOpacity: '25%',
    onPrimary: '#fff',
  },
  dark: {
    canvas: GRAY[900],
    grid: `color-mix(in srgb, ${GRAY[850]} 55%, ${GRAY[900]})`,
    floating: GRAY[850],
    raised: GRAY[800],
    border: '#ffffff1a',
    borderStrong: '#ffffff26',
    fg: GRAY[25],
    fgMuted: GRAY[400],
    stateFill: GRAY[800],
    stateBorder: GRAY[500],
    edge: GRAY[500],
    edgeHover: GRAY[400],
    edgeHalo: 'black',
    chip: GRAY[850],
    chipBorder: GRAY[700],
    chipFg: GRAY[100],
    selection: SELECTION,
    selectionHighlight: `color-mix(in srgb, ${SELECTION} 70%, transparent)`,
    runtime: STATELY_BLUE[400],
    primary: STATELY_BLUE[500],
    primaryText: STATELY_BLUE[400],
    focus: STATELY_BLUE[400],
    labelTone: '65%',
    labelOpacity: '50%',
    onPrimary: '#fff',
  },
}

type Palette = typeof MACHINE_PALETTE.light

type Mode = keyof typeof MACHINE_PALETTE

const cssName = (key: string): string => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const labelFill = (fill: string): string => `color-mix(in oklab, color-mix(in oklab, ${fill} var(--rm-label-tone), black) var(--rm-label-opacity), transparent)`

const TOKEN_NAMES = ['fill', 'border', 'ink', 'inkSoft', 'edge', 'edgeHover', 'chip', 'chipBorder'].map(cssName)

function vars(palette: Palette, mode: Mode): string {
  const base = Object.entries(palette).map(([k, v]) => `--rm-${cssName(k)}:${v};`)
  const tones = MACHINE_TONES.map((tone) => {
    const e: EntityTokens = tone === 'gray' ? { fill: palette.stateFill, border: palette.stateBorder, ink: palette.fg, inkSoft: `color-mix(in oklab, ${palette.fg} 85%, ${palette.canvas})`, edge: palette.edge, edgeHover: palette.edgeHover, chip: palette.chip, chipBorder: palette.chipBorder } : ENTITY[mode][tone]
    return Object.entries(e).map(([k, v]) => `--rm-${tone}-${cssName(k)}:${v};`).join('')
  })
  return [...base, ...tones, `color-scheme:${mode};`].join('')
}

const DARK_ROOTS = ['.dark .rmMachine', ':root[data-theme="dark"] .rmMachine']
const LIGHT_ROOTS = ['.light .rmMachine', ':root[data-theme="light"] .rmMachine']
const DARK_OWN = ['.rmMachine.rmMachine.dark', '.rmMachine.rmMachine[data-theme="dark"]']
const LIGHT_OWN = ['.rmMachine.rmMachine.light', '.rmMachine.rmMachine[data-theme="light"]']

export function machineCss(): string {
  const s = MACHINE_SIZE
  const f = MACHINE_FONT
  const m = MACHINE_MOTION
  const e = MACHINE_EDGE_STYLE
  const light = vars(MACHINE_PALETTE.light, 'light')
  const dark = vars(MACHINE_PALETTE.dark, 'dark')
  const toneRules = MACHINE_TONES.map((t) => `.rmMachine .rmTone${t[0].toUpperCase()}${t.slice(1)}{${TOKEN_NAMES.map((n) => `--rm-entity-${n}:var(--rm-${t}-${n});`).join('')}--rm-entity-label-fill:${labelFill(`var(--rm-${t}-fill)`)}}`).join('')
  return [
    `.rmMachine{${light}font-family:${f.sans};color:var(--rm-fg);background:var(--rm-canvas);border-radius:${s.radius + 2}px;overflow:hidden;position:relative;display:flex;min-height:120px}`,
    `@media (prefers-color-scheme: dark) {\n:root:not(.light):not([data-theme="light"]) .rmMachine {${dark}}\n}`,
    `${DARK_ROOTS.join(',')}{${dark}}`,
    `${LIGHT_ROOTS.join(',')}{${light}}`,
    `${DARK_OWN.join(',')}{${dark}}`,
    `${LIGHT_OWN.join(',')}{${light}}`,
    `.rmCanvas{flex:1;min-width:0;overflow:hidden;position:relative;background-color:var(--rm-canvas);background-image:linear-gradient(var(--rm-grid) 1px,transparent 1px),linear-gradient(90deg,var(--rm-grid) 1px,transparent 1px);background-size:${s.grid}px ${s.grid}px}`,
    `.rmCanvas svg{display:block;margin:0 auto;max-width:none}`,
    `.rmSvg{font-family:${f.sans}}`,
    `.rmGridLine{stroke:var(--rm-grid);stroke-width:1}`,
    `.rmBg{fill:var(--rm-canvas)}`,
    toneRules,
    `.rmMachine .rmUnvisited{${TOKEN_NAMES.map((n) => `--rm-entity-${n}:var(--rm-gray-${n});`).join('')}}`,
    `.rmMask{fill:var(--rm-canvas)}`,
    `.rmNodeBox{fill:var(--rm-entity-fill);stroke:var(--rm-entity-border);stroke-width:${s.border}}`,
    `.rmNode{cursor:pointer;transition:opacity ${m.standard} ${m.ease}}`,
    `.rmTitle{fill:var(--rm-entity-ink);font-size:${f.title.size}px;font-weight:${f.title.weight};letter-spacing:${f.title.tracking}}`,
    `.rmNote{fill:var(--rm-entity-ink-soft);font-size:${f.body.size}px;font-weight:${f.body.weight}}`,
    `.rmUnvisited .rmNote{fill:var(--rm-fg-muted)}`,
    `.rmChipBox{fill:var(--rm-entity-chip);stroke:var(--rm-entity-chip-border);stroke-width:1}`,
    `.rmChipText{fill:var(--rm-entity-ink);font-size:${f.chip.size}px;font-weight:${f.chip.weight}}`,
    `.rmChipNow .rmChipBox{fill:var(--rm-runtime);stroke:var(--rm-runtime)}`,
    `.rmChipNow .rmChipText{fill:var(--rm-on-primary)}`,
    `.rmRing{fill:none;stroke:var(--rm-selection-highlight);stroke-width:${s.ring}}`,
    `.rmInitial{fill:var(--rm-edge)}`,
    `.rmInitialPath{fill:none;stroke:var(--rm-edge);stroke-width:${s.edge}}`,
    `.rmFinal{fill:none;stroke:var(--rm-entity-ink);stroke-width:2}`,
    `.rmFinalDot{fill:var(--rm-entity-ink)}`,
    `.rmEdgePath{fill:none;stroke:var(--rm-edge);stroke-width:${s.edge};stroke-linejoin:round;transition:stroke ${m.standard} ${m.ease}}`,
    `.rmEdgeHit{fill:none;stroke:transparent;stroke-width:${s.edgeHit};stroke-linecap:square}`,
    `.rmEdge:hover .rmEdgePath{stroke:var(--rm-edge-hover)}`,
    `.rmEdge:hover .rmArrow{fill:var(--rm-edge-hover)}`,
    `.rmTaken .rmEdgePath{stroke:var(--rm-runtime)}`,
    `.rmNext .rmEdgePath{stroke:var(--rm-primary);stroke-dasharray:${e.nextDash};stroke-dashoffset:${e.dashOffset};animation:rmDash ${e.drawMs}ms linear infinite}`,
    `.rmDashed .rmEdgePath{stroke-dasharray:${e.dash};stroke-dashoffset:${e.dashOffset}}`,
    `@keyframes rmDash{to{stroke-dashoffset:-${20 - e.dashOffset}}}`,
    `@media (prefers-reduced-motion: reduce){.rmNext .rmEdgePath{animation:none}}`,
    `.rmArrow{fill:var(--rm-edge)}`,
    `.rmArrowTaken{fill:var(--rm-runtime)}`,
    `.rmArrowNext{fill:var(--rm-primary)}`,
    `.rmPillBox{fill:${labelFill('var(--rm-state-fill)')};stroke:var(--rm-edge);stroke-width:${s.pillBorder}}`,
    `.rmDashed .rmPillBox{stroke-dasharray:${e.dash}}`,
    `.rmEdge:hover .rmPillBox{stroke:var(--rm-edge-hover)}`,
    `.rmTaken .rmPillBox{stroke:var(--rm-runtime)}`,
    `.rmNext .rmPillBox{stroke:var(--rm-primary)}`,
    `.rmPillText{fill:var(--rm-fg);font-size:${f.pill.size}px;font-weight:${f.pill.weight}}`,
    `.rmPillTool{fill:var(--rm-primary-text);font-family:${f.mono};font-size:${f.tool.size}px;font-weight:${f.tool.weight}}`,
    `.rmPillMeta{fill:var(--rm-fg-muted);font-size:${f.tool.size}px;font-weight:${f.tool.weight}}`,
    `.rmMarkBox{fill:var(--rm-fg);stroke:none}`,
    `.rmMarkText{fill:var(--rm-canvas);font-size:${f.mark.size}px;font-weight:${f.mark.weight};letter-spacing:.02em}`,
    `.rmToggles{position:absolute;left:12px;top:44px;flex-wrap:wrap;max-width:calc(100% - 24px);display:flex;gap:2px;background:var(--rm-floating);border:1px solid var(--rm-border);border-radius:${s.radius + 2}px;padding:2px;font-size:12px;font-weight:500;line-height:16px;z-index:1}`,
    `.rmToggles button{all:unset;cursor:pointer;padding:4px 8px;border-radius:${s.radius}px;color:var(--rm-fg-muted);display:inline-flex;gap:4px;align-items:center}`,
    `.rmToggles button[aria-pressed="true"]{background:var(--rm-raised);color:var(--rm-fg)}`,
    `.rmToggles button:disabled{opacity:.4;cursor:default}`,
    `.rmToggles small{font-size:11px;color:var(--rm-fg-muted);font-variant-numeric:tabular-nums}`,
    `.rmAccounts{position:absolute;left:12px;display:flex;flex-wrap:wrap;gap:4px;max-width:calc(100% - 24px);font-size:12px;line-height:16px;z-index:1}`,
    `.rmAccounts span{background:var(--rm-floating);border:1px solid var(--rm-border-strong);border-radius:${s.radius}px;padding:2px 6px;color:var(--rm-fg)}`,
    `.rmAccounts span[data-link="suggested"]{border-style:dashed;color:var(--rm-fg-muted)}`,
    `.rmAccounts b{font-weight:600;margin-right:4px}`,
    `.rmMachine[data-selected] .rmNode,.rmMachine[data-selected] .rmEdge{opacity:${s.dim}}`,
    `.rmMachine[data-selected] .rmNear{opacity:1}`,
    `.rmNode:hover{opacity:${s.hover}}`,
    `.rmMachine[data-selected] .rmNear.rmNode:hover{opacity:1}`,
    `.rmNode:focus{outline:none}`,
    `.rmNode:focus-visible .rmFrame,.rmNode:focus-visible .rmNodeBox{stroke:var(--rm-focus)}`,
    `.rmPanel{width:${s.panelWidth}px;flex:none;background:var(--rm-floating);border-left:1px solid var(--rm-border);padding:16px;display:flex;flex-direction:column;gap:12px;font-size:13px}`,
    `.rmPanel h3{margin:0;font-size:14px;font-weight:600;color:var(--rm-fg)}`,
    `.rmPanelKind{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--rm-fg-muted)}`,
    `.rmField{display:flex;flex-direction:column;gap:4px}`,
    `.rmField label{font-size:12px;font-weight:500;color:var(--rm-fg-muted)}`,
    `.rmField div{border:1px solid var(--rm-border-strong);border-radius:${s.radius}px;padding:6px 8px;min-height:28px;background:var(--rm-canvas);color:var(--rm-fg);line-height:1.4}`,
    `.rmMoves{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}`,
    `.rmMoves li{border:1px solid var(--rm-border-strong);border-radius:${s.radius}px;padding:6px 8px;display:flex;flex-direction:column;gap:2px}`,
    `.rmMoves li[data-next="true"]{border:2px solid var(--rm-primary)}`,
    `.rmMoves code{font-family:${f.mono};font-size:11px;color:var(--rm-primary-text)}`,
    `.rmMoves small{color:var(--rm-fg-muted)}`,
    `.rmBar{position:absolute;left:12px;bottom:12px;display:flex;gap:4px;background:var(--rm-floating);border:1px solid var(--rm-border);border-radius:${s.radius + 2}px;padding:3px;font-size:12px}`,
    `.rmBar button{all:unset;cursor:pointer;padding:3px 8px;border-radius:${s.radius}px;color:var(--rm-fg)}`,
    `.rmBar button[aria-pressed="true"]{background:var(--rm-primary);color:var(--rm-on-primary)}`,
    `.rmCrumb{position:absolute;left:12px;top:12px;background:var(--rm-floating);border:1px solid var(--rm-border);border-radius:${s.radius}px;padding:3px 8px;font-size:13px;color:var(--rm-fg-muted)}`,
    `.rmCrumb b{color:var(--rm-fg);font-weight:500}`,
    `@media (max-width:${s.narrow}px){.rmMachine{flex-direction:column}.rmPanel{width:auto;border-left:0;border-top:1px solid var(--rm-border)}}`,
    `@media (forced-colors: active){.rmEdgePath{stroke:CanvasText}.rmNodeBox,.rmFrame{stroke:CanvasText}}`,
  ].join('\n')
}
