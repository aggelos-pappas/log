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

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))

from browser.browserViewer import BrowserViewer
from camoufox.async_api import AsyncCamoufox
from playwright.async_api import async_playwright

ACCOUNT = "benchAccount"
PAGES = {"mcp": "host", "logapp": "logapp"}
SHOT_PREFIX = {"mcp": "", "logapp": "logapp-browserView-"}
CLICKS = int(os.environ.get("BENCH_CLICKS", "5"))
SURFACES = tuple(s for s in os.environ.get("BENCH_SURFACES", "mcp,logapp").split(",") if s in PAGES)
WIDTH, HEIGHT = 1100, 700
PROBE = (60, 420, 240, 90)
PAGE = f"""<!doctype html><html><head><title>Log in</title><style>body{{margin:0;font-family:system-ui;background:#fff}}h1{{margin:24px 60px 8px}}form{{margin:0 60px}}input{{display:block;margin:8px 0;padding:8px;width:280px}}#probe{{position:absolute;left:{PROBE[0]}px;top:{PROBE[1]}px;width:{PROBE[2]}px;height:{PROBE[3]}px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-size:20px}}canvas{{position:absolute;right:40px;top:40px}}</style></head>
<body><h1>Log in</h1><p style="margin:0 60px">Log in to continue</p><form><input name="email" placeholder="Email"><input type="password" name="password" placeholder="Password"></form>
<button id="probe" type="button">Probe</button><canvas id="spin" width="360" height="360"></canvas>
<script>window.clicks=0;document.getElementById('probe').addEventListener('click',()=>{{window.clicks++;document.body.dataset.clicks=window.clicks;document.getElementById('probe').style.background=window.clicks%2?'#16a34a':'#2563eb'}});
const c=document.getElementById('spin').getContext('2d');function tick(t){{c.fillStyle='#f1f5f9';c.fillRect(0,0,360,360);c.fillStyle='#0f172a';c.save();c.translate(180,180);c.rotate(t/400);c.fillRect(-120,-12,240,24);c.restore();requestAnimationFrame(tick)}}requestAnimationFrame(tick);</script></body></html>"""


class Recorder:
    def seen(self):
        return 0


class Glide:
    async def glide(self, x, y, kind):
        return True


class BenchOwner:
    def __init__(self, folder, page):
        self.run_dir = Path(folder)
        self.page = page
        self.index = 0
        self.recorder = Recorder()
        self.controlLock = asyncio.Lock()
        self.mouse = Glide()
        self.opts = {}
        self.config = {"repliesPath": str(self.run_dir / "replies.jsonl")}

    async def step(self, action, label, act):
        self.index += 1
        await act()
        return {"ok": True, "step": f"{self.index:02d}_{action}"}


def stop_tree(proc):
    if os.name == "nt":
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)], capture_output=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    else:
        proc.terminate()
    try:
        proc.wait(10)
    except subprocess.TimeoutExpired:
        proc.kill()


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


async def wait_http(url, seconds=90):
    import urllib.request
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        try:
            await asyncio.to_thread(lambda: urllib.request.urlopen(url, timeout=2).close())
            return
        except Exception as error:
            if getattr(error, "code", None):
                return
            await asyncio.sleep(0.5)
    raise RuntimeError(f"never came up: {url}")


async def frames_of(page, surface):
    frame = next((f for f in page.frames if f != page.main_frame), None)
    if frame is None:
        return 0, ""
    value = await frame.evaluate("(() => { const a = document.getElementById('app'); return a ? [Number(a.dataset.frames || 0), a.dataset.source || ''] : [0, ''] })()")
    return value[0], value[1]


