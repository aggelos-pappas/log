import asyncio
import json
import os
import statistics
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = Path(os.environ.get("BENCH_PYTHON_ROOT") or ROOT / "python")
sys.path.insert(0, str(PYTHON_ROOT))

from browser.browserViewer import BrowserViewer, CastClient
from browser.harRecorder import Recorder
from human.humanMouse import HumanMouse
from session import inspectSession
from session.inspectSession import Inspector

CLICKS = int(os.environ.get("BENCH_CLICKS", "20"))
GAP = float(os.environ.get("BENCH_GAP", "0.6"))
PROBE = (60, 300, 240, 90)
PAGE = f"""<!doctype html><html><head><title>Probe</title><style>body{{margin:0;font-family:system-ui}}#probe{{position:absolute;left:{PROBE[0]}px;top:{PROBE[1]}px;width:{PROBE[2]}px;height:{PROBE[3]}px;border:0;border-radius:12px;background:#2563eb;color:#fff;font-size:20px}}</style></head>
<body><h1 style="margin:24px 60px">Friends</h1><p style="margin:0 60px">A page with a probe button.</p><button id="probe" type="button">Probe</button>
<script>let n=0;document.getElementById('probe').addEventListener('click',()=>{{n++;document.body.dataset.clicks=n;document.getElementById('probe').style.background=n%2?'#16a34a':'#2563eb'}});</script></body></html>"""


def quiet(*_args, **_kwargs):
    return None


async def call(port, token, method, path, body=None):
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    data = json.dumps(body).encode() if body is not None else b""
    writer.write(f"{method} {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer {token}\r\nContent-Type: application/json\r\nContent-Length: {len(data)}\r\n\r\n".encode() + data)
    await writer.drain()
    raw = await reader.read()
    writer.close()
    header, _, payload = raw.partition(b"\r\n\r\n")
    return int(header.split(b" ")[1]), payload


def pct(values, q):
    if not values:
        return None
    ordered = sorted(values)
    return round(ordered[min(len(ordered) - 1, int(round(q * (len(ordered) - 1))))], 1)


async def main():
    from camoufox.async_api import AsyncCamoufox

    inspectSession.log = quiet
    with tempfile.TemporaryDirectory() as folder:
        run = Path(folder)
        config = {"captureDir": str(run / "capture"), "repliesPath": str(run / "replies.jsonl"), "commandsPath": str(run / "commands.jsonl"), "ownerDriven": True}
        async with AsyncCamoufox(headless=True) as camoufox:
            page = await camoufox.new_page()
            await page.set_viewport_size({"width": 1000, "height": 640})
            await page.set_content(PAGE)
            owner = Inspector(config)
            owner.context = page.context
            owner.page = page
            owner.recorder.attach(owner.context)
            owner.mouse = HumanMouse(page, quiet, busy=owner.recorder.busy)
            viewer = BrowserViewer(owner)
            await viewer.start()
            descriptor = json.loads((run / "browserViewer.json").read_text(encoding="utf8"))
            port, token = descriptor["port"], descriptor["token"]
            client = CastClient()
            await viewer.cast.join(client, 1000, 640)
            answered, reached, framed, blocked, failures = [], [], [], [], 0
            x, y = PROBE[0] + PROBE[2] / 2, PROBE[1] + PROBE[3] / 2
            for index in range(CLICKS):
                _status, body = await call(port, token, "GET", "/state")
                state = json.loads(body)
                before = int(await page.evaluate("() => Number(document.body.dataset.clicks || 0)"))
                client.take()
                sent = time.perf_counter()
                task = asyncio.ensure_future(call(port, token, "POST", "/input", {"type": "click", "x": x, "y": y, "generation": state["generation"], "revision": state["revision"]}))
                seen_at = None
                frame_at = None
                busy_seen = False
                deadline = sent + 30
                while time.perf_counter() < deadline and (seen_at is None or frame_at is None or not task.done()):
                    if seen_at is None and int(await page.evaluate("() => Number(document.body.dataset.clicks || 0)")) > before:
                        seen_at = time.perf_counter()
                        client.take()
                    elif seen_at is not None and frame_at is None and client.latest is not None:
                        frame_at = time.perf_counter()
                    if owner.controlLock.locked() and not getattr(viewer, "capturing", False):
                        busy_seen = True
                    await asyncio.sleep(0.005)
                status, _payload = await task
                done = time.perf_counter()
                if status != 200 or seen_at is None:
                    failures += 1
                    continue
                answered.append((done - sent) * 1000)
                reached.append((seen_at - sent) * 1000)
                if frame_at is not None:
                    framed.append((frame_at - sent) * 1000)
                blocked.append(busy_seen)
                await asyncio.sleep(GAP)
            await viewer.cast.leave(client)
            await viewer.close()
    result = {
        "code": str(PYTHON_ROOT),
        "clicks": CLICKS,
        "failures": failures,
        "inputAnsweredMs": {"p50": pct(answered, 0.5), "p95": pct(answered, 0.95), "mean": round(statistics.mean(answered), 1) if answered else None},
        "clickReachedPageMs": {"p50": pct(reached, 0.5), "p95": pct(reached, 0.95)},
        "clickToFrameMs": {"p50": pct(framed, 0.5), "p95": pct(framed, 0.95)},
        "busyShownOnClicks": sum(1 for value in blocked if value),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
