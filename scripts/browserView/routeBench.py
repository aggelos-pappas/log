import json
import math
import os
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(os.environ.get("BENCH_ROOT") or Path(__file__).resolve().parents[2])
CYCLES = int(os.environ.get("BENCH_CYCLES", "5"))
WARM_CALLS = int(os.environ.get("BENCH_CALLS", "20"))
IDLE = float(os.environ.get("BENCH_IDLE_SECONDS", "6"))


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def timed(url, body=None):
    began = time.monotonic()
    request = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), headers={"content-type": "application/json"}, method="GET" if body is None else "POST")
    try:
        with urllib.request.urlopen(request, timeout=180) as answer:
            size = len(answer.read())
            status = answer.status
    except urllib.error.HTTPError as error:
        size, status = 0, error.code
    return (time.monotonic() - began) * 1000, status, size


def pct(values, q):
    ordered = sorted(values)
    return round(ordered[min(len(ordered) - 1, max(0, math.ceil(len(ordered) * q) - 1))]) if ordered else None


def summary(values):
    return {"n": len(values), "p50": pct(values, 0.5), "p95": pct(values, 0.95), "p99": pct(values, 0.99)}


def stop(proc):
    if os.name == "nt":
        subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)], capture_output=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    else:
        proc.terminate()
    proc.wait(10)


def main():
    out = {"firstCard": [], "warmResourceBrowser": [], "warmResourceReport": [], "warmCall": [], "warmResult": [], "sizes": {}}
    env = {**os.environ, "LOG_ROOT": str(ROOT), "LOG_CONTEXT_SERVICE": "off", "LOG_BROWSER_VIEW_LOCATION": "local"}
    for _ in range(CYCLES):
        port = free_port()
        api = subprocess.Popen(["uv", "run", "--no-project", "--python", "3.12", "--with", "fastapi", "--with", "uvicorn", "python", str(ROOT / "scripts" / "browserView" / "benchPluginApi.py"), str(port)], env=env, cwd=str(ROOT), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        base = f"http://127.0.0.1:{port}/api/plugins/log"
        try:
            until = time.monotonic() + 120
            while time.monotonic() < until:
                try:
                    timed(f"{base}/overview")
                    break
                except OSError:
                    time.sleep(0.2)
            timed(f"{base}/apps/warm", {})
            time.sleep(IDLE)
            ms, status, size = timed(f"{base}/apps/browserView/resource")
            out["firstCard"].append(ms)
            out["sizes"]["browserView"] = size
            for _ in range(WARM_CALLS):
                out["warmResourceBrowser"].append(timed(f"{base}/apps/browserView/resource")[0])
                ms, _status, size = timed(f"{base}/apps/report/resource")
                out["warmResourceReport"].append(ms)
                out["sizes"]["report"] = size
                out["warmCall"].append(timed(f"{base}/apps/browserView/call", {"name": "browserView", "arguments": {"account": "benchNobody"}})[0])
                out["warmResult"].append(timed(f"{base}/apps/browserView/result", {"args": {"account": "benchNobody"}})[0])
        finally:
            stop(api)
    print(json.dumps({"root": str(ROOT), "idleSeconds": IDLE, **{k: summary(v) for k, v in out.items() if k != "sizes"}, "sizes": out["sizes"]}))


main()