async def scenario(edge, host, cpage, surface, theme, mode, shots, measure_seconds):
    page = await edge.new_page(viewport={"width": 960, "height": 900}, color_scheme=theme)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.goto(f"{host}/{PAGES[surface]}?theme={theme}&mode={mode}")
    until = time.monotonic() + 30
    count, source = 0, ""
    while time.monotonic() < until:
        count, source = await frames_of(page, surface)
        if count >= 3:
            break
        await asyncio.sleep(0.2)
    start, _ = await frames_of(page, surface)
    began = time.monotonic()
    await asyncio.sleep(measure_seconds)
    end, source = await frames_of(page, surface)
    fps = (end - start) / (time.monotonic() - began)
    target = page.frame_locator("#view" if surface == "mcp" else ".logapp iframe").locator("canvas")
    box = await target.bounding_box()
    latencies = []
    if box:
        x = box["x"] + (PROBE[0] + PROBE[2] / 2) * box["width"] / WIDTH
        y = box["y"] + (PROBE[1] + PROBE[3] / 2) * box["height"] / HEIGHT
        for _ in range(CLICKS):
            before = await cpage.evaluate("Number(document.body.dataset.clicks || 0)")
            sent = time.monotonic()
            await page.mouse.click(x, y)
            for _ in range(200):
                if await cpage.evaluate("Number(document.body.dataset.clicks || 0)") > before:
                    latencies.append(round((time.monotonic() - sent) * 1000))
                    break
                await asyncio.sleep(0.01)
            await asyncio.sleep(0.4)
    clicked = len(latencies) == CLICKS and CLICKS > 0
    latency = sorted(latencies)[len(latencies) // 2] if latencies else None
    await asyncio.sleep(0.6)
    shot = None
    if shots:
        shot = str(shots / f"{SHOT_PREFIX[surface]}{theme}.png")
        await page.screenshot(path=shot, full_page=True)
    address = await app_address(page, surface)
    await page.close()
    return {"surface": surface, "theme": theme, "mode": mode, "fps": round(fps, 1), "frames": end, "source": source, "clickReached": clicked, "clickMs": latency, "clicksMs": latencies, "address": address, "screenshot": shot, "errors": errors[:3]}


async def app_address(page, surface):
    frame = next((f for f in page.frames if f != page.main_frame), None)
    if frame is None:
        return None
    return await frame.evaluate("(() => { const a = document.querySelector('[data-ref=address]'); return a ? a.textContent : null })()")


async def report_scenario(edge, host, theme, shots):
    page = await edge.new_page(viewport={"width": 960, "height": 900}, color_scheme=theme)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    began = time.monotonic()
    await page.goto(f"{host}/logapp?tool=report&theme={theme}")
    drawn, drawn_ms = False, None
    until = time.monotonic() + 45
    while time.monotonic() < until:
        frame = next((f for f in page.frames if f != page.main_frame), None)
        if frame is not None:
            try:
                if await frame.evaluate("document.body && document.body.innerText.includes('Messages in')"):
                    drawn, drawn_ms = True, round((time.monotonic() - began) * 1000)
                    break
            except Exception:
                pass
        await asyncio.sleep(0.2)
    frame = next((f for f in page.frames if f != page.main_frame), None)
    inner = await frame.evaluate("document.documentElement.dataset.theme || ''") if frame else ""
    await page.evaluate(f"document.documentElement.classList.toggle('dark', {'false' if theme == 'dark' else 'true'})")
    await asyncio.sleep(0.8)
    flipped = await frame.evaluate("document.documentElement.dataset.theme || ''") if frame else ""
    await page.evaluate(f"document.documentElement.classList.toggle('dark', {'true' if theme == 'dark' else 'false'})")
    await asyncio.sleep(0.8)
    shot = None
    if shots:
        shot = str(shots / f"logapp-report-{theme}.png")
        await page.screenshot(path=shot, full_page=True)
    await page.close()
    return {"surface": "logapp", "view": "report", "theme": theme, "drawn": drawn, "drawnMs": drawn_ms, "themeInView": inner, "themeAfterFlip": flipped, "screenshot": shot, "errors": errors[:3]}


async def main():
    shots = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    seconds = float(os.environ.get("BENCH_SECONDS", "5"))
    if shots:
        shots.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as folder:
        inspect = Path(folder) / "inspect"
        (inspect / "sessions").mkdir(parents=True)
        run_dir = Path(folder) / "run"
        run_dir.mkdir()
        async with AsyncCamoufox(headless=True) as camoufox:
            cpage = await camoufox.new_page()
            await cpage.set_viewport_size({"width": WIDTH, "height": HEIGHT})
            await cpage.set_content(PAGE)
            owner = BenchOwner(run_dir, cpage)
            viewer = BrowserViewer(owner)
            await viewer.start()
            (inspect / "sessions" / f"{ACCOUNT}.json").write_text(json.dumps({"account": ACCOUNT, "runDir": str(run_dir), "pid": os.getpid()}), encoding="utf8")
            env = {**os.environ, "LOG_ROOT": str(ROOT), "LOG_DB": str(Path(folder) / "log.db"), "LOG_CONTEXT_SERVICE": "off", "LOG_INSPECT_CURRENT": str(inspect / "current.json"), "LOG_BROWSER_STREAM_PORT": str(free_port()), "LOG_BROWSER_VIEW_LOCATION": "local", "BENCH_ACCOUNT": ACCOUNT}
            api_port, host_port = free_port(), free_port()
            api = subprocess.Popen(["uv", "run", "--no-project", "--python", "3.12", "--with", "fastapi", "--with", "uvicorn", "python", str(ROOT / "scripts" / "browserView" / "benchPluginApi.py"), str(api_port)], env=env, cwd=str(ROOT))
            host_proc = subprocess.Popen([shutil.which("bun") or "bun", str(ROOT / "scripts" / "browserView" / "benchHost.ts")], env={**env, "BENCH_HOST_PORT": str(host_port), "BENCH_PLUGIN_API": f"http://127.0.0.1:{api_port}"}, cwd=str(ROOT))
            results = []
            try:
                host = f"http://127.0.0.1:{host_port}"
                await wait_http(f"{host}/missing")
                await wait_http(f"http://127.0.0.1:{api_port}/api/plugins/log/apps/browserView/resource", 180)
                async with async_playwright() as pw:
                    edge = await pw.chromium.launch(channel="msedge", headless=True)
                    for surface in SURFACES:
                        for theme in ("light", "dark"):
                            results.append(await scenario(edge, host, cpage, surface, theme, "cast", shots, seconds))
                        if surface != "logapp":
                            results.append(await scenario(edge, host, cpage, surface, "light", "pull", None, seconds))
                    for theme in ("light", "dark"):
                        results.append(await report_scenario(edge, host, theme, shots))
                    await edge.close()
            finally:
                stop_tree(host_proc)
                stop_tree(api)
                await viewer.close()
    print(json.dumps(results, indent=2))


asyncio.run(main())
