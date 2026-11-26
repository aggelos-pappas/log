from __future__ import annotations

import asyncio
import socket
import sys
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for p in (str(ROOT), str(ROOT.parent / "vendor" / "endcord")):
    if p not in sys.path:
        sys.path.insert(0, p)

from identity import accountRoute


class FakeProxy:

    def __init__(self) -> None:
        self.seen: list[str] = []
        self.server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.server.bind(("127.0.0.1", 0))
        self.server.listen(8)
        self.port = self.server.getsockname()[1]
        self.thread = threading.Thread(target=self.serve, daemon=True)
        self.thread.start()

    def serve(self) -> None:
        while True:
            try:
                conn, _ = self.server.accept()
            except OSError:
                return
            with conn:
                data = b""
                while b"\r\n\r\n" not in data:
                    chunk = conn.recv(4096)
                    if not chunk:
                        break
                    data += chunk
                head = data.decode("latin1")
                self.seen.append(head)
                conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok")

    def close(self) -> None:
        self.server.close()


class NormalizeTest(unittest.TestCase):

    def test_reads_the_forms_an_account_proxy_is_kept_in(self) -> None:
        self.assertEqual(accountRoute.normalize("gate.example:7000:user-a:fake@pw"), "http://user-a:fake%40pw@gate.example:7000")
        self.assertEqual(accountRoute.normalize("http://user:pw@gate.example:8080"), "http://user:pw@gate.example:8080")
        self.assertEqual(accountRoute.normalize("socks5://gate.example:1080"), "socks5h://gate.example:1080")
        self.assertIsNone(accountRoute.normalize(""))
        self.assertIsNone(accountRoute.normalize(None))

    def test_a_proxy_it_cannot_read_is_refused(self) -> None:
        with self.assertRaises(accountRoute.RouteError) as caught:
            accountRoute.normalize("ftp://gate.example:21")
        self.assertEqual(caught.exception.code, "proxyMalformed")


class ArmTest(unittest.TestCase):

    def tearDown(self) -> None:
        accountRoute.disarm()

    def test_an_engine_spec_without_a_route_is_refused(self) -> None:
        with self.assertRaises(accountRoute.RouteError) as caught:
            accountRoute.arm("discord", {"action": "read"})
        self.assertEqual(caught.exception.code, "routeMissing")

    def test_a_facebook_call_never_goes_out_without_its_proxy(self) -> None:
        with self.assertRaises(accountRoute.RouteError) as caught:
            accountRoute.arm("facebook", {"route": {"proxy": None}})
        self.assertEqual(caught.exception.code, "noProxy")

    def test_a_direct_account_arms_with_no_proxy(self) -> None:
        self.assertEqual(accountRoute.arm("twitter", {"route": {"proxy": None}}), {"platform": "twitter", "proxy": None})
        self.assertIsNone(accountRoute.proxies())


class EnforceTest(unittest.TestCase):

    def tearDown(self) -> None:
        accountRoute.disarm()

    def test_every_call_is_given_the_accounts_proxy(self) -> None:
        accountRoute.arm("slack", {"route": {"proxy": "http://gate.example:8080"}})
        self.assertEqual(accountRoute.enforce(None, {"timeout": 5}), {"timeout": 5, "proxies": {"all": "http://gate.example:8080"}})
        self.assertEqual(accountRoute.enforce({"https": "http://gate.example:8080"}, {})["proxies"], {"all": "http://gate.example:8080"})

    def test_a_client_asking_for_another_proxy_is_refused(self) -> None:
        accountRoute.arm("slack", {"route": {"proxy": "http://gate.example:8080"}})
        with self.assertRaises(accountRoute.RouteError) as caught:
            accountRoute.enforce(None, {"proxy": "http://other.example:3128"})
        self.assertEqual(caught.exception.code, "routeBypass")
        with self.assertRaises(accountRoute.RouteError):
            accountRoute.enforce({"https": "http://other.example:3128"}, {})

    def test_a_direct_account_refuses_a_proxy_it_does_not_have(self) -> None:
        accountRoute.arm("discord", {"route": {"proxy": None}})
        with self.assertRaises(accountRoute.RouteError):
            accountRoute.enforce(None, {"proxies": {"https": "http://other.example:3128"}})
        self.assertEqual(accountRoute.enforce(None, {}), {"proxies": None})

    def test_nothing_changes_when_no_account_is_armed(self) -> None:
        self.assertEqual(accountRoute.enforce(None, {"proxy": "http://other.example:3128"}), {"proxy": "http://other.example:3128"})


