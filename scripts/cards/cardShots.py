import asyncio
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
THEMES = ("light", "dark")
SETTLE_SECONDS = float(os.environ.get("CARD_SETTLE_SECONDS", "4"))
INNER_JS = """() => {
  const root = document.scrollingElement || document.documentElement;
  const scrollers = [...document.querySelectorAll('*')].filter((el) => { const s = getComputedStyle(el); return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1; }).map((el) => el.className || el.tagName);
  const text = (document.body.innerText || '').trim();
  const lightness = (() => { for (let el = document.elementFromPoint(innerWidth / 2, 8); el; el = el.parentElement) { const c = getComputedStyle(el).backgroundColor.match(/[\d.]+/g); if (c && (c.length < 4 || Number(c[3]) > 0.5)) return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; } return null; })();
  return { lightness, text: text.slice(0, 400), textLength: text.length, scrollHeight: root.scrollHeight, clientHeight: root.clientHeight, scrollers, raw: /(^|[^a-z])(unknown|undefined|null|NaN|\\[object Object\\])([^a-z]|$)/.test(text) ? text.match(/(unknown|undefined|null|NaN|\\[object Object\\])/)[0] : null };
}"""


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


async def wait_http(url, seconds=90):
    import urllib.request

    until = time.time() + seconds
    while time.time() < until:
        try:
            with urllib.request.urlopen(url, timeout=2) as answer:
                return json.loads(answer.read().decode("utf8"))
        except Exception:
            await asyncio.sleep(0.3)
    raise SystemExit(f"cardShots: {url} did not answer")


def problems_of(result):
    out = []
    if result["errors"]:
        out.append(f"page errors: {result['errors'][:2]}")
    if result["csp"]:
        out.append(f"CSP refused something at load: {result['csp'][:2]}")
    inner = result["inner"]
    if not inner or inner["textLength"] == 0:
        out.append("the card drew nothing")
    else:
        if inner["scrollers"]:
            out.append(f"scrolls inside the card: {inner['scrollers'][:3]}")
        if inner["scrollHeight"] > inner["clientHeight"] + 2:
            out.append(f"taller than its frame ({inner['scrollHeight']} > {inner['clientHeight']}), so the card scrolls")
        if inner.get("lightness") is not None and (inner["lightness"] < 0.5) != (result["theme"] == "dark"):
            out.append(f"drawn {'dark' if inner['lightness'] < 0.5 else 'light'} on a {result['theme']} host")
        if inner["raw"]:
            out.append(f"shows a raw value: {inner['raw']}")
    return out


async def shoot(page, host, uri, theme, folder):
    errors, csp = [], []
    page.on("pageerror", lambda error: errors.append(str(error)[:200]))
    page.on("console", lambda message: csp.append(message.text[:600]) if "Content-Security-Policy" in message.text or "Content Security Policy" in message.text else None)
    await page.set_viewport_size({"width": 960, "height": 1200})
    await page.goto(f"{host}/card?uri={quote(uri, safe='')}&theme={theme}")
    await asyncio.sleep(SETTLE_SECONDS)
    frame = next((f for f in page.frames if f != page.main_frame), None)
    inner = await frame.evaluate(INNER_JS) if frame else None
    name = uri.replace("ui://log/", "")
    shot = str(Path(folder) / f"card-{name}-{theme}.png")
    await page.screenshot(path=shot, full_page=True)
    result = {"card": uri, "theme": theme, "inner": inner, "height": await page.evaluate("window.__host && window.__host.height || null"), "errors": errors, "csp": csp, "screenshot": shot}
    result["problems"] = problems_of(result)
    return result


async def main():
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else Path(tempfile.gettempdir()) / "logCardShots")
    folder.mkdir(parents=True, exist_ok=True)
    port = free_port()
    with tempfile.TemporaryDirectory() as home:
        env = {**os.environ, "LOG_ROOT": str(ROOT), "LOG_CONTEXT_SERVICE": "off", "LOG_BROWSER_VIEW_LOCATION": "local", "BENCH_HOST_PORT": str(port), "LOG_INSPECT_CURRENT": str(Path(home) / "current.json")}
        proc = subprocess.Popen([shutil.which("bun") or "bun", str(ROOT / "scripts" / "browserView" / "benchHost.ts")], env=env, cwd=str(ROOT), stdout=subprocess.DEVNULL)
        try:
            host = f"http://127.0.0.1:{port}"
            cards = await wait_http(f"{host}/cards")
            from camoufox.async_api import AsyncCamoufox

            results = []
            async with AsyncCamoufox(headless=True) as browser:
                for uri in cards:
                    for theme in THEMES:
                        page = await browser.new_page()
                        results.append(await shoot(page, host, uri, theme, folder))
                        await page.close()
        finally:
            proc.terminate()
    print(json.dumps(results, indent=1))
    broken = [r for r in results if r["problems"]]
    for r in broken:
        print(f"cardShots: {r['card']} ({r['theme']}): {'; '.join(r['problems'])}", file=sys.stderr)
    print(f"cardShots: {len(results) - len(broken)}/{len(results)} card draws clean, screenshots in {folder}", file=sys.stderr)
    sys.exit(1 if broken else 0)


if __name__ == "__main__":
    asyncio.run(main())
