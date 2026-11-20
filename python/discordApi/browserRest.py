from __future__ import annotations

import os
import threading
from typing import Any
from urllib.parse import urlsplit

from discordApi import browserIdentity
from identity import accountRoute

DROPPED = {"user-agent", "x-super-properties", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest", "priority", "accept", "authorization", "origin", "referer", "accept-encoding", "x-discord-timezone"}


def browser_discord(token: str, identity: dict[str, Any], launched: dict[str, str], session_factory: Any = None) -> Any:
    from endcord import discord

    family = browserIdentity.family_of(identity)

    class BrowserDiscord(discord.Discord):
        def request(self, method: str, path: str, body: Any = None, headers: Any = None, timeout: Any = None, exit_on_error: bool = False) -> tuple[Any, Any]:
            extra = {name: value for name, value in (headers or {}).items() if name.lower() not in DROPPED and name.lower() not in browserIdentity.REST_HEADERS and not (name.lower() == "content-type" and body is None)}
            merged = browserIdentity.rest_headers(identity, token, launched, extra=extra, method=method)
            try:
                with lock:
                    answer = session.request(method, f"{browserIdentity.ORIGIN}{path}", data=body, headers=merged, timeout=timeout or 20, allow_redirects=False, default_headers=False, extra_fp={"header_order": browserIdentity.wire_order(family, merged)})
            except Exception as error:
                if exit_on_error:
                    raise SystemExit(f"Network error: {error}") from error
                return None, None
            return answer.content, answer.status_code

        def get_connection(self, host: Any, port: Any, timeout: Any = None) -> Any:
            raise accountRoute.RouteError("routeBypass", f"endcord opened its own connection to {host}: every Discord call goes through the account's curl_cffi session")

        def get_file(self, url: str, save_path: str, file_name: str | None = None, cache: bool = False, keepalive: bool = False, retry: bool = True) -> str | None:
            folder = os.path.expanduser(save_path)
            os.makedirs(folder, exist_ok=True)
            destination = os.path.join(folder, file_name or os.path.basename(urlsplit(url).path))
            if file_name and cache and os.path.exists(destination):
                return destination
            with lock:
                answer = session.request("GET", url, headers={"User-Agent": identity["headers"]["user-agent"]}, timeout=30)
            if answer.status_code != 200 or not answer.content:
                return None
            if not os.path.splitext(destination)[-1]:
                destination += "." + str(answer.headers.get("content-type") or "bin").split("/")[-1].replace("jpeg", "jpg")
            with open(destination, "wb") as file:
                file.write(answer.content)
            return destination

        def upload_attachment(self, upload_url: str, path: str) -> bool:
            headers = {"Content-Type": "application/octet-stream", "Origin": browserIdentity.ORIGIN, "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "cross-site", "User-Agent": identity["headers"]["user-agent"]}
            with open(path, "rb") as file:
                data = file.read()
            with lock:
                answer = session.request("PUT", upload_url, data=data, headers=headers, timeout=120)
            return answer.status_code == 200

    lock = threading.Lock()
    if session_factory:
        session = session_factory()
    else:
        from curl_cffi.requests import Session

        session = Session(impersonate=browserIdentity.impersonate_of(identity), proxies=accountRoute.proxies())
    return BrowserDiscord(token, None, browserIdentity.super_properties(identity, launched), identity["headers"]["user-agent"])
