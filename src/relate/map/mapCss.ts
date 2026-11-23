export function mapCss(): string {
  return `/* Tokens harvested from the signed-in stately editor:
   docs/decisions/relateApp/tokens.css + statelyEditorExact.md */
:root{
  --rm-font:Satoshi,Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  --rm-title:15px/22.5px; --rm-body:13px/19.5px; --rm-action:12px/18px;
  --rm-radius:4px; --rm-pill-radius:20px; --rm-grid:24px; --rm-edge-width:2px;
  --rm-blue-dot:#43abdf; --rm-teal-dot:#48afc2; --rm-green-dot:#54b559;
  --rm-yellow-dot:#da931e; --rm-orange-dot:#f18622; --rm-red-dot:#f17f7b;
  --rm-pink-dot:#f571d3; --rm-purple-dot:#b092ee;
}
.rmMachine.light,.rmMachine{
  --rm-canvas:rgb(245,246,250); --rm-grid-line:rgb(233,241,250); --rm-floating:#fff;
  --rm-raised:#ecedf4; --rm-border:rgb(193,196,215); --rm-border-strong:#a5a9c0;
  --rm-fg:rgb(26,28,40); --rm-fg-muted:rgb(100,105,135); --rm-faint:#868ba7;
  --rm-node-header:rgb(255,255,255); --rm-node-body:rgb(243,245,251);
  --rm-node-border:rgba(26,28,40,.06); --rm-node-shadow:rgba(26,28,40,.1);
  --rm-node-name:rgb(26,28,40); --rm-node-name-weight:600;
  --rm-node-desc:rgb(26,28,40); --rm-node-meta:rgba(0,0,0,.64);
  --rm-action-bg:rgb(236,237,244); --rm-action-border:rgba(134,139,167,.36);
  --rm-action-ink:rgb(26,28,40); --rm-action-sub:rgb(70,74,98);
  --rm-action-shadow:rgba(0,0,0,.05);
  --rm-chip:rgb(236,237,244); --rm-chip-border:rgba(134,139,167,.36); --rm-chip-fg:rgb(26,28,40);
  --rm-edge:rgb(167,171,192); --rm-primary:#0f6ee5; --rm-primary-text:#005cde;
  --rm-on-primary:#fff; --rm-active:rgb(77,169,85); --rm-selection:#3178aa;
  --rm-selection-highlight:color-mix(in srgb,#3178aa 70%,transparent);
  --rm-pill-ring:rgba(0,0,0,.08); --rm-pill-drop:rgba(0,0,0,.06); --rm-pill-inset:#fff;
  --rm-pill-shadow:rgb(255,255,255) 0 .5px 0 0 inset,rgba(0,0,0,.08) 0 0 0 1px,rgba(0,0,0,.06) 0 1px 0 0,rgba(0,0,0,.04) 0 2px 2px 0;
  color-scheme:light;
}
.rmMachine.dark{
  --rm-canvas:rgb(16,17,25); --rm-grid-line:rgb(24,25,34); --rm-floating:#1a1c28;
  --rm-raised:#2d3143; --rm-border:rgba(255,255,255,.16); --rm-border-strong:rgba(255,255,255,.24);
  --rm-fg:rgb(236,237,244); --rm-fg-muted:rgb(165,169,192); --rm-faint:#868ba7;
  --rm-node-header:rgb(45,49,67); --rm-node-body:rgb(17,18,27);
  --rm-node-border:rgba(255,255,255,.16); --rm-node-shadow:rgba(0,0,0,.45);
  --rm-node-name:rgb(255,255,255); --rm-node-name-weight:500;
  --rm-node-desc:rgb(236,237,244); --rm-node-meta:rgba(255,255,255,.64);
  --rm-action-bg:rgb(26,28,40); --rm-action-border:rgba(100,105,135,.36);
  --rm-action-ink:rgb(217,219,232); --rm-action-sub:rgb(165,169,192);
  --rm-action-shadow:rgba(0,0,0,.118);
  --rm-chip:rgb(26,28,40); --rm-chip-border:rgba(100,105,135,.36); --rm-chip-fg:rgb(217,219,232);
  --rm-edge:rgb(54,57,76); --rm-primary:#63a3fc; --rm-primary-text:#63a3fc;
  --rm-on-primary:#0d0d0d; --rm-active:rgb(77,168,82); --rm-selection:#3178aa;
  --rm-selection-highlight:color-mix(in srgb,#3178aa 70%,transparent);
  --rm-pill-ring:rgba(255,255,255,.12); --rm-pill-drop:rgba(0,0,0,.1); --rm-pill-inset:rgba(255,255,255,.12);
  --rm-pill-shadow:rgba(0,0,0,.45) 0 0 2px 0,rgba(255,255,255,.12) 0 .5px 0 0 inset,rgba(0,0,0,.08) 0 0 0 1px,rgba(0,0,0,.1) 0 1px 0 0,rgba(0,0,0,.06) 0 2px 2px 0;
  color-scheme:dark;
}
*{box-sizing:border-box}
.rmPanel[hidden]{display:none!important}
.rmPanelClose{all:unset;cursor:pointer;float:right;font-size:16px;line-height:16px;color:var(--rm-fg-muted)}
.rmCanvas,.rmPanel,.rmFallback{scrollbar-width:none;-ms-overflow-style:none}
.rmCanvas::-webkit-scrollbar,.rmPanel::-webkit-scrollbar,.rmFallback::-webkit-scrollbar{width:0;height:0;display:none}

.rmMachine{display:flex;min-height:520px;background:var(--rm-canvas);color:var(--rm-fg);border-radius:var(--rm-radius);overflow:hidden;position:relative}
.rmCanvas{flex:1;min-width:0;position:relative;overflow:auto;background-color:var(--rm-canvas);
  background-image:linear-gradient(var(--rm-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--rm-grid-line) 1px,transparent 1px);
  background-size:var(--rm-grid) var(--rm-grid)}
.rmSurface{position:relative;width:1900px;height:2200px;zoom:var(--zoom,.62)}
.rmSurface svg{position:absolute;inset:0;width:1900px;height:2200px;pointer-events:none}
.rmCrumb{position:sticky;left:12px;top:12px;z-index:5;display:inline-block;background:var(--rm-floating);
  border:1px solid var(--rm-border);border-radius:var(--rm-radius);padding:3px 8px;color:var(--rm-fg-muted)}
.rmCrumb b{color:var(--rm-fg);font-weight:600}
.rmBar{position:fixed;left:12px;bottom:12px;z-index:6;display:inline-flex;gap:4px;align-items:center;
  flex-wrap:nowrap;white-space:nowrap;height:32px;box-sizing:border-box;
  background:var(--rm-floating);border:1px solid var(--rm-border);border-radius:var(--rm-radius);padding:3px;margin:0;
  box-shadow:0 4px 16px rgba(0,0,0,.14);max-width:calc(100vw - 24px);overflow-x:auto;scrollbar-width:none}
.rmBar::-webkit-scrollbar{display:none}
.rmBar button{all:unset;cursor:pointer;padding:3px 8px;border-radius:var(--rm-radius);color:var(--rm-fg-muted);font-size:12px}
.rmBar button:hover{background:var(--rm-raised);color:var(--rm-fg)}
.rmBar button[aria-pressed="true"]{background:var(--rm-primary);color:var(--rm-on-primary)}
.rmBar #zoomLabel{font-size:11px;color:var(--rm-fg-muted);font-variant-numeric:tabular-nums;padding:0 4px;min-width:38px;text-align:center}
.rmBar .sep{width:1px;height:16px;background:var(--rm-border);margin:0 2px}
.rmBar .dot{width:8px;height:8px;border-radius:50%;border:1px solid var(--rm-border-strong);display:inline-block;margin-right:5px}
/* Stately graph-node geometry, verbatim from the harvested measurements */
.rmNode{position:absolute;width:232px;border:1px solid var(--rm-border);border-radius:var(--rm-radius);
  background:var(--rm-node-body);box-shadow:0 2px 8px var(--rm-node-shadow);cursor:pointer;overflow:hidden;
  transition:box-shadow .15s,opacity .15s}
.rmNode:focus{outline:none}
.rmNode:focus-visible{outline:3px solid var(--rm-selection);outline-offset:1px}
.rmLip{height:2px;background:color-mix(in srgb,var(--tone) 45%,white);
  border-bottom:1px solid color-mix(in srgb,var(--tone) 65%,white);border-radius:4px 4px 0 0}
.rmRingBanner{height:22px;padding:3px 12px;display:flex;align-items:center;border-radius:0;
  background:var(--tone);border-bottom:1px solid var(--tone);
  font-size:10px;line-height:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#101119}
.rmTalkStrip{height:20px;padding:2px 12px;display:flex;align-items:center;gap:6px;
  background:var(--rm-active);color:#101119;font-size:10px;line-height:14px;letter-spacing:.02em;
  border-bottom:1px solid color-mix(in srgb,var(--rm-active) 70%,#101119)}
.rmTalkStrip b{font-weight:700;letter-spacing:.05em}
.rmTalkStrip span{font-weight:500}
.rmNodeHeader{height:42px;padding:8px 12px;display:flex;align-items:center;gap:6px;cursor:grab;
  background:var(--rm-node-header);border-top:1px solid var(--rm-border);border-radius:0}
.rmAvatar{width:26px;height:26px;border-radius:50%;border:1px solid var(--rm-border);object-fit:cover;flex:none;background:var(--rm-raised)}
.rmPlatformGallery{display:flex;gap:4px;flex-wrap:wrap}
.rmFloat[hidden]{display:none!important}
.rmFloat{position:fixed;z-index:9999;pointer-events:none;display:flex;flex-direction:column;gap:2px;
  background:var(--rm-floating,#fff);border:1px solid var(--rm-border,#c1c4d7);border-radius:4px;
  padding:6px 10px;box-shadow:0 6px 20px rgba(0,0,0,.16);font:12px/18px var(--rm-font,Satoshi,sans-serif);
  color:var(--rm-fg,#1a1c28);max-width:240px}
.rmFloat b{font-weight:600}
.rmFloat small{color:var(--rm-fg-muted,#646987);font-size:11px}
.rmAvatarBtn{cursor:pointer}
.rmPlatformChip:focus-visible{outline:2px solid var(--rm-selection,#3178aa);outline-offset:1px}
.rmLogo{width:14px;height:14px;display:block;flex:none}
.rmMachine.dark .rmLogo{filter:invert(1)}
.rmPlatformChip{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;
  padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;
  color:var(--rm-chip-fg);font-size:10px;line-height:16px;font-weight:700;letter-spacing:.02em}
.rmToneDot{width:9px;height:9px;border-radius:50%;background:var(--dot,transparent);border:1px solid var(--rm-border-strong);flex:none}
.rmNodeName{font-size:15px;line-height:22.5px;font-weight:var(--rm-node-name-weight);color:var(--rm-node-name);flex:1;white-space:nowrap}
.rmRingChip{font-size:11px;line-height:16px;font-weight:600;color:var(--rm-chip-fg);background:var(--rm-chip);
  border:1px solid var(--rm-chip-border);border-radius:4px;padding:0 5px}
.rmNodeBody{padding:12px 16px;display:flex;flex-direction:column;gap:6px;background:var(--rm-node-body)}
.rmDesc{font-size:13px;line-height:19.5px;color:var(--rm-node-desc)}
.rmNodeBody{padding:6px}
.rmSection{border:1px solid var(--rm-border);border-radius:var(--rm-radius);overflow:hidden;background:var(--rm-canvas)}
.rmSectionHead{height:22px;padding:3px 8px;display:flex;align-items:center;cursor:pointer;user-select:none;background:var(--rm-node-header);
  border-bottom:1px solid var(--rm-border);font-size:10px;line-height:14px;font-weight:700;
  letter-spacing:.04em;text-transform:uppercase;color:var(--rm-fg-muted)}
.rmSectionBody{padding:6px 8px;display:flex;flex-direction:column;gap:4px}
.rmRooms{display:flex;flex-direction:column;gap:5px}
.rmRoomBox{border:1px solid var(--rm-border);border-radius:var(--rm-radius);background:var(--rm-canvas);padding:5px 7px;display:flex;flex-direction:column;gap:4px}
.rmRoomHead{display:flex;align-items:center;gap:5px}
.rmRoomHead b{font-size:12px;line-height:16px;font-weight:600;color:var(--rm-node-desc)}
.rmRoomInner{display:flex;gap:6px;align-items:flex-start}
.rmMember{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:22px}
.rmMemberAvatar{cursor:pointer}
.rmMember em{font-size:9px;line-height:11px;font-style:normal;color:var(--rm-fg-muted);max-width:34px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rmRoomBox>small{font-size:11px;line-height:14px;color:var(--rm-fg-muted)}
.rmRoomShape{display:inline-flex;align-items:center;flex:none;margin-top:1px}
.rmMiniAvatar{width:16px;height:16px;border-radius:50%;border:1px solid var(--rm-border);object-fit:cover;background:var(--rm-raised)}
.rmStack{display:inline-flex;align-items:center}
.rmStack .rmMiniAvatar+.rmMiniAvatar{margin-left:-6px}
.rmHash{font-size:11px;line-height:14px;font-weight:700;color:var(--rm-fg-muted);margin-left:2px}
.rmRoomRow{display:flex;gap:5px;align-items:flex-start}
.rmRoomRow .rmLogo{margin-top:2px}
.rmRoomText{display:flex;flex-direction:column;gap:0}
.rmRoomText b{font-size:12px;line-height:16px;font-weight:600;color:var(--rm-node-desc)}
.rmRoomText small{font-size:11px;line-height:15px;color:var(--rm-fg-muted)}
.rmMeta{font-size:12px;line-height:18px;color:var(--rm-node-meta)}
.rmQuote{font-size:12px;line-height:18px;color:var(--rm-fg-muted);font-style:italic}
.rmAction{width:100%;align-self:stretch;background:var(--rm-action-bg);border:1px solid var(--rm-action-border);border-radius:var(--rm-radius);
  padding:4px 8px;font-size:12px;line-height:18px;font-style:italic;color:var(--rm-action-ink);
  box-shadow:0 3px 6px -3px var(--rm-action-shadow),0 2px 4px -2px var(--rm-action-shadow),0 1px 2px -1px var(--rm-action-shadow)}
.rmNode.dim{opacity:.16}
.rmNode.selected{outline:3px solid var(--rm-selection);outline-offset:1px;
  box-shadow:0 0 0 var(--rm-selection-highlight),0 2px 8px var(--rm-node-shadow)}
.rmRingGroup,.rmRingLabelBox,.rmRingLabelText{pointer-events:all;cursor:move}
.rmRingGroup{fill:none;stroke-width:1.5;stroke-dasharray:6 4;opacity:.75}
.rmRingLabelBox{fill:var(--rm-floating);stroke-width:1}
.rmRingLabelText{font-size:11px;font-weight:700;letter-spacing:.03em}
.rmEdgePath{fill:none;stroke:var(--rm-edge);stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
.rmEdge.shared .rmEdgePath{stroke-dasharray:5 5;opacity:.65}
.rmEdge.dim{opacity:.12}
.rmPath .rmEdgePath{stroke:var(--rm-primary);stroke-width:2.5;opacity:1;stroke-dasharray:none}
.rmArrow{fill:var(--rm-edge)}
.rmPath .rmArrow{fill:var(--rm-primary)}
.rmPillBox{fill:var(--rm-floating);stroke:var(--rm-pill-ring)}
.rmPillText{fill:var(--rm-event,var(--rm-node-desc));font-size:12px;font-weight:600}
.rmPanel{position:static;width:360px;flex:0 0 360px;max-width:360px;align-self:stretch;
  background:var(--rm-floating);border-left:1px solid var(--rm-border);
  padding:16px;display:flex;flex-direction:column;gap:12px;overflow:auto;height:auto}
.rmPanel.collapsed{width:40px;min-width:40px;max-width:40px;flex-basis:40px;height:40px;max-height:40px;
  padding:10px 0;align-items:center;overflow:hidden}
.rmPanel.collapsed>*:not(.rmPanelKind){display:none}
.rmPanel.collapsed .rmPanelKind>*:not(.rmPanelClose){display:none}
.rmPanel.collapsed .rmPanelClose{float:none;font-size:18px;line-height:18px}
.rmPanelKind{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--rm-fg-muted)}
.rmPanel h2{margin:0;font:var(--rm-title);font-weight:600}
.rmField{display:flex;flex-direction:column;gap:4px}
.rmField>label{font-size:12px;font-weight:500;color:var(--rm-fg-muted)}
.rmField>div,.rmField>ul{margin:0;border:1px solid var(--rm-border);border-radius:var(--rm-radius);padding:8px 12px;
  min-height:28px;background:var(--rm-canvas);color:var(--rm-fg)}
.rmField>ul{list-style:none;display:flex;flex-direction:column;gap:8px}
.rmField li{border-bottom:1px solid var(--rm-border);padding-bottom:6px}
.rmField li:last-child{border-bottom:0;padding-bottom:0}
.rmPanel .rmField>div small{display:block;font-size:11px;line-height:16px;font-style:italic;color:var(--rm-fg-muted)}
.rmField li small{display:block;color:var(--rm-fg-muted);font-size:12px;line-height:18px}
.rmTag{display:inline-block;border:1px solid var(--rm-chip-border);border-radius:var(--rm-radius);padding:1px 6px;
  background:var(--rm-chip);font-size:11px;margin:0 4px 4px 0;color:var(--rm-chip-fg)}
.rmWhy>div{border-color:var(--rm-primary)!important}
.rmLabel{display:inline-block;font-size:10px;line-height:14px;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;color:var(--rm-fg-muted);margin-right:6px}
.rmFacts{display:flex;flex-direction:column;gap:4px;border-top:1px solid var(--rm-border);padding-top:6px}
.rmFactProse{font-size:12px;line-height:18px;color:var(--rm-node-desc)}
.rmFactProse small{display:block;font-size:11px;line-height:16px;font-style:italic;color:var(--rm-fg-muted)}
.rmFact{font-size:12px;line-height:18px;color:var(--rm-node-desc)}
.rmFact b{font-weight:600}
.rmFact small{display:block;color:var(--rm-fg-muted);font-size:11px;line-height:16px;font-style:italic}
.rmNone{font-size:11px;line-height:16px;color:var(--rm-fg-muted);font-style:italic}
@media(max-width:960px){.rmMachine{flex-direction:column}}
@media (prefers-color-scheme: dark){:root:not(.light):not([data-theme="light"]) .rmMachine:not(.light):not(.dark){
  --rm-canvas:rgb(16,17,25); --rm-grid-line:rgb(24,25,34); --rm-floating:#1a1c28;
  --rm-raised:#2d3143; --rm-border:rgba(255,255,255,.16); --rm-border-strong:rgba(255,255,255,.24);
  --rm-fg:rgb(236,237,244); --rm-fg-muted:rgb(165,169,192); --rm-faint:#868ba7;
  --rm-node-header:rgb(45,49,67); --rm-node-body:rgb(17,18,27);
  --rm-node-border:rgba(255,255,255,.16); --rm-node-shadow:rgba(0,0,0,.45);
  --rm-node-name:rgb(255,255,255); --rm-node-name-weight:500;
  --rm-node-desc:rgb(236,237,244); --rm-node-meta:rgba(255,255,255,.64);
  --rm-action-bg:rgb(26,28,40); --rm-action-border:rgba(100,105,135,.36);
  --rm-action-ink:rgb(217,219,232); --rm-action-sub:rgb(165,169,192);
  --rm-action-shadow:rgba(0,0,0,.118);
  --rm-chip:rgb(26,28,40); --rm-chip-border:rgba(100,105,135,.36); --rm-chip-fg:rgb(217,219,232);
  --rm-edge:rgb(54,57,76); --rm-primary:#63a3fc; --rm-primary-text:#63a3fc;
  --rm-on-primary:#0d0d0d; --rm-active:rgb(77,168,82); --rm-selection:#3178aa;
  --rm-selection-highlight:color-mix(in srgb,#3178aa 70%,transparent);
  --rm-pill-ring:rgba(255,255,255,.12); --rm-pill-drop:rgba(0,0,0,.1); --rm-pill-inset:rgba(255,255,255,.12);
  --rm-pill-shadow:rgba(0,0,0,.45) 0 0 2px 0,rgba(255,255,255,.12) 0 .5px 0 0 inset,rgba(0,0,0,.08) 0 0 0 1px,rgba(0,0,0,.1) 0 1px 0 0,rgba(0,0,0,.06) 0 2px 2px 0;
  color-scheme:dark;
}}`;
}
