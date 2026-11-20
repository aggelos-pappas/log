import asyncio
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from browser.browserViewer import BrowserViewer
from browser import streamSurface

LOGIN_PAGE = {"url": "http://127.0.0.1:9/login", "heading": "Log in", "text": "Log in to continue", "password": True, "code": False, "width": 800, "height": 600, "historyLength": 1}
HOME_PAGE = {"url": "http://127.0.0.1:9/home", "heading": "Home", "text": "Welcome back", "password": False, "code": False, "width": 800, "height": 600, "historyLength": 2}
CHECKPOINT_PAGE = {"url": "http://127.0.0.1:9/checkpoint/123", "heading": "Confirm your identity", "text": "Upload a photo ID", "password": False, "code": False, "width": 800, "height": 600, "historyLength": 1}


class FakeMouse:
    def __init__(self, page):
        self.page = page

    async def click(self, x, y):
        self.page.actions.append(("click", x, y))

    async def wheel(self, dx, dy):
        self.page.actions.append(("wheel", dx, dy))


class FakeKeyboard:
    def __init__(self, page):
        self.page = page

    async def insert_text(self, text):
        self.page.actions.append(("text", text))

    async def press(self, key):
        self.page.actions.append(("key", key))


class FakePage:
    def __init__(self, signals):
        self.signals = dict(signals)
        self.actions = []
        self.mouse = FakeMouse(self)
        self.keyboard = FakeKeyboard(self)

    async def evaluate(self, _script, *_args):
        return dict(self.signals)

    async def screenshot(self, **_options):
        return b"\xff\xd8\xff\xe0fakejpeg\xff\xd9"


class FakeRecorder:
    def seen(self):
        return 0


class FakeGlide:
    def __init__(self):
        self.glides = []

    async def glide(self, x, y, kind):
        self.glides.append((x, y, kind))
        return True


class FakeOwner:
    def __init__(self, folder, signals):
        self.run_dir = Path(folder)
        self.page = FakePage(signals)
        self.index = 0
        self.recorder = FakeRecorder()
        self.controlLock = asyncio.Lock()
        self.mouse = FakeGlide()
        self.opts = {}
        self.steps = []
        self.config = {"repliesPath": str(self.run_dir / "replies.jsonl")}

    async def step(self, action, label, act):
        self.index += 1
        self.steps.append((action, label))
        await act()
        return {"ok": True, "step": f"{self.index:02d}_{action}"}


async def call(port, token, method, path, body=None):
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    data = json.dumps(body).encode() if body is not None else b""
    head = f"{method} {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer {token}\r\nContent-Length: {len(data)}\r\n\r\n"
    writer.write(head.encode() + data)
    await writer.drain()
    raw = await reader.read()
    writer.close()
    header, _, payload = raw.partition(b"\r\n\r\n")
    status = int(header.split(b" ")[1])
    headers = {line.split(b":", 1)[0].decode(): line.split(b":", 1)[1].decode().strip() for line in header.split(b"\r\n")[1:] if b":" in line}
    return status, headers, payload


