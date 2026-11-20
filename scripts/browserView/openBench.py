import asyncio
import json
import math
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = Path(os.environ.get("BENCH_PYTHON_ROOT") or ROOT / "python")
RUNS = int(os.environ.get("BENCH_RUNS", "5"))

CHILD = r"""
import asyncio, json, sys, time
began = float(sys.argv[2])
marks = {"pythonStart": time.time() - began}
sys.path.insert(0, sys.argv[1])
from pathlib import Path
from browser.browserViewer import BrowserViewer
from camoufox.async_api import AsyncCamoufox
marks["imports"] = time.time() - began

class Recorder:
    def seen(self):
        return 0

class Owner:
    def __init__(self, run_dir, page):
        self.run_dir, self.page, self.index, self.recorder = run_dir, page, 0, Recorder()
        self.controlLock = asyncio.Lock()
        self.opts = {}
        self.config = {"repliesPath": str(run_dir / "replies.jsonl"), "ownerDriven": True}

async def main():
    async with AsyncCamoufox(headless=True) as camoufox:
        marks["launched"] = time.time() - began
        page = await camoufox.new_page()
        await page.set_viewport_size({"width": 1100, "height": 700})
        marks["page"] = time.time() - began
        viewer = BrowserViewer(Owner(Path(sys.argv[3]), page))
        await viewer.start()
        marks["viewer"] = time.time() - began
        await page.set_content("<h1>Log in</h1><canvas id=c width=200 height=200></canvas><script>const x=document.getElementById('c').getContext('2d');(function t(n){x.fillStyle='#'+(n%4096).toString(16).padStart(3,'0');x.fillRect(0,0,200,200);requestAnimationFrame(t)})(0)</script>")
        frame = await viewer.pull(0, 1100, 700)
        marks["firstFrame"] = time.time() - began
        marks["frameSource"] = "screencast" if frame else "none"
        await viewer.close()
    print(json.dumps(marks))

asyncio.run(main())
"""


def pct(values, q):
    ordered = sorted(values)
    return round(ordered[min(len(ordered) - 1, max(0, math.ceil(len(ordered) * q) - 1))] * 1000) if ordered else None


def main():
    runs = []
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as folder:
        script = Path(folder) / "openChild.py"
        script.write_text(CHILD, encoding="utf8")
        for index in range(RUNS):
            run_dir = Path(folder) / f"run{index}"
            run_dir.mkdir()
            began = time.time()
            done = subprocess.run([sys.executable, str(script), str(PYTHON_ROOT), repr(began), str(run_dir)], capture_output=True, text=True, timeout=180, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            line = [l for l in done.stdout.splitlines() if l.startswith("{")]
            if not line:
                print(done.stderr[-800:], file=sys.stderr)
                continue
            runs.append(json.loads(line[-1]))
    stages = ["pythonStart", "imports", "launched", "page", "viewer", "firstFrame"]
    print(json.dumps({"python": str(PYTHON_ROOT), "runs": len(runs), "coldFirstRun": {k: round(runs[0][k] * 1000) for k in stages} if runs else None, **{k: {"p50": pct([r[k] for r in runs], 0.5), "p95": pct([r[k] for r in runs], 0.95), "p99": pct([r[k] for r in runs], 0.99)} for k in stages}}))


main()
