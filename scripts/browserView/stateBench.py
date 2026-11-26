import asyncio
import json
import math
import os
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = Path(os.environ.get("BENCH_PYTHON_ROOT") or ROOT / "python")
sys.path.insert(0, str(PYTHON_ROOT))

from browser.browserViewer import BrowserViewer

ROUNDS = int(os.environ.get("BENCH_ROUNDS", "6"))
SLOW = float(os.environ.get("BENCH_SLOW_SECONDS", "6"))
ROWS = int(os.environ.get("BENCH_ROWS", "4000"))
BUSY = int(os.environ.get("BENCH_BUSY_MS", "1500"))


class Pages(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        if self.path.startswith("/slow.js"):
            time.sleep(SLOW)
            body = b"document.body.dataset.loaded='1'"
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        rows = "".join(f"<div class=r><b>Row {i}</b> <span>message text number {i} with some words</span></div>" for i in range(ROWS))
        body = f"<!doctype html><html><head><title>Heavy</title></head><body><h1>Channel</h1>{rows}<script>setInterval(() => {{ const t = Date.now() + {BUSY}; while (Date.now() < t) {{}} }}, {BUSY + 100})</script><script src=\"/slow.js?{time.monotonic_ns()}\"></script><p>after</p></body></html>".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class Recorder:
    def seen(self):
        return 0


class Owner:
    def __init__(self, run_dir, page):
        self.run_dir = run_dir
        self.page = page
        self.index = 0
        self.recorder = Recorder()
        self.controlLock = asyncio.Lock()
        self.opts = {}
        self.config = {"repliesPath": str(run_dir / "replies.jsonl"), "ownerDriven": True}


async def state_ms(port, token):
    began = time.monotonic()
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    writer.write(f"GET /state HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer {token}\r\n\r\n".encode())
    await writer.drain()
    raw = await reader.read()
    writer.close()
    return round((time.monotonic() - began) * 1000), int(raw.split(b" ")[1])


def pct(values, q):
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, max(0, math.ceil(len(ordered) * q) - 1))] if ordered else None


async def main():
    from camoufox.async_api import AsyncCamoufox

    server = ThreadingHTTPServer(("127.0.0.1", 0), Pages)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}/"
    steady, loading, failed = [], [], 0
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as folder:
        async with AsyncCamoufox(headless=True) as camoufox:
            page = await camoufox.new_page()
            await page.set_content("<h1>Start</h1>")
            viewer = BrowserViewer(Owner(Path(folder), page))
            await viewer.start()
            for _ in range(10):
                steady.append((await state_ms(viewer.port, viewer.token))[0])
            for _ in range(ROUNDS):
                navigation = asyncio.ensure_future(page.goto(url, wait_until="load", timeout=60000))
                await asyncio.sleep(0.3)
                until = time.monotonic() + SLOW
                while time.monotonic() < until:
                    ms, status = await state_ms(viewer.port, viewer.token)
                    loading.append(ms)
                    failed += status != 200
                    await asyncio.sleep(0.25)
                await navigation
            await viewer.close()
    server.shutdown()
    print(json.dumps({"python": str(PYTHON_ROOT), "steady": {"n": len(steady), "p50": pct(steady, 0.5), "p95": pct(steady, 0.95), "p99": pct(steady, 0.99)}, "whileLoading": {"n": len(loading), "failed": failed, "p50": pct(loading, 0.5), "p95": pct(loading, 0.95), "p99": pct(loading, 0.99), "max": max(loading) if loading else None}}))


asyncio.run(main())