class BrowserViewerTests(unittest.TestCase):
    def setUp(self):
        os.environ.pop("LOG_VOXL_URL", None)

    def run_with(self, signals, scenario, owner_driven=False):
        async def main():
            with tempfile.TemporaryDirectory() as folder:
                owner = FakeOwner(folder, signals)
                if owner_driven:
                    owner.config["ownerDriven"] = True
                viewer = BrowserViewer(owner)
                await viewer.start()
                try:
                    descriptor = json.loads((Path(folder) / "browserViewer.json").read_text(encoding="utf8"))
                    await scenario(owner, viewer, descriptor)
                finally:
                    await viewer.close()
                self.assertFalse((Path(folder) / "browserViewer.json").exists())
        asyncio.run(main())

    def test_the_descriptor_names_a_loopback_port_a_token_and_a_generation(self):
        async def scenario(_owner, viewer, descriptor):
            self.assertEqual(descriptor["generation"], viewer.generation)
            self.assertRegex(descriptor["generation"], r"^[a-f0-9]{32}$")
            self.assertEqual(descriptor["pid"], os.getpid())
            status, _headers, _body = await call(descriptor["port"], "wrong", "GET", "/state")
            self.assertEqual(status, 403)
        self.run_with(LOGIN_PAGE, scenario)

    def test_a_sign_in_page_allows_input_and_reports_its_revision(self):
        async def scenario(_owner, _viewer, descriptor):
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            state = json.loads(body)
            self.assertEqual(status, 200)
            self.assertEqual(state["state"], "loginForm")
            self.assertTrue(state["inputAllowed"])
            self.assertFalse(state["blocked"])
            self.assertRegex(state["revision"], r"^[a-f0-9]{64}$")
            self.assertIsNone(state["stream"])
        self.run_with(LOGIN_PAGE, scenario)

    @unittest.skipUnless(os.name == "nt", "the proactor event loop is Windows only")
    def test_the_viewer_listens_again_after_windows_drops_its_listening_socket(self):
        async def scenario(_owner, viewer, descriptor):
            loop = asyncio.get_running_loop()
            seen = []
            loop.set_exception_handler(lambda _loop, context: seen.append(context.get("message")))
            proactor = loop._proactor
            real = proactor.accept

            def accept(sock):
                proactor.accept = real
                failed = loop.create_future()
                failed.set_exception(OSError(22, "The specified network name is no longer available", None, 64))
                return failed

            proactor.accept = accept
            viewer.keepEvery = 0.05
            status, _headers, _body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            self.assertEqual(status, 200)
            await asyncio.sleep(0.05)
            self.assertIn("Accept failed on a socket", seen)
            for _ in range(60):
                if viewer.relistened:
                    break
                await asyncio.sleep(0.05)
            self.assertEqual(viewer.relistened, 1)
            again = json.loads(viewer.path.read_text(encoding="utf8"))
            self.assertEqual((again["generation"], again["token"]), (descriptor["generation"], descriptor["token"]))
            status, _headers, body = await call(again["port"], again["token"], "GET", "/state")
            self.assertEqual(status, 200, body)
            self.assertEqual(json.loads(body)["generation"], viewer.generation)
        self.run_with(LOGIN_PAGE, scenario)

    def test_the_frame_is_a_jpeg_with_generation_and_revision_headers(self):
        async def scenario(_owner, viewer, descriptor):
            status, headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/frame")
            self.assertEqual(status, 200)
            self.assertEqual(headers["Content-Type"], "image/jpeg")
            self.assertEqual(headers["X-Log-Browser-Generation"], viewer.generation)
            self.assertRegex(headers["X-Log-Browser-Revision"], r"^[a-f0-9]{64}$")
            self.assertTrue(body.startswith(b"\xff\xd8"))
        self.run_with(LOGIN_PAGE, scenario)

    def test_a_click_reaches_the_page_at_once_and_is_captured_as_a_step_once_input_goes_quiet(self):
        async def scenario(owner, viewer, descriptor):
            viewer.captureMoved = viewer.captureIdle = 0.1
            viewer.captureTick = 0.02
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            revision = json.loads(body)["revision"]
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "click", "x": 40, "y": 50, "generation": viewer.generation, "revision": revision})
            self.assertEqual(status, 200, body)
            self.assertEqual(owner.page.actions, [("click", 40.0, 50.0)])
            self.assertEqual(owner.mouse.glides, [])
            self.assertEqual(owner.steps, [])
            inputs = [json.loads(line) for line in (Path(owner.run_dir) / "inputs.jsonl").read_text(encoding="utf8").splitlines()]
            self.assertEqual([(row["type"], row["x"], row["y"]) for row in inputs], [("click", 40, 50)])
            self.assertNotEqual(json.loads(body)["revision"], revision)
            for _attempt in range(100):
                if owner.steps:
                    break
                await asyncio.sleep(0.05)
            self.assertEqual(owner.steps, [("viewerInput", "click")])
            replies = [json.loads(line) for line in Path(owner.config["repliesPath"]).read_text(encoding="utf8").splitlines()]
            self.assertEqual(replies[0]["id"], "viewer1")
        self.run_with(LOGIN_PAGE, scenario)

    def test_typed_text_is_logged_by_length_never_by_its_characters(self):
        async def scenario(owner, viewer, descriptor):
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "text", "text": "hunter2", "generation": viewer.generation, "revision": json.loads(body)["revision"]})
            self.assertEqual(status, 200, body)
            logged = (Path(owner.run_dir) / "inputs.jsonl").read_text(encoding="utf8")
            self.assertNotIn("hunter2", logged)
            self.assertEqual(json.loads(logged)["chars"], 7)
        self.run_with(LOGIN_PAGE, scenario)

    def test_owner_input_never_reports_busy_and_is_not_held_up_by_a_running_capture(self):
        async def scenario(owner, viewer, descriptor):
            viewer.captureMoved = viewer.captureIdle = 0.05
            viewer.captureTick = 0.01
            release = asyncio.Event()
            async def slow_step(action, label, act):
                owner.steps.append((action, label))
                await act()
                await release.wait()
                return {"ok": True, "step": "01_viewerInput"}
            owner.step = slow_step
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            revision = json.loads(body)["revision"]
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "click", "x": 10, "y": 20, "generation": viewer.generation, "revision": revision})
            self.assertEqual(status, 200, body)
            for _attempt in range(100):
                if viewer.capturing:
                    break
                await asyncio.sleep(0.05)
            self.assertTrue(viewer.capturing)
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            self.assertFalse(json.loads(body)["busy"])
            started = asyncio.get_running_loop().time()
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "scroll", "deltaY": 120, "generation": viewer.generation, "revision": "0" * 64})
            took = asyncio.get_running_loop().time() - started
            self.assertEqual(status, 200, body)
            self.assertFalse(json.loads(body)["busy"])
            self.assertLess(took, 0.5)
            self.assertEqual(owner.page.actions, [("click", 10.0, 20.0), ("wheel", 0, 120.0)])
            release.set()
        self.run_with(HOME_PAGE, scenario, owner_driven=True)

    def test_an_agent_step_in_flight_shows_busy_and_refuses_owner_input(self):
        async def scenario(owner, viewer, descriptor):
            async with owner.controlLock:
                _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
                self.assertTrue(json.loads(body)["busy"])
                status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "click", "x": 10, "y": 20, "generation": viewer.generation, "revision": "0" * 64})
                self.assertEqual(status, 409)
                self.assertEqual(json.loads(body)["error"], "browserBusy")
            self.assertEqual(owner.page.actions, [])
        self.run_with(HOME_PAGE, scenario, owner_driven=True)

    def test_a_stale_revision_is_refused_and_nothing_reaches_the_page(self):
        async def scenario(owner, viewer, descriptor):
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "text", "text": "hello", "generation": viewer.generation, "revision": "0" * 64})
            self.assertEqual(status, 409)
            self.assertEqual(json.loads(body)["error"], "browserStateChanged")
            self.assertEqual(owner.page.actions, [])
        self.run_with(LOGIN_PAGE, scenario)

    def test_a_page_no_longer_in_a_sign_in_state_refuses_input(self):
        async def scenario(owner, viewer, descriptor):
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            revision = json.loads(body)["revision"]
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "key", "key": "Enter", "generation": viewer.generation, "revision": revision})
            self.assertEqual(status, 409)
            self.assertEqual(json.loads(body)["error"], "browserInputStopped")
            self.assertEqual(owner.page.actions, [])
        self.run_with(HOME_PAGE, scenario)

    def test_a_browser_the_owner_opened_to_drive_takes_a_click_on_any_page(self):
        async def scenario(owner, viewer, descriptor):
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            state = json.loads(body)
            self.assertTrue(state["ownerDriven"])
            self.assertFalse(state["inputAllowed"])
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "click", "x": 10, "y": 20, "generation": viewer.generation, "revision": state["revision"]})
            self.assertEqual(status, 200, body)
            self.assertEqual(owner.page.actions, [("click", 10.0, 20.0)])
            self.assertEqual(owner.steps, [])
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "click", "x": 30, "y": 40, "generation": viewer.generation, "revision": "0" * 64})
            self.assertEqual(status, 200, body)
            self.assertEqual(owner.page.actions[-1], ("click", 30.0, 40.0))
        self.run_with(HOME_PAGE, scenario, owner_driven=True)

    def test_a_browser_the_agent_opened_reports_it_is_not_owner_driven(self):
        async def scenario(_owner, _viewer, descriptor):
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            self.assertFalse(json.loads(body)["ownerDriven"])
        self.run_with(HOME_PAGE, scenario)

    def test_a_checkpoint_is_blocked(self):
        async def scenario(_owner, _viewer, descriptor):
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            state = json.loads(body)
            self.assertTrue(state["blocked"])
            self.assertFalse(state["inputAllowed"])
        self.run_with(CHECKPOINT_PAGE, scenario)

    def test_keys_outside_the_list_are_invalid(self):
        async def scenario(owner, viewer, descriptor):
            _status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/state")
            revision = json.loads(body)["revision"]
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/input", {"type": "key", "key": "F12", "generation": viewer.generation, "revision": revision})
            self.assertEqual(status, 409)
            self.assertEqual(json.loads(body)["error"], "browserInputInvalid")
            self.assertEqual(owner.page.actions, [])
        self.run_with(LOGIN_PAGE, scenario)


