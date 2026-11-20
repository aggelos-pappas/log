export const themeDefaults = `
:root{--d-bg:#ffffff;--d-panel:#f8fafc;--d-line:#e2e8f0;--d-text:#0f172a;--d-muted:#64748b;--d-ok:#047857;--d-ok-bg:#ecfdf5;--d-stop:#b91c1c;--d-stop-bg:#fef2f2;--d-inverse:#0f172a;--d-inverse-text:#ffffff;--d-ring:#2A8CFF;color-scheme:light}
:root[data-theme="dark"]{--d-bg:#0f1115;--d-panel:#171a21;--d-line:#2a2f3a;--d-text:#e6e8ec;--d-muted:#9aa3b2;--d-ok:#6ee7b7;--d-ok-bg:#0d2a22;--d-stop:#fca5a5;--d-stop-bg:#2c1215;--d-inverse:#f1f3f6;--d-inverse-text:#0f1115;--d-ring:#4FA6FF;color-scheme:dark}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--d-bg:#0f1115;--d-panel:#171a21;--d-line:#2a2f3a;--d-text:#e6e8ec;--d-muted:#9aa3b2;--d-ok:#6ee7b7;--d-ok-bg:#0d2a22;--d-stop:#fca5a5;--d-stop-bg:#2c1215;--d-inverse:#f1f3f6;--d-inverse-text:#0f1115;--d-ring:#4FA6FF;color-scheme:dark}}
`;

export const brandTokens = `${themeDefaults}
:root{--lk-bg:var(--color-background-primary,var(--d-bg));--lk-panel:var(--color-background-secondary,var(--d-panel));--lk-line:var(--color-border-primary,var(--d-line));--lk-text:var(--color-text-primary,var(--d-text));--lk-muted:var(--color-text-secondary,var(--d-muted));--lk-ok:var(--color-text-success,var(--d-ok));--lk-ok-bg:var(--color-background-success,var(--d-ok-bg));--lk-stop:var(--color-text-danger,var(--d-stop));--lk-stop-bg:var(--color-background-danger,var(--d-stop-bg));--lk-inverse:var(--color-background-inverse,var(--d-inverse));--lk-inverse-text:var(--color-text-inverse,var(--d-inverse-text));--lk-ring:var(--color-ring-primary,var(--d-ring));--lk-font:var(--font-sans,"Satoshi",Inter,system-ui,-apple-system,"Segoe UI",sans-serif);--lk-radius:var(--border-radius-lg,16px);--lk-radius-sm:var(--border-radius-md,9px)}
`;

export const widgetStyle = `${brandTokens}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent}
body{font-family:var(--lk-font);color:var(--lk-text);-webkit-font-smoothing:antialiased}
.app{display:flex;flex-direction:column;border:1px solid var(--lk-line);border-radius:var(--lk-radius);overflow:hidden;background:var(--lk-bg)}
.app[data-mode="fullscreen"]{border:0;border-radius:0;height:100vh}
.bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--lk-panel);border-bottom:1px solid var(--lk-line)}
.mark{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:var(--lk-radius-sm);background:var(--lk-inverse);color:var(--lk-inverse-text);flex:none}
.mark svg{width:15px;height:15px}
.who{display:flex;flex-direction:column;min-width:0;flex:1}
.who strong{font-size:14px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.who span{font-size:12px;color:var(--lk-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 9px;font-size:12px;font-weight:700;background:var(--lk-line);color:var(--lk-muted);white-space:nowrap}
.pill i{width:6px;height:6px;border-radius:50%;background:currentColor}
.pill[data-tone="live"]{background:var(--lk-ok-bg);color:var(--lk-ok)}
.pill[data-tone="live"] i{animation:pulse 1.6s ease-in-out infinite}
.pill[data-tone="stop"]{background:var(--lk-stop-bg);color:var(--lk-stop)}
.icon{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:var(--lk-radius-sm);background:transparent;color:var(--lk-muted);cursor:pointer;flex:none}
.icon:hover{background:var(--lk-line);color:var(--lk-text)}
.icon[hidden]{display:none}
.icon svg{width:15px;height:15px}
.address{display:flex;align-items:center;gap:8px;margin:0 14px 10px;padding:0 12px;height:32px;border:1px solid var(--lk-line);border-radius:var(--lk-radius-sm);font-size:13px;color:var(--lk-muted);background:var(--lk-bg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.head{background:var(--lk-panel);border-bottom:1px solid var(--lk-line)}
.head .bar{border-bottom:0}
.stage{position:relative;display:flex;align-items:center;justify-content:center;min-height:300px;background:var(--lk-panel);flex:1;overflow:hidden}
.app[data-mode="fullscreen"] .stage{min-height:0}
canvas{display:block;max-width:100%;height:auto;outline:none;visibility:hidden}
canvas[data-live="true"]{visibility:visible}
canvas[data-input="true"]{cursor:pointer}
.stage:focus-within canvas[data-input="true"]{box-shadow:0 0 0 3px var(--lk-ring)}
.app[data-mode="fullscreen"] canvas{max-height:100%;width:auto;max-width:100%}
.cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:24px;text-align:center;color:var(--lk-text);background:var(--lk-panel)}
.cover[hidden]{display:none}
.cover h2{margin:0;font-size:20px;font-weight:700;letter-spacing:-.01em}
.cover p{margin:0;max-width:420px;font-size:14px;line-height:1.5;color:var(--lk-muted)}
.spin{width:26px;height:26px;border-radius:50%;border:3px solid var(--lk-line);border-top-color:var(--lk-text);animation:spin .9s linear infinite}
.spin[hidden]{display:none}
.keys{position:absolute;left:0;bottom:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;resize:none;pointer-events:none}
.take{position:absolute;left:50%;top:16px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;border:1px solid var(--lk-line);border-radius:999px;background:var(--lk-bg);padding:9px 16px;font:inherit;font-size:13px;font-weight:700;color:var(--lk-text);box-shadow:var(--shadow-md,0 4px 14px rgba(0,0,0,.18));cursor:pointer}
.take[hidden]{display:none}
.note{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);max-width:calc(100% - 24px);border-radius:999px;background:var(--lk-inverse);padding:6px 12px;font-size:12px;font-weight:700;color:var(--lk-inverse-text);text-align:center;opacity:.92}
.note[hidden]{display:none}
.foot{display:flex;align-items:center;gap:10px;padding:10px 14px;border-top:1px solid var(--lk-line);background:var(--lk-bg)}
.foot p{margin:0;flex:1;font-size:13px;line-height:1.4;color:var(--lk-muted)}
.done{height:34px;border:0;border-radius:var(--lk-radius-sm);padding:0 14px;font:inherit;font-size:13px;font-weight:700;color:var(--lk-inverse-text);background:var(--lk-inverse);cursor:pointer;white-space:nowrap}
.done:active{transform:translateY(1px)}
.done:disabled{opacity:.5;cursor:default}
.toast{position:absolute;right:12px;top:12px;max-width:min(360px,calc(100% - 24px));border-radius:12px;background:var(--lk-inverse);color:var(--lk-inverse-text);padding:10px 12px;font-size:13px;line-height:1.4;box-shadow:var(--shadow-lg,0 8px 24px rgba(0,0,0,.3))}
.toast[hidden]{display:none}
.toast strong{display:block;font-weight:700}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){.spin,.pill[data-tone="live"] i{animation:none}}
`;