class SocketGuardTest(unittest.TestCase):

    def tearDown(self) -> None:
        accountRoute.disarm()

    def test_a_proxied_account_never_resolves_or_dials_a_platform_from_this_machine(self) -> None:
        accountRoute.arm("instagram", {"route": {"proxy": "http://127.0.0.1:9"}})
        with self.assertRaises(accountRoute.RouteRefused):
            socket.getaddrinfo("edge-mqtt.platform.example", 443)
        raw = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            with self.assertRaises(accountRoute.RouteRefused):
                raw.connect(("203.0.113.5", 443))
        finally:
            raw.close()
        self.assertTrue(socket.getaddrinfo("localhost", 80))

    def test_a_direct_account_is_not_held_back(self) -> None:
        accountRoute.arm("discord", {"route": {"proxy": None}})
        self.assertTrue(accountRoute.allowed_host("platform.example"))


class CurlRouteTest(unittest.TestCase):

    def setUp(self) -> None:
        self.proxy = FakeProxy()
        accountRoute.arm("discord", {"route": {"proxy": f"http://127.0.0.1:{self.proxy.port}"}})

    def tearDown(self) -> None:
        accountRoute.disarm()
        self.proxy.close()

    def test_a_librarys_own_session_goes_through_the_accounts_proxy(self) -> None:
        from curl_cffi.requests import AsyncSession, Session

        with Session() as plain:
            self.assertEqual(plain.get("http://api.platform.example/v9/users", timeout=10).text, "ok")

        async def run() -> str:
            async with AsyncSession() as session:
                return (await session.get("http://gateway.platform.example/ws", timeout=10)).text

        self.assertEqual(asyncio.run(run()), "ok")
        lines = [seen.split("\r\n")[0] for seen in self.proxy.seen]
        self.assertIn("GET http://api.platform.example/v9/users HTTP/1.1", lines)
        self.assertIn("GET http://gateway.platform.example/ws HTTP/1.1", lines)

    def test_a_media_link_is_fetched_through_the_route_with_the_browser_identity(self) -> None:
        from identity import browserIdentity

        self.assertEqual(accountRoute.download("http://cdn.platform.example/meme.png", "discord"), b"ok")
        sent = self.proxy.seen[-1]
        self.assertTrue(sent.startswith("GET http://cdn.platform.example/meme.png HTTP/1.1"))
        self.assertIn(browserIdentity.user_agent("discord"), sent)


class DiscordFilesTest(unittest.TestCase):

    def test_endcord_never_opens_its_own_connection_and_files_go_through_the_session(self) -> None:
        from discordApi import browserRest

        calls: list[tuple[str, str]] = []

        class Answer:
            status_code = 200
            headers = {"content-type": "image/png"}

            def __init__(self, content: bytes) -> None:
                self.content = content

        class Recorder:
            def request(self, method: str, url: str, **kwargs: object) -> Answer:
                if "/api/" in url:
                    return Answer(b'{"id": "1"}')
                calls.append((method, url))
                return Answer(b"bytes")

        import base64
        import json

        identity = {"headers": {"user-agent": "UA", "x-super-properties": base64.b64encode(json.dumps({"os": "Windows"}).encode()).decode()}}
        launched = {"client_launch_id": "a", "launch_signature": "b", "client_heartbeat_session_id": "c"}
        try:
            client = browserRest.browser_discord("token", identity, launched, session_factory=Recorder)
        except ImportError as error:
            self.skipTest(f"endcord can't load here: {error}")
        with self.assertRaises(accountRoute.RouteError):
            client.get_connection("cdn.discordapp.com", 443)
        folder = tempfile.mkdtemp()
        saved = client.get_file("https://cdn.discordapp.com/attachments/1/2/a.png", folder, "a.png")
        self.assertEqual(Path(saved).read_bytes(), b"bytes")
        upload = Path(folder) / "up.bin"
        upload.write_bytes(b"up")
        self.assertTrue(client.upload_attachment("https://uploads.platform.example/put?sig=1", str(upload)))
        self.assertEqual(calls, [("GET", "https://cdn.discordapp.com/attachments/1/2/a.png"), ("PUT", "https://uploads.platform.example/put?sig=1")])


if __name__ == "__main__":
    unittest.main()
