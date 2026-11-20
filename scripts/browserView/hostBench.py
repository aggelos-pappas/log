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
    if surface == "mcp":
        frame = next((f for f in page.frames if f != page.main_frame), None)
        if frame is None:
            return 0, ""
        value = await frame.evaluate("(() => { const a = document.getElementById('app'); return a ? [Number(a.dataset.frames || 0), a.dataset.source || ''] : [0, ''] })()")
    else:
        value = await page.evaluate("(() => { const a = document.querySelector('.logbrowser'); return a ? [Number(a.dataset.frames || 0), a.dataset.source || ''] : [0, ''] })()")
    return value[0], value[1]


async def scenario(edge, host, cpage, surface, theme, mode, shots, measure_seconds):
    page = await edge.new_page(viewport={"width": 960, "height": 900}, color_scheme=theme)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    await page.goto(f"{host}/{'host' if surface == 'mcp' else 'hermes'}?theme={theme}&mode={mode}")
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
    target = page.frame_locator("#view").locator("canvas") if surface == "mcp" else page.locator(".logbrowser canvas")
    box = await target.bounding_box()
    before = await cpage.evaluate("Number(document.body.dataset.clicks || 0)")
    clicked = False
    latency = None
    if box:
        x = box["x"] + (PROBE[0] + PROBE[2] / 2) * box["width"] / WIDTH
        y = box["y"] + (PROBE[1] + PROBE[3] / 2) * box["height"] / HEIGHT
        sent = time.monotonic()
        await page.mouse.click(x, y)
        for _ in range(100):
            if await cpage.evaluate("Number(document.body.dataset.clicks || 0)") > before:
                clicked = True
                latency = round((time.monotonic() - sent) * 1000)
                break
            await asyncio.sleep(0.05)
    await asyncio.sleep(0.6)
    shot = None
    if shots:
        shot = str(shots / f"{'' if surface == 'mcp' else 'hermes-'}{theme}.png")
        await page.screenshot(path=shot, full_page=True)
    await page.close()
    return {"surface": surface, "theme": theme, "mode": mode, "fps": round(fps, 1), "frames": end, "source": source, "clickReached": clicked, "clickMs": latency, "screenshot": shot, "errors": errors[:3]}


async def main():
    shots = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    seconds = float(os.environ.get("BENCH_SECONDS", "5"))
    if shots:
        shots.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as folder:
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
            env = {**os.environ, "LOG_INSPECT_CURRENT": str(inspect / "current.json"), "LOG_BROWSER_STREAM_PORT": str(free_port()), "LOG_BROWSER_VIEW_LOCATION": "local", "BENCH_ACCOUNT": ACCOUNT}
            api_port, host_port = free_port(), free_port()
            api = subprocess.Popen(["uv", "run", "--no-project", "--python", "3.12", "--with", "fastapi", "--with", "uvicorn", "python", str(ROOT / "scripts" / "browserView" / "benchPluginApi.py"), str(api_port)], env=env, cwd=str(ROOT))
            host_proc = subprocess.Popen([shutil.which("bun") or "bun", str(ROOT / "scripts" / "browserView" / "benchHost.ts")], env={**env, "BENCH_HOST_PORT": str(host_port), "BENCH_PLUGIN_API": f"http://127.0.0.1:{api_port}"}, cwd=str(ROOT))
            results = []
            try:
                host = f"http://127.0.0.1:{host_port}"
                await wait_http(f"{host}/missing")
                await wait_http(f"http://127.0.0.1:{api_port}/api/plugins/log/browser/{ACCOUNT}")
                async with async_playwright() as pw:
                    edge = await pw.chromium.launch(channel="msedge", headless=True)
                    for surface in ("mcp", "hermes"):
                        for theme in ("light", "dark"):
                            results.append(await scenario(edge, host, cpage, surface, theme, "cast", shots, seconds))
                        results.append(await scenario(edge, host, cpage, surface, "light", "pull", None, seconds))
                    await edge.close()
            finally:
                host_proc.terminate()
                api.terminate()
                await viewer.close()
    print(json.dumps(results, indent=2))


asyncio.run(main())
