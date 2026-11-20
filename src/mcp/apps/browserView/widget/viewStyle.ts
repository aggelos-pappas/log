export const FRAME_STYLE_ID = "lbvStyle";

const LIGHT = "--lbvD-bg:#ffffff;--lbvD-panel:#f8fafc;--lbvD-stage:#f1f5f9;--lbvD-line:#e2e8f0;--lbvD-text:#0f172a;--lbvD-muted:#64748b;--lbvD-ok:#047857;--lbvD-ok-bg:#ecfdf5;--lbvD-ok-dot:#10b981;--lbvD-stop:#b91c1c;--lbvD-stop-bg:#fef2f2;--lbvD-accent:#2A8CFF;--lbvD-accent-text:#ffffff;--lbvD-hover:rgba(148,163,184,.22);--lbvD-shade:rgba(255,255,255,.85);color-scheme:light";
const DARK = "--lbvD-bg:#0f1115;--lbvD-panel:#171a21;--lbvD-stage:#12151b;--lbvD-line:#2a2f3a;--lbvD-text:#e6e8ec;--lbvD-muted:#9aa3b2;--lbvD-ok:#6ee7b7;--lbvD-ok-bg:#0d2a22;--lbvD-ok-dot:#34d399;--lbvD-stop:#fca5a5;--lbvD-stop-bg:#2c1215;--lbvD-accent:#4FA6FF;--lbvD-accent-text:#0f1115;--lbvD-hover:rgba(148,163,184,.16);--lbvD-shade:rgba(15,17,21,.85);color-scheme:dark";