class FakeCast:
    def __init__(self, fail=False):
        self.fail = fail
        self.started = []
        self.stopped = []
        self.on_frame = None

    async def start(self, page, on_frame, width, height):
        if self.fail:
            raise RuntimeError("screencastFailed")
        self.started.append((page, width, height))
        self.on_frame = on_frame

    async def stop(self, page):
        self.stopped.append(page)
        self.on_frame = None

    def emit(self, data, width=800, height=600):
        self.on_frame({"data": data, "viewportWidth": width, "viewportHeight": height})


async def open_stream(port, token):
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    writer.write(f"GET /stream HTTP/1.1\r\nHost: 127.0.0.1\r\nAuthorization: Bearer {token}\r\n\r\n".encode())
    await writer.drain()
    header = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 5)
    lines = header.decode("latin1").split("\r\n")
    headers = {line.split(":", 1)[0]: line.split(":", 1)[1].strip() for line in lines[1:] if ":" in line}
    return reader, writer, int(lines[0].split(" ")[1]), headers


async def read_part(reader):
    first = await asyncio.wait_for(reader.readuntil(b"\r\n"), 5)
    if first == b"--logFrame--\r\n":
        return None, None
    head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 5)
    headers = {line.split(":", 1)[0]: line.split(":", 1)[1].strip() for line in head.decode("latin1").split("\r\n") if ":" in line}
    data = await reader.readexactly(int(headers["Content-Length"]))
    await reader.readexactly(2)
    return headers, data


class CastCase(unittest.TestCase):
    def run_cast(self, scenario, fail=False):
        async def main():
            with tempfile.TemporaryDirectory() as folder:
                owner = FakeOwner(folder, LOGIN_PAGE)
                viewer = BrowserViewer(owner)
                cast = FakeCast(fail)
                viewer.cast.start = cast.start
                viewer.cast.stop = cast.stop
                viewer.castPoll = 0.02
                await viewer.start()
                try:
                    descriptor = json.loads((Path(folder) / "browserViewer.json").read_text(encoding="utf8"))
                    await scenario(owner, viewer, cast, descriptor)
                finally:
                    await viewer.close()
        asyncio.run(main())

    async def until(self, check):
        for _attempt in range(100):
            if check():
                return
            await asyncio.sleep(0.02)
        self.fail("the condition never held")


class BrowserStreamTests(CastCase):
    def test_the_stream_needs_the_token(self):
        async def scenario(_owner, _viewer, cast, descriptor):
            status, _headers, body = await call(descriptor["port"], "wrong", "GET", "/stream")
            self.assertEqual(status, 403)
            self.assertEqual(json.loads(body)["error"], "browserAccessDenied")
            self.assertEqual(cast.started, [])
        self.run_cast(scenario)

    def test_the_stream_sends_one_jpeg_part_per_screencast_frame(self):
        async def scenario(owner, viewer, cast, descriptor):
            reader, writer, status, headers = await open_stream(descriptor["port"], descriptor["token"])
            try:
                self.assertEqual(status, 200)
                self.assertEqual(headers["Content-Type"], "multipart/x-mixed-replace; boundary=logFrame")
                self.assertEqual(headers["X-Log-Browser-Generation"], viewer.generation)
                self.assertEqual(cast.started, [(owner.page, 800, 600)])
                part, data = await read_part(reader)
                self.assertTrue(data.startswith(b"\xff\xd8"))
                self.assertEqual(part["X-Log-Browser-Generation"], viewer.generation)
                cast.emit(b"\xff\xd8first\xff\xd9", 1280, 720)
                part, data = await read_part(reader)
                self.assertEqual(data, b"\xff\xd8first\xff\xd9")
                self.assertEqual((part["Content-Type"], part["X-Log-Frame-Width"], part["X-Log-Frame-Height"]), ("image/jpeg", "1280", "720"))
            finally:
                writer.close()
        self.run_cast(scenario)

    def test_a_slow_reader_gets_only_the_latest_frame(self):
        async def scenario(_owner, _viewer, cast, descriptor):
            reader, writer, _status, _headers = await open_stream(descriptor["port"], descriptor["token"])
            try:
                await read_part(reader)
                for index in range(5):
                    cast.emit(f"frame{index}".encode())
                _part, data = await read_part(reader)
                self.assertEqual(data, b"frame4")
                cast.emit(b"frame5")
                _part, data = await read_part(reader)
                self.assertEqual(data, b"frame5")
            finally:
                writer.close()
        self.run_cast(scenario)

    def test_two_readers_share_one_screencast_and_the_last_to_leave_stops_it(self):
        async def scenario(owner, viewer, cast, descriptor):
            first = await open_stream(descriptor["port"], descriptor["token"])
            second = await open_stream(descriptor["port"], descriptor["token"])
            await read_part(first[0])
            await read_part(second[0])
            self.assertEqual(len(cast.started), 1)
            first[1].close()
            await self.until(lambda: len(viewer.cast.clients) == 1)
            self.assertEqual(cast.stopped, [])
            second[1].close()
            await self.until(lambda: cast.stopped == [owner.page])
            self.assertIsNone(viewer.cast.page)
        self.run_cast(scenario)

    def test_a_new_page_ends_the_stream_so_the_view_reconnects(self):
        async def scenario(owner, _viewer, cast, descriptor):
            reader, writer, _status, _headers = await open_stream(descriptor["port"], descriptor["token"])
            try:
                await read_part(reader)
                old = owner.page
                owner.page = FakePage(LOGIN_PAGE)
                part, _data = await read_part(reader)
                self.assertIsNone(part)
                await self.until(lambda: cast.stopped == [old])
            finally:
                writer.close()
        self.run_cast(scenario)

    def test_a_stream_past_the_limit_replaces_the_oldest_which_is_told_why(self):
        async def scenario(_owner, viewer, cast, descriptor):
            viewer.streamLimit = 2
            first = await open_stream(descriptor["port"], descriptor["token"])
            await read_part(first[0])
            second = await open_stream(descriptor["port"], descriptor["token"])
            await read_part(second[0])
            third = await open_stream(descriptor["port"], descriptor["token"])
            await read_part(third[0])
            try:
                part, data = await read_part(first[0])
                self.assertEqual(part["Content-Type"], "application/json")
                self.assertEqual(part["X-Log-Stream-Ended"], "replaced")
                self.assertEqual(json.loads(data), {"ended": "replaced"})
                part, _data = await read_part(first[0])
                self.assertIsNone(part)
                await self.until(lambda: len(viewer.streams) == 2)
                cast.emit(b"newest")
                _part, data = await read_part(third[0])
                self.assertEqual(data, b"newest")
            finally:
                for stream in (first, second, third):
                    stream[1].close()
        self.run_cast(scenario)

    def test_a_screencast_that_fails_to_start_answers_an_error_for_the_frame_fallback(self):
        async def scenario(_owner, viewer, _cast, descriptor):
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/stream")
            self.assertEqual(status, 503)
            self.assertEqual(json.loads(body)["error"], "browserStreamUnavailable")
            self.assertEqual(viewer.cast.clients, set())
        self.run_cast(scenario, fail=True)


async def raw_request(port, method, path, headers=""):
    reader, writer = await asyncio.open_connection("127.0.0.1", port)
    writer.write(f"{method} {path} HTTP/1.1\r\nHost: 127.0.0.1\r\n{headers}\r\n".encode())
    await writer.drain()
    header = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 5)
    lines = header.decode("latin1").split("\r\n")
    found = {line.split(":", 1)[0]: line.split(":", 1)[1].strip() for line in lines[1:] if ":" in line}
    return reader, writer, int(lines[0].split(" ")[1]), found


class BrowserFramePullTests(CastCase):
    def test_frames_come_from_the_screencast_and_wait_for_one_newer_than_the_last(self):
        async def scenario(owner, viewer, cast, descriptor):
            asyncio.get_running_loop().call_later(0.05, cast.emit, b"\xff\xd8one\xff\xd9")
            status, headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/frame?after=0")
            self.assertEqual((status, body, headers["X-Log-Frame-Seq"], headers["X-Log-Frame-Source"]), (200, b"\xff\xd8one\xff\xd9", "1", "cast"))
            self.assertEqual(cast.started, [(owner.page, 800, 600)])
            started = asyncio.get_running_loop().time()
            status, headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/frame?after=1")
            self.assertGreaterEqual(asyncio.get_running_loop().time() - started, 0.2)
            self.assertEqual((body, headers["X-Log-Frame-Seq"]), (b"\xff\xd8one\xff\xd9", "1"))
            asyncio.get_running_loop().call_later(0.05, cast.emit, b"\xff\xd8two\xff\xd9")
            status, headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/frame?after=1")
            self.assertEqual((body, headers["X-Log-Frame-Seq"]), (b"\xff\xd8two\xff\xd9", "2"))
            self.assertEqual(len(cast.started), 1)
        self.run_cast(scenario)

    def test_the_screencast_stops_when_no_view_pulls_for_the_lease(self):
        async def scenario(owner, viewer, cast, descriptor):
            viewer.pullLease = 0.1
            asyncio.get_running_loop().call_later(0.05, cast.emit, b"frame")
            await call(descriptor["port"], descriptor["token"], "GET", "/frame?after=0")
            await self.until(lambda: cast.stopped == [owner.page])
            self.assertIsNone(viewer.puller)
        self.run_cast(scenario)

    def test_without_a_screencast_the_frame_is_a_screenshot(self):
        async def scenario(_owner, _viewer, _cast, descriptor):
            status, headers, body = await call(descriptor["port"], descriptor["token"], "GET", "/frame?after=0")
            self.assertEqual((status, headers["X-Log-Frame-Source"], headers["X-Log-Frame-Seq"]), (200, "screenshot", "0"))
            self.assertTrue(body.startswith(b"\xff\xd8"))
        self.run_cast(scenario, fail=True)


