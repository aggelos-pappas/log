from __future__ import annotations

import asyncio
import hashlib
import json
import os
import secrets
import time
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit
from browser import streamSurface
from browser.viewerState import CODE_FIELD_SELECTOR, viewer_state

BOUNDARY = "logFrame"
CAST_QUALITY = 70
TICKET_SECONDS = 60
TICKET_MAX_SECONDS = 900
TICKET_LIMIT = 64
STREAM_LIMIT = 2
INPUT_LOG = "inputs.jsonl"
INPUT_KEYS = {"Enter", "Tab", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Space", "Home", "End"}
CORS_HEADERS = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Private-Network": "true", "Access-Control-Expose-Headers": "X-Log-Browser-Generation", "Access-Control-Max-Age": "600"}


async def screencast_start(page: Any, on_frame: Any, width: int, height: int) -> None:
    try:
        cast = page.screencast._impl_obj
        channel = page._impl_obj._channel
    except AttributeError:
        await page.screencast.start(on_frame=on_frame, quality=CAST_QUALITY)
        return
    if cast._started:
        raise RuntimeError("screencastBusy")
    cast._started = True
    cast._on_frame = on_frame
    try:
        await channel.send_return_as_dict("screencastStart", None, {"size": {"width": width, "height": height}, "quality": CAST_QUALITY, "sendFrames": True, "record": False})
    except Exception:
        cast._started = False
        cast._on_frame = None
        raise


async def screencast_stop(page: Any) -> None:
    await page.screencast.stop()


class CastClient:
    def __init__(self) -> None:
        self.latest: dict[str, Any] | None = None
        self.ready = asyncio.Event()
        self.replaced = False

    def offer(self, frame: dict[str, Any]) -> None:
        self.latest = frame
        self.ready.set()

    def take(self) -> dict[str, Any] | None:
        frame, self.latest = self.latest, None
        self.ready.clear()
        return frame

    def replace(self) -> None:
        self.replaced = True
        self.ready.set()


class PageCast:
    def __init__(self, owner: Any) -> None:
        self.owner = owner
        self.clients: set[CastClient] = set()
        self.page: Any = None
        self.lock = asyncio.Lock()
        self.start = screencast_start
        self.stop = screencast_stop
        self.seq = 0
        self.latest: dict[str, Any] | None = None
        self.fresh = asyncio.Event()

    def frame(self, frame: dict[str, Any]) -> None:
        if not isinstance(frame.get("data"), (bytes, bytearray)):
            return
        self.seq += 1
        self.latest = frame
        fresh, self.fresh = self.fresh, asyncio.Event()
        fresh.set()
        for client in list(self.clients):
            client.offer(frame)

    async def halt(self) -> None:
        page, self.page = self.page, None
        self.latest = None
        if page is not None:
            try:
                await self.stop(page)
            except Exception:
                pass

    async def join(self, client: CastClient, width: int, height: int) -> Any:
        async with self.lock:
            page = self.owner.page
            if self.page is not None and self.page is not page:
                await self.halt()
            if self.page is None:
                await self.start(page, self.frame, width, height)
                self.page = page
            self.clients.add(client)
            return page

    async def leave(self, client: CastClient) -> None:
        async with self.lock:
            self.clients.discard(client)
            if not self.clients:
                await self.halt()


class BrowserViewer:
    def __init__(self, owner: Any) -> None:
        self.owner = owner
        self.token = secrets.token_urlsafe(32)
        self.generation = secrets.token_hex(16)
        self.path = owner.run_dir / "browserViewer.json"
        self.server: Any = None
        self.inputRevision = 0
        self.cast = PageCast(owner)
        self.castPoll = 0.25
        self.castRepeat = 2.0
        self.puller: CastClient | None = None
        self.pullUntil = 0.0
        self.pullLease = 5.0
        self.pullWait = 0.25
        self.firstWait = 1.5
        self.reaper: asyncio.Task[None] | None = None
        self.tickets: dict[str, float] = {}
        self.port = 0
        self.keeper: asyncio.Task[None] | None = None
        self.keepEvery = 1.0
        self.relistened = 0
        self.inputLock = asyncio.Lock()
        self.capturing = False
        self.capturer: asyncio.Task[None] | None = None
        self.captureKind = ""
        self.capturedUrl = ""
        self.inputAt = 0.0
        self.captureTick = 0.25
        self.captureMoved = 1.0
        self.captureIdle = 5.0
        self.known: dict[str, Any] | None = None
        self.knownAt = 0.0
        self.knownFor = 0.75
        self.streams: list[CastClient] = []
        self.streamLimit = STREAM_LIMIT

    async def start(self) -> None:
        await self.listen(0)
        self.keeper = asyncio.create_task(self.keep())

    async def listen(self, port: int) -> None:
        self.server = await asyncio.start_server(self.request, "127.0.0.1", port, limit=65536)
        self.port = self.server.sockets[0].getsockname()[1]
        descriptor = {"port": self.port, "token": self.token, "generation": self.generation, "pid": os.getpid()}
        with self.path.open("w", encoding="utf8") as target:
            os.chmod(self.path, 0o600)
            target.write(json.dumps(descriptor))

    def listening(self) -> bool:
        return self.server is not None and all(sock.fileno() != -1 for sock in self.server.sockets)

    async def keep(self) -> None:
        while True:
            await asyncio.sleep(self.keepEvery)
            if self.listening():
                continue
            self.server.close()
            try:
                await self.listen(self.port)
            except OSError:
                await self.listen(0)
            self.relistened += 1

    async def close(self) -> None:
        if self.keeper is not None:
            self.keeper.cancel()
            self.keeper = None
        if self.reaper is not None:
            self.reaper.cancel()
            self.reaper = None
        if self.capturer is not None:
            self.capturer.cancel()
            self.capturer = None
        await self.cast.halt()
        if self.server:
            self.server.close()
            await self.server.wait_closed()
        try:
            if json.loads(self.path.read_text(encoding="utf8")).get("generation") == self.generation:
                self.path.unlink()
        except (OSError, ValueError):
            pass

    async def state(self) -> dict[str, Any]:
        page = self.owner.page
        signals = await page.evaluate("""(codeSelector) => ({url: location.href, heading: document.querySelector('h1,h2,[role=heading]')?.textContent || '', text: (document.body?.innerText || '').slice(0, 64000), password: [...document.querySelectorAll('input[type=password]')].some(e => e.getBoundingClientRect().height > 0), code: [...document.querySelectorAll(codeSelector)].some(e => e.getBoundingClientRect().height > 0), width: innerWidth, height: innerHeight, historyLength: history.length})""", CODE_FIELD_SELECTOR)
        seen = viewer_state(signals)
        state = seen["state"]
        revision = hashlib.sha256(json.dumps([signals["url"], signals["text"], self.owner.index, self.inputRevision, self.owner.recorder.seen()], ensure_ascii=True).encode()).hexdigest()
        known = {"generation": self.generation, "revision": revision, "state": state, "url": signals["url"], "historyLength": signals["historyLength"], "blocked": seen["blocked"], "inputAllowed": seen["inputAllowed"], "ownerDriven": self.owner.config.get("ownerDriven") is True, "width": signals["width"], "height": signals["height"], "busy": self.agentBusy(), "stream": await streamSurface.surface(self.owner)}
        self.known, self.knownAt = known, time.monotonic()
        return known

    async def recent(self) -> dict[str, Any]:
        if self.known is not None and time.monotonic() - self.knownAt < self.knownFor:
            return self.known
        return await asyncio.wait_for(self.state(), 5)

    def agentBusy(self) -> bool:
        return self.owner.controlLock.locked() and not self.capturing

    def size(self) -> tuple[float, float]:
        viewport = getattr(self.owner.page, "viewport_size", None)
        if isinstance(viewport, dict) and viewport.get("width") and viewport.get("height"):
            return float(viewport["width"]), float(viewport["height"])
        known = self.known or {}
        return float(known.get("width") or 0), float(known.get("height") or 0)

    async def dispatch(self, kind: Any, data: dict[str, Any], width: float, height: float) -> dict[str, Any]:
        page = self.owner.page
        mouse = self.owner.mouse
        if kind == "click":
            x, y = float(data.get("x", -1)), float(data.get("y", -1))
            if width <= 0 or height <= 0:
                width, height = float((await page.evaluate("() => innerWidth")) or 0), float((await page.evaluate("() => innerHeight")) or 0)
            if not 0 <= x <= width or not 0 <= y <= height:
                raise ValueError("browserInputInvalid")
            setattr(mouse, "preempt", True)
            try:
                await page.mouse.click(x, y)
            finally:
                setattr(mouse, "preempt", False)
            if hasattr(mouse, "x"):
                mouse.x, mouse.y = x, y
            return {"x": round(x), "y": round(y)}
        if kind == "text":
            text = data.get("text")
            if not isinstance(text, str) or not text or len(text) > 2048:
                raise ValueError("browserInputInvalid")
            await page.keyboard.insert_text(text)
            return {"chars": len(text)}
        if kind == "key":
            key = data.get("key")
            if key not in INPUT_KEYS:
                raise ValueError("browserInputInvalid")
            await page.keyboard.press(key)
            return {"key": key}
        if kind == "scroll":
            amount = max(-600, min(600, float(data.get("deltaY", 0))))
            await page.mouse.wheel(0, amount)
            return {"deltaY": amount}
        raise ValueError("browserInputInvalid")

    def note(self, kind: str, detail: dict[str, Any], ms: float) -> None:
        line = {"at": time.time(), "n": self.inputRevision, "type": kind, **detail, "ms": round(ms, 1), "url": str(getattr(self.owner.page, "url", "") or "").split("?", 1)[0]}
        try:
            with (self.owner.run_dir / INPUT_LOG).open("a", encoding="utf8") as target:
                target.write(json.dumps(line) + "\n")
        except OSError:
            pass

    async def input(self, data: dict[str, Any]) -> dict[str, Any]:
        if data.get("generation") != self.generation:
            raise ValueError("browserStateChanged")
        if self.agentBusy():
            raise ValueError("browserBusy")
        ownerDriven = self.owner.config.get("ownerDriven") is True
        async with self.inputLock:
            started = time.monotonic()
            if ownerDriven:
                width, height = self.size()
            else:
                state = await self.state()
                if data.get("revision") != state["revision"]:
                    raise ValueError("browserStateChanged")
                if state["blocked"] or not state["inputAllowed"]:
                    raise ValueError("browserInputStopped")
                width, height = float(state["width"]), float(state["height"])
            kind = str(data.get("type"))
            try:
                detail = await self.dispatch(kind, data, width, height)
            except ValueError:
                raise
            except Exception as error:
                raise ValueError("browserInputFailed") from error
            self.inputRevision += 1
            setattr(self.owner, "ownerInputAt", time.monotonic())
            self.note(kind, detail, (time.monotonic() - started) * 1000)
            self.captureSoon(kind)
        if ownerDriven and self.known is not None:
            return {**self.known, "busy": self.agentBusy()}
        for _attempt in range(10):
            try:
                return await self.state()
            except Exception:
                await asyncio.sleep(0.3)
        return await self.state()

    def captureSoon(self, kind: str) -> None:
        self.captureKind = kind
        self.inputAt = asyncio.get_running_loop().time()
        if self.capturer is None:
            self.capturer = asyncio.create_task(self.captureLater())

    async def captureLater(self) -> None:
        loop = asyncio.get_running_loop()
        try:
            while True:
                while True:
                    await asyncio.sleep(self.captureTick)
                    moved = str(getattr(self.owner.page, "url", "") or "") != self.capturedUrl
                    if loop.time() - self.inputAt >= (self.captureMoved if moved else self.captureIdle):
                        break
                began = loop.time()
                if not self.owner.controlLock.locked():
                    await self.capture()
                if self.inputAt <= began:
                    return
        finally:
            self.capturer = None

    async def capture(self) -> None:
        async with self.owner.controlLock:
            self.capturing = True
            previous = self.owner.opts
            self.owner.opts = {"quietMs": 0, "settleMaxMs": 1, "reaLater": True}
            try:
                async def nothing() -> None:
                    return None
                result = await self.owner.step("viewerInput", self.captureKind, nothing)
                self.capturedUrl = str(getattr(self.owner.page, "url", "") or "")
                with Path(self.owner.config["repliesPath"]).open("a", encoding="utf8") as target:
                    target.write(json.dumps({"id": f"viewer{self.inputRevision}", "result": result}) + "\n")
            except Exception:
                pass
            finally:
                self.owner.opts = previous
                self.capturing = False

    def ticket(self, seconds: Any) -> dict[str, Any]:
        now = time.monotonic()
        self.tickets = {key: until for key, until in self.tickets.items() if until > now}
        while len(self.tickets) >= TICKET_LIMIT:
            self.tickets.pop(next(iter(self.tickets)))
        ttl = seconds if isinstance(seconds, int) and not isinstance(seconds, bool) and 0 < seconds <= TICKET_MAX_SECONDS else TICKET_SECONDS
        value = secrets.token_urlsafe(24)
        self.tickets[value] = now + ttl
        return {"ticket": value, "expiresIn": ttl, "generation": self.generation}

    def redeem(self, value: str) -> bool:
        until = self.tickets.pop(value, None) if value else None
        return until is not None and until > time.monotonic()

    async def reap(self) -> None:
        loop = asyncio.get_running_loop()
        try:
            while loop.time() < self.pullUntil:
                await asyncio.sleep(min(0.5, max(0.05, self.pullUntil - loop.time())))
            puller, self.puller = self.puller, None
            if puller is not None:
                await self.cast.leave(puller)
        finally:
            self.reaper = None

    async def pull(self, after: int, width: int, height: int) -> tuple[dict[str, Any], int] | None:
        loop = asyncio.get_running_loop()
        self.pullUntil = loop.time() + self.pullLease
        if self.puller is None or self.cast.page is not self.owner.page:
            client = self.puller or CastClient()
            try:
                await self.cast.join(client, width, height)
            except Exception:
                self.puller = None
                return None
            self.puller = client
        if self.reaper is None:
            self.reaper = asyncio.create_task(self.reap())
        cast = self.cast
        if cast.latest is None or cast.seq <= after:
            fresh = cast.fresh
            try:
                await asyncio.wait_for(fresh.wait(), self.pullWait if cast.latest is not None else self.firstWait)
            except asyncio.TimeoutError:
                pass
        if cast.latest is None:
            return None
        return cast.latest, cast.seq

    async def frame(self, query: dict[str, list[str]]) -> tuple[bytes, dict[str, str]]:
        raw = (query.get("after") or ["0"])[0]
        after = int(raw) if raw.isdigit() and len(raw) < 16 else 0
        state = await self.recent()
        pulled = await self.pull(after, int(state["width"]), int(state["height"]))
        if pulled is None:
            body = await self.owner.page.screenshot(type="jpeg", quality=65, scale="css", timeout=5000)
            source, seq = "screenshot", 0
        else:
            body, source, seq = bytes(pulled[0]["data"]), "cast", pulled[1]
        return body, {"X-Log-Browser-Generation": self.generation, "X-Log-Browser-Revision": state["revision"], "X-Log-Frame-Seq": str(seq), "X-Log-Frame-Source": source}

    def part(self, frame: dict[str, Any]) -> bytes:
        data = bytes(frame["data"])
        head = {"Content-Type": "image/jpeg", "Content-Length": str(len(data)), "X-Log-Browser-Generation": self.generation, "X-Log-Frame-Width": str(frame.get("viewportWidth", 0)), "X-Log-Frame-Height": str(frame.get("viewportHeight", 0))}
        return (f"--{BOUNDARY}\r\n" + "".join(f"{key}: {value}\r\n" for key, value in head.items()) + "\r\n").encode() + data + b"\r\n"

    async def stream(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, opened: list[bool], cors: bool = False) -> None:
        state = await self.recent()
        client = CastClient()
        page = await self.cast.join(client, int(state["width"]), int(state["height"]))
        self.streams.append(client)
        while len(self.streams) > self.streamLimit:
            self.streams.pop(0).replace()
        try:
            first = await page.screenshot(type="jpeg", quality=65, scale="css", timeout=5000)
            head = {"Content-Type": f"multipart/x-mixed-replace; boundary={BOUNDARY}", "Cache-Control": "no-store", "Connection": "close", "X-Log-Browser-Generation": self.generation, **(CORS_HEADERS if cors else {})}
            writer.write(("HTTP/1.1 200 Result\r\n" + "".join(f"{key}: {value}\r\n" for key, value in head.items()) + "\r\n").encode())
            opened.append(True)
            last = {"data": first, "viewportWidth": state["width"], "viewportHeight": state["height"]}
            writer.write(self.part(last))
            await writer.drain()
            sent = asyncio.get_running_loop().time()
            while not client.replaced and not reader.at_eof() and not writer.is_closing() and self.owner.page is page and self.cast.page is page and not getattr(page, "is_closed", lambda: False)():
                try:
                    await asyncio.wait_for(client.ready.wait(), self.castPoll)
                except asyncio.TimeoutError:
                    if asyncio.get_running_loop().time() - sent < self.castRepeat:
                        continue
                if client.replaced:
                    break
                frame = client.take() or last
                last = frame
                writer.write(self.part(frame))
                await writer.drain()
                sent = asyncio.get_running_loop().time()
            if not writer.is_closing():
                if client.replaced:
                    writer.write(self.ended("replaced"))
                writer.write(f"--{BOUNDARY}--\r\n".encode())
                await writer.drain()
        finally:
            if client in self.streams:
                self.streams.remove(client)
            await self.cast.leave(client)

    def ended(self, reason: str) -> bytes:
        data = json.dumps({"ended": reason}).encode()
        return (f"--{BOUNDARY}\r\nContent-Type: application/json\r\nContent-Length: {len(data)}\r\nX-Log-Stream-Ended: {reason}\r\n\r\n").encode() + data + b"\r\n"

    async def request(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        status, contentType, body, extra = 503, "application/json", b'{"error":"browserUnavailable"}', {}
        streamed = False
        opened: list[bool] = []
        try:
            header = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 5)
            lines = header.decode("latin1").split("\r\n")
            method, target, _version = lines[0].split(" ", 2)
            address = urlsplit(target)
            path, query = address.path, parse_qs(address.query)
            headers = dict(line.split(":", 1) for line in lines[1:] if ":" in line)
            headers = {key.lower(): value.strip() for key, value in headers.items()}
            ticketed = path == "/stream" and "ticket" in query
            if ticketed:
                extra = dict(CORS_HEADERS)
            if method == "OPTIONS" and path == "/stream":
                status, body, extra = 204, b"", dict(CORS_HEADERS)
            elif ticketed and method == "GET" and self.redeem((query.get("ticket") or [""])[0]):
                streamed = True
                await self.stream(reader, writer, opened, cors=True)
            elif ticketed:
                status, body = 403, b'{"error":"browserAccessDenied"}'
            elif not secrets.compare_digest(headers.get("authorization", ""), f"Bearer {self.token}"):
                status, body = 403, b'{"error":"browserAccessDenied"}'
            elif method == "GET" and path == "/stream":
                streamed = True
                await self.stream(reader, writer, opened)
            elif method == "GET" and path == "/frame":
                body, extra = await self.frame(query)
                contentType = "image/jpeg"
                status = 200
            elif method == "GET" and path == "/state":
                body = json.dumps(await asyncio.wait_for(self.state(), 5)).encode()
                status = 200
            elif method == "POST" and path == "/ticket":
                length = int(headers.get("content-length", "0"))
                if not 0 <= length <= 1024:
                    raise ValueError("browserInputInvalid")
                data = json.loads(await asyncio.wait_for(reader.readexactly(length), 5)) if length else {}
                body = json.dumps(self.ticket(data.get("seconds") if isinstance(data, dict) else None)).encode()
                status = 200
            elif method == "POST" and path == "/input":
                length = int(headers.get("content-length", "0"))
                if not 0 < length <= 16384:
                    raise ValueError("browserInputInvalid")
                data = json.loads(await asyncio.wait_for(reader.readexactly(length), 5))
                if not isinstance(data, dict):
                    raise ValueError("browserInputInvalid")
                body = json.dumps(await self.input(data)).encode()
                status = 200
            else:
                status, body = 404, b'{"error":"browserRouteMissing"}'
        except ValueError as error:
            code = str(error)
            if code not in {"browserBusy", "browserStateChanged", "browserInputStopped", "browserInputInvalid", "browserInputFailed"}:
                code = "browserInputInvalid"
            status, body = 409, json.dumps({"error": code}).encode()
        except Exception:
            pass
        try:
            if opened:
                return
            if streamed and status == 503:
                body = b'{"error":"browserStreamUnavailable"}'
            responseHeaders = {"Content-Type": contentType, "Content-Length": str(len(body)), "Cache-Control": "no-store", "Connection": "close", **extra}
            writer.write((f"HTTP/1.1 {status} Result\r\n" + "".join(f"{key}: {value}\r\n" for key, value in responseHeaders.items()) + "\r\n").encode() + body)
            await writer.drain()
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass
