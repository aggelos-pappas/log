from __future__ import annotations

import asyncio
import importlib
import json
import os
import secrets
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from platformKit import engine as kit
from platformKit import timing

IDLE_SECONDS = 600
REQUEST_LIMIT = 16 * 1024 * 1024
HOSTED_PLATFORMS = ("discord", "slack", "reddit")
NOT_HOSTED = ("watch",)


def code_roots(platform: str) -> tuple[Path, ...]:
    return (ROOT / f"{platform}Api", ROOT / "platformKit")


def code_stamp(platform: str) -> float:
    return max((p.stat().st_mtime for root in code_roots(platform) if root.exists() for p in root.rglob("*.py")), default=0.0)


def account_dir(state_root: str, account: str) -> Path:
    folder = Path(state_root) / account
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def host_path(state_root: str, account: str) -> Path:
    return account_dir(state_root, account) / "host.json"


def host_log(state_root: str, account: str) -> Path:
    return account_dir(state_root, account) / "host.log"


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
        if not handle:
            return False
        code = ctypes.c_ulong()
        ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(handle)
        return code.value == 259
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


class HostLock:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.handle: Any = None

    def take(self) -> bool:
        self.handle = open(self.path, "a+b")
        try:
            if os.name == "nt":
                import msvcrt
                self.handle.seek(0)
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            return True
        except OSError:
            self.handle.close()
            self.handle = None
            return False

    def release(self) -> None:
        if self.handle is None:
            return
        try:
            if os.name == "nt":
                import msvcrt
                self.handle.seek(0)
                msvcrt.locking(self.handle.fileno(), msvcrt.LK_UNLCK, 1)
        except OSError:
            pass
        self.handle.close()
        self.handle = None


def answer_of(spec: dict[str, Any], actions: dict[str, Any], writes: tuple[str, ...]) -> dict[str, Any]:
    timing.begin(spec.get("trace"))
    return timing.attach(asyncio.run(kit.run(spec, actions, writes)))


class Host:
    def __init__(self, platform: str, account: str, state_root: str) -> None:
        module = importlib.import_module(f"{platform}Api.engine")
        library = getattr(module, "LIBRARY", None)
        if library:
            path = str(kit.VENDOR.parent / library)
            if path not in sys.path:
                sys.path.insert(0, path)
        self.actions: dict[str, Any] = module.ACTIONS
        self.writes: tuple[str, ...] = tuple(getattr(module, "WRITES", ()))
        self.platform = platform
        self.account = account
        self.state_root = state_root
        self.token = secrets.token_urlsafe(32)
        self.calls = 0
        self.active = 0
        self.started = time.time()
        self.last = time.time()
        self.stamp = code_stamp(platform)
        self.port = 0

    def record(self) -> None:
        host_path(self.state_root, self.account).write_text(json.dumps({"pid": os.getpid(), "port": self.port, "token": self.token, "platform": self.platform, "root": str(ROOT), "startedAt": self.started, "calls": self.calls, "lastCallAt": self.last}), encoding="utf-8")

    def refusal(self, spec: dict[str, Any]) -> dict[str, Any] | None:
        if spec.get("account") != self.account or spec.get("platform") != self.platform:
            return {"ok": False, "code": "kitHostRefused", "detail": f"this host is {self.platform} {self.account}'s"}
        action = spec.get("action")
        if action in NOT_HOSTED or action in self.writes:
            return {"ok": False, "code": "kitHostPassed", "detail": f"{action} runs in its own process, not the read host"}
        return None

    async def answer(self, request: dict[str, Any]) -> dict[str, Any]:
        if request.get("token") != self.token:
            return {"ok": False, "code": "kitHostRefused", "detail": "the call didn't carry this host's token"}
        spec = request.get("spec") or {}
        refused = self.refusal(spec)
        if refused:
            return refused
        self.active += 1
        try:
            out = await asyncio.to_thread(answer_of, spec, self.actions, self.writes)
        finally:
            self.active -= 1
        self.calls += 1
        self.last = time.time()
        self.record()
        out["kitHost"] = {"pid": os.getpid(), "calls": self.calls}
        return out

    async def handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 30)
            length = 0
            for line in head.decode("ascii", errors="replace").split("\r\n")[1:]:
                name, _, value = line.partition(":")
                if name.strip().lower() == "content-length":
                    length = int(value.strip() or 0)
            body = await asyncio.wait_for(reader.readexactly(length), 30) if length else b"{}"
            out = await self.answer(json.loads(body.decode("utf-8")))
        except Exception as error:
            out = {"ok": False, "code": "kitHostError", "detail": str(error)[:300]}
        data = (json.dumps(out, default=str) + "\n").encode("utf-8")
        try:
            writer.write(b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\nconnection: close\r\ncontent-length: " + str(len(data)).encode() + b"\r\n\r\n" + data)
            await writer.drain()
        except (ConnectionError, OSError):
            pass
        finally:
            writer.close()

    async def serve(self) -> int:
        lock = HostLock(account_dir(self.state_root, self.account) / "kitHost.lock")
        if not lock.take():
            print(f"another {self.platform} read host already holds {self.account}; this one exits", flush=True)
            return 1
        server = None
        try:
            server = await asyncio.start_server(self.handle, "127.0.0.1", 0, limit=REQUEST_LIMIT)
            self.port = server.sockets[0].getsockname()[1]
            self.record()
            print(f"{self.platform} read host for {self.account} up: pid {os.getpid()}, port {self.port}", flush=True)
            while True:
                await asyncio.sleep(2)
                idle = time.time() - self.last
                if self.active == 0 and idle > IDLE_SECONDS:
                    print(f"idle {int(idle)} s: closing the {self.platform} read host", flush=True)
                    break
                if self.active == 0 and code_stamp(self.platform) != self.stamp:
                    print(f"log's {self.platform} engine code changed: closing so the next call starts the new code", flush=True)
                    break
        finally:
            path = host_path(self.state_root, self.account)
            try:
                if json.loads(path.read_text(encoding="utf-8")).get("pid") == os.getpid():
                    path.unlink(missing_ok=True)
            except (OSError, ValueError):
                pass
            if server is not None:
                server.close()
            lock.release()
        return 0


def start_host(platform: str, account: str, state_root: str) -> None:
    options: dict[str, Any] = {}
    if os.name == "nt":
        options["creationflags"] = 0x08000000 | 0x00000200
    else:
        options["start_new_session"] = True
    log = open(host_log(state_root, account), "ab")
    subprocess.Popen([sys.executable, str(Path(__file__)), platform, account, state_root], stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, close_fds=True, cwd=str(ROOT), **options)


def main() -> int:
    if os.name == "nt":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    platform, account, state_root = sys.argv[1], sys.argv[2], sys.argv[3]
    if platform not in HOSTED_PLATFORMS:
        print(f"{platform} has no read host", flush=True)
        return 1
    return asyncio.run(Host(platform, account, state_root).serve())


if __name__ == "__main__":
    raise SystemExit(main())
