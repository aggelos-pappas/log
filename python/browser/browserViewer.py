from __future__ import annotations

import asyncio
import hashlib
import json
import os
import secrets
from pathlib import Path
from typing import Any
from browser import streamSurface
from browser.viewerState import CODE_FIELD_SELECTOR, viewer_state

BOUNDARY = "logFrame"
CAST_QUALITY = 70


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

    def offer(self, frame: dict[str, Any]) -> None:
        self.latest = frame
        self.ready.set()

    def take(self) -> dict[str, Any] | None:
        frame, self.latest = self.latest, None
        self.ready.clear()
        return frame


class PageCast:
    def __init__(self, owner: Any) -> None:
        self.owner = owner
        self.clients: set[CastClient] = set()
        self.page: Any = None
        self.lock = asyncio.Lock()
        self.start = screencast_start
        self.stop = screencast_stop

    def frame(self, frame: dict[str, Any]) -> None:
        if not isinstance(frame.get("data"), (bytes, bytearray)):
            return
        for client in list(self.clients):
            client.offer(frame)

    async def halt(self) -> None:
        page, self.page = self.page, None
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

    async def start(self) -> None:
        self.server = await asyncio.start_server(self.request, "127.0.0.1", 0, limit=65536)
        port = self.server.sockets[0].getsockname()[1]
        descriptor = {"port": port, "token": self.token, "generation": self.generation, "pid": os.getpid()}
        with self.path.open("w", encoding="utf8") as target:
            os.chmod(self.path, 0o600)
            target.write(json.dumps(descriptor))

    async def close(self) -> None:
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
        return {"generation": self.generation, "revision": revision, "state": state, "url": signals["url"], "historyLength": signals["historyLength"], "blocked": seen["blocked"], "inputAllowed": seen["inputAllowed"], "width": signals["width"], "height": signals["height"], "busy": self.owner.controlLock.locked(), "stream": await streamSurface.surface(self.owner)}

    async def input(self, data: dict[str, Any]) -> dict[str, Any]:
        if self.owner.controlLock.locked():
            raise ValueError("browserBusy")
        async with self.owner.controlLock:
            state = await self.state()
            if data.get("generation") != self.generation or data.get("revision") != state["revision"]:
                raise ValueError("browserStateChanged")
            if state["blocked"] or not state["inputAllowed"]:
                raise ValueError("browserInputStopped")
            kind = data.get("type")
            async def perform() -> None:
                page = self.owner.page
                if kind == "click":
                    x, y = float(data.get("x", -1)), float(data.get("y", -1))
                    if not 0 <= x <= state["width"] or not 0 <= y <= state["height"]:
                        raise ValueError("browserInputInvalid")
                    await self.owner.mouse.glide(x, y, "viewerClick")
                    await page.mouse.click(x, y)
                elif kind == "text":
                    text = data.get("text")
                    if not isinstance(text, str) or len(text) > 2048:
                        raise ValueError("browserInputInvalid")
                    await page.keyboard.insert_text(text)
                elif kind == "key":
                    key = data.get("key")
                    if key not in {"Enter", "Tab", "Backspace", "Delete", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Escape", "Space", "Home", "End"}:
                        raise ValueError("browserInputInvalid")
                    await page.keyboard.press(key)
                elif kind == "scroll":
                    amount = max(-600, min(600, float(data.get("deltaY", 0))))
                    await page.mouse.wheel(0, amount)
                else:
                    raise ValueError("browserInputInvalid")
            self.inputRevision += 1
            previous = self.owner.opts
            self.owner.opts = {"quietMs": 0, "settleMaxMs": 1}
            try:
                result = await self.owner.step("viewerInput", str(kind), perform)
                with Path(self.owner.config["repliesPath"]).open("a", encoding="utf8") as target:
                    target.write(json.dumps({"id": f"viewer{self.inputRevision}", "result": result}) + "\n")
            finally:
                self.owner.opts = previous
            if not result.get("ok"):
                raise ValueError("browserInputFailed")
        for _attempt in range(10):
            try:
                return await self.state()
            except Exception:
                await asyncio.sleep(0.3)
        return await self.state()

    def part(self, frame: dict[str, Any]) -> bytes:
        data = bytes(frame["data"])
        head = {"Content-Type": "image/jpeg", "Content-Length": str(len(data)), "X-Log-Browser-Generation": self.generation, "X-Log-Frame-Width": str(frame.get("viewportWidth", 0)), "X-Log-Frame-Height": str(frame.get("viewportHeight", 0))}
        return (f"--{BOUNDARY}\r\n" + "".join(f"{key}: {value}\r\n" for key, value in head.items()) + "\r\n").encode() + data + b"\r\n"

    async def stream(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, opened: list[bool]) -> None:
        state = await asyncio.wait_for(self.state(), 5)
        client = CastClient()
        page = await self.cast.join(client, int(state["width"]), int(state["height"]))
        try:
            first = await page.screenshot(type="jpeg", quality=65, scale="css", timeout=5000)
            head = {"Content-Type": f"multipart/x-mixed-replace; boundary={BOUNDARY}", "Cache-Control": "no-store", "Connection": "close", "X-Log-Browser-Generation": self.generation}
            writer.write(("HTTP/1.1 200 Result\r\n" + "".join(f"{key}: {value}\r\n" for key, value in head.items()) + "\r\n").encode())
            opened.append(True)
            last = {"data": first, "viewportWidth": state["width"], "viewportHeight": state["height"]}
            writer.write(self.part(last))
            await writer.drain()
            sent = asyncio.get_running_loop().time()
            while not reader.at_eof() and not writer.is_closing() and self.owner.page is page and self.cast.page is page and not getattr(page, "is_closed", lambda: False)():
                try:
                    await asyncio.wait_for(client.ready.wait(), self.castPoll)
                except asyncio.TimeoutError:
                    if asyncio.get_running_loop().time() - sent < self.castRepeat:
                        continue
                frame = client.take() or last
                last = frame
                writer.write(self.part(frame))
                await writer.drain()
                sent = asyncio.get_running_loop().time()
            if not writer.is_closing():
                writer.write(f"--{BOUNDARY}--\r\n".encode())
                await writer.drain()
        finally:
            await self.cast.leave(client)

    async def request(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        status, contentType, body, extra = 503, "application/json", b'{"error":"browserUnavailable"}', {}
        streamed = False
        opened: list[bool] = []
        try:
            header = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 5)
            lines = header.decode("latin1").split("\r\n")
            method, path, _version = lines[0].split(" ", 2)
            headers = dict(line.split(":", 1) for line in lines[1:] if ":" in line)
            headers = {key.lower(): value.strip() for key, value in headers.items()}
            if not secrets.compare_digest(headers.get("authorization", ""), f"Bearer {self.token}"):
                status, body = 403, b'{"error":"browserAccessDenied"}'
            elif method == "GET" and path == "/stream":
                streamed = True
                await self.stream(reader, writer, opened)
            elif method == "GET" and path in {"/state", "/frame"}:
                state = await asyncio.wait_for(self.state(), 5)
                if path == "/frame":
                    body = await self.owner.page.screenshot(type="jpeg", quality=65, scale="css", timeout=5000)
                    contentType = "image/jpeg"
                    extra = {"X-Log-Browser-Generation": self.generation, "X-Log-Browser-Revision": state["revision"]}
                else:
                    body = json.dumps(state).encode()
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