class BrowserTicketTests(CastCase):
    def test_a_ticket_opens_the_stream_once_without_the_token_and_allows_any_origin(self):
        async def scenario(_owner, viewer, cast, descriptor):
            status, _headers, body = await call(descriptor["port"], descriptor["token"], "POST", "/ticket", {"seconds": 30})
            given = json.loads(body)
            self.assertEqual((status, given["expiresIn"], given["generation"]), (200, 30, viewer.generation))
            reader, writer, status, headers = await raw_request(descriptor["port"], "GET", f"/stream?ticket={given['ticket']}")
            try:
                self.assertEqual(status, 200)
                self.assertEqual(headers["Access-Control-Allow-Origin"], "*")
                self.assertEqual(headers["X-Log-Browser-Generation"], viewer.generation)
                part, data = await read_part(reader)
                self.assertTrue(data.startswith(b"\xff\xd8"))
            finally:
                writer.close()
            _reader, again, status, _headers = await raw_request(descriptor["port"], "GET", f"/stream?ticket={given['ticket']}")
            again.close()
            self.assertEqual(status, 403)
        self.run_cast(scenario)

    def test_a_ticket_is_minted_only_with_the_token_and_a_made_up_one_is_refused(self):
        async def scenario(_owner, _viewer, cast, descriptor):
            status, _headers, _body = await call(descriptor["port"], "wrong", "POST", "/ticket", {})
            self.assertEqual(status, 403)
            _reader, writer, status, headers = await raw_request(descriptor["port"], "GET", "/stream?ticket=madeUp")
            writer.close()
            self.assertEqual((status, headers["Access-Control-Allow-Origin"]), (403, "*"))
            self.assertEqual(cast.started, [])
        self.run_cast(scenario)

    def test_the_preflight_allows_a_private_network_read(self):
        async def scenario(_owner, _viewer, _cast, descriptor):
            _reader, writer, status, headers = await raw_request(descriptor["port"], "OPTIONS", "/stream?ticket=any", "Access-Control-Request-Private-Network: true\r\n")
            writer.close()
            self.assertEqual((status, headers["Access-Control-Allow-Private-Network"], headers["Access-Control-Allow-Origin"]), (204, "true", "*"))
        self.run_cast(scenario)


class StreamSurfaceTests(unittest.TestCase):
    def test_no_voxl_url_means_no_stream(self):
        os.environ.pop("LOG_VOXL_URL", None)
        self.assertIsNone(streamSurface.configured())

    def test_only_http_and_https_urls_with_a_host_count(self):
        os.environ["LOG_VOXL_URL"] = "ftp://example.com"
        try:
            self.assertIsNone(streamSurface.configured())
            os.environ["LOG_VOXL_URL"] = "https://voxl.example.com/"
            self.assertEqual(streamSurface.configured(), "https://voxl.example.com/")
        finally:
            os.environ.pop("LOG_VOXL_URL", None)


if __name__ == "__main__":
    unittest.main()