export const FRAME_CSS = `
.lbv{${LIGHT}}
:root[data-theme="dark"] .lbv,:root.dark .lbv,.lbv[data-theme="dark"]{${DARK}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]):not(.light) .lbv:not([data-theme="light"]){${DARK}}}
.lbv{--lbvBg:var(--color-background-primary,var(--lbvD-bg));--lbvPanel:var(--color-background-secondary,var(--lbvD-panel));--lbvStage:var(--color-background-tertiary,var(--lbvD-stage));--lbvLine:var(--color-border-primary,var(--lbvD-line));--lbvText:var(--color-text-primary,var(--lbvD-text));--lbvMuted:var(--color-text-secondary,var(--lbvD-muted));--lbvOk:var(--color-text-success,var(--lbvD-ok));--lbvOk-bg:var(--color-background-success,var(--lbvD-ok-bg));--lbvStop:var(--color-text-danger,var(--lbvD-stop));--lbvStop-bg:var(--color-background-danger,var(--lbvD-stop-bg));--lbvAccent:var(--color-ring-primary,var(--lbvD-accent));--lbvFont:var(--font-sans,"Satoshi",Inter,system-ui,-apple-system,"Segoe UI",sans-serif);--lbvRadius:var(--border-radius-xl,16px);--lbvRadius-sm:var(--border-radius-md,8px)}
.lbv{box-sizing:border-box;display:flex;flex-direction:column;min-width:0;border:1px solid var(--lbvLine);border-radius:var(--lbvRadius);overflow:hidden;background:var(--lbvBg);color:var(--lbvText);font-family:var(--lbvFont);font-size:14px;line-height:1.4;-webkit-font-smoothing:antialiased}
.lbv *,.lbv *::before,.lbv *::after{box-sizing:border-box}
.lbv [hidden]{display:none!important}
.lbv button{font:inherit}
.lbvHead{padding:12px 16px;background:var(--lbvPanel);border-bottom:1px solid var(--lbvLine)}
.lbvBar{display:flex;align-items:center;gap:10px;min-width:0}
.lbvMark{display:flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;border-radius:var(--lbvRadius-sm);background:var(--lbvText);color:var(--lbvBg)}
.lbvMark svg{width:15px;height:15px}
.lbvWho{display:flex;align-items:baseline;gap:8px;min-width:0;flex:1}
.lbvWho strong{font-size:15px;font-weight:700;white-space:nowrap}
.lbvWho span{font-size:13px;color:var(--lbvMuted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbvBadge{display:inline-flex;align-items:center;gap:6px;flex:none;border:1px solid var(--lbvLine);border-radius:var(--lbvRadius-sm);background:var(--lbvBg);padding:2px 8px;font-size:12px;font-weight:700;color:var(--lbvMuted)}
.lbvBadge img{width:14px;height:14px;object-fit:contain}
.lbvPill{display:inline-flex;align-items:center;gap:6px;flex:none;border-radius:var(--lbvRadius-sm);padding:4px 9px;font-size:12px;font-weight:700;background:var(--lbvHover,var(--lbvD-hover));color:var(--lbvMuted);white-space:nowrap}
.lbvPill i{width:6px;height:6px;border-radius:50%;background:currentColor}
.lbvPill[data-tone="live"]{background:var(--lbvOk-bg);color:var(--lbvOk)}
.lbvPill[data-tone="live"] i{background:var(--lbvD-ok-dot);animation:lbvPulse 1.6s ease-in-out infinite}
.lbvPill[data-tone="stop"]{background:var(--lbvStop-bg);color:var(--lbvStop)}
.lbvTools{display:flex;align-items:center;gap:2px;flex:none}
.lbvIcon{display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex:none;border:0;border-radius:var(--lbvRadius-sm);background:transparent;color:var(--lbvMuted);cursor:pointer}
.lbvIcon:hover:not(:disabled){background:var(--lbvD-hover);color:var(--lbvText)}
.lbvIcon:disabled{opacity:.3;cursor:not-allowed}
.lbvIcon svg{width:15px;height:15px}
.lbvIcon[data-spin="true"] svg{animation:lbvSpin .9s linear infinite}
.lbvNav{display:flex;align-items:center;gap:6px;margin-top:10px}
.lbvAddress{display:flex;align-items:center;gap:8px;flex:1;min-width:0;height:34px;padding:0 12px;border:1px solid var(--lbvLine);border-radius:var(--lbvRadius-sm);background:var(--lbvBg);font-size:13px;color:var(--lbvMuted)}
.lbvAddress svg{width:12px;height:12px;flex:none;opacity:.7}
.lbvAddress span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbvStage{position:relative;display:flex;align-items:center;justify-content:center;min-height:300px;margin:14px;border:1px solid var(--lbvLine);border-radius:12px;background:var(--lbvStage);overflow:hidden;flex:1}
.lbvCanvas{display:block;width:100%;height:auto;outline:none;visibility:hidden}
.lbvCanvas[data-live="true"]{visibility:visible}
.lbvCanvas[data-input="true"]{cursor:pointer}
.lbvStage:focus-within .lbvCanvas[data-input="true"]{box-shadow:0 0 0 3px var(--lbvAccent)}
.lbvFrame{position:absolute;inset:0;width:100%;height:100%;border:0}
.lbvKeys{position:absolute;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;resize:none;pointer-events:none}
.lbvTake{position:absolute;left:50%;top:16px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;border:1px solid var(--lbvLine);border-radius:var(--lbvRadius-sm);background:var(--lbvBg);padding:9px 16px;font-size:13px;font-weight:700;color:var(--lbvText);box-shadow:0 4px 14px rgba(0,0,0,.18);cursor:pointer;white-space:nowrap}
.lbvTake svg{width:13px;height:13px;color:var(--lbvAccent)}
.lbvCover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;background:var(--lbvStage)}
.lbvCover[data-shade="true"]{background:var(--lbvD-shade)}
.lbvCover svg{width:30px;height:30px;color:var(--lbvMuted)}
.lbvCover h2{margin:0;font-size:15px;font-weight:700;color:var(--lbvText)}
.lbvCover p{margin:0;max-width:440px;font-size:14px;line-height:1.55;color:var(--lbvMuted)}
.lbvCoverActions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.lbvSpin{width:26px;height:26px;border-radius:50%;border:3px solid var(--lbvLine);border-top-color:var(--lbvAccent);animation:lbvSpin .9s linear infinite}
.lbvNote{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);max-width:calc(100% - 24px);margin:0;border-radius:var(--lbvRadius-sm);background:var(--lbvText);padding:6px 12px;font-size:12px;font-weight:700;color:var(--lbvBg);text-align:center;opacity:.92}
.lbvToast{position:absolute;right:12px;top:12px;max-width:min(360px,calc(100% - 24px));border-radius:12px;background:var(--lbvText);color:var(--lbvBg);padding:10px 12px;font-size:13px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.lbvToast strong{display:block;font-weight:700}
.lbvFoot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-top:1px solid var(--lbvLine);background:var(--lbvBg)}
.lbvStatus{display:flex;align-items:center;gap:8px;min-width:0;margin:0;font-size:13px;color:var(--lbvMuted)}
.lbvStatus span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lbvStatus svg{width:15px;height:15px;flex:none}
.lbvStatus[data-tone="busy"] svg{color:var(--lbvAccent);animation:lbvSpin .9s linear infinite}
.lbvStatus[data-tone="ok"] svg{color:var(--lbvOk)}
.lbvStatus[data-tone="stop"] svg{color:var(--lbvStop)}
.lbvActions{display:flex;flex-wrap:wrap;gap:8px}
.lbvButton{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:34px;padding:0 12px;border:1px solid var(--lbvLine);border-radius:var(--lbvRadius-sm);background:var(--lbvBg);font-size:13px;font-weight:700;color:var(--lbvText);cursor:pointer;white-space:nowrap}
.lbvButton:hover:not(:disabled){background:var(--lbvPanel)}
.lbvButton[data-primary="true"]{border-color:var(--lbvAccent);background:var(--lbvAccent);color:var(--lbvD-accent-text)}
.lbvButton:disabled{opacity:.45;cursor:not-allowed}
.lbvButton svg{width:13px;height:13px}
.lbvButton[data-busy="true"] svg{animation:lbvSpin .9s linear infinite}
.lbv[data-mode="fullscreen"]{border:0;border-radius:0;height:100vh}
.lbv[data-mode="fullscreen"] .lbvStage{min-height:0}
.lbv[data-mode="fullscreen"] .lbvCanvas{width:auto;max-width:100%;max-height:100%}
@keyframes lbvSpin{to{transform:rotate(360deg)}}
@keyframes lbvPulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.lbvSpin,.lbvPill i,.lbvIcon svg,.lbvStatus svg,.lbvButton svg{animation:none!important}}
`;
