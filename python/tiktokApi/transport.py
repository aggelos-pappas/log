from __future__ import annotations

from typing import Any

from curl_cffi.requests import AsyncSession

from identity import browserIdentity as _identity

IMPERSONATE = _identity.curl_target("tiktok")
CHROME_MAJOR = str(_identity.resolve("tiktok")["version"])
CHROME_VERSION = f"{CHROME_MAJOR}.0.0.0"
USER_AGENT = _identity.user_agent("tiktok")
COOKIE_DOMAIN = ".tiktok.com"
SEC_CH_UA = _identity.sec_ch_ua(int(CHROME_MAJOR))

__all__ = ["IMPERSONATE", "USER_AGENT", "headers", "new_session", "refreshed", "studio_query"]


def new_session(cookies: dict[str, str]) -> AsyncSession:
    session = AsyncSession(impersonate=IMPERSONATE, allow_redirects=False)
    for name, value in cookies.items():
        session.cookies.set(name, value, domain=COOKIE_DOMAIN)
    return session


def headers(referer: str, csrf: str | None = None, conv: bool = False, json_body: bool = False) -> dict[str, str]:
    out = {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "referer": referer,
        "sec-ch-ua": SEC_CH_UA,
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": USER_AGENT,
    }
    if csrf:
        out["tt-csrf-token"] = csrf
    if conv:
        out["agw-js-conv"] = "str"
    if json_body:
        out["content-type"] = "application/json"
        out["origin"] = "https://www.tiktok.com"
    return out


def studio_query(cookies: dict[str, str], extra: dict[str, str] | None = None) -> dict[str, str]:
    region = cookies.get("store-country-code", "").upper() or "US"
    query = {
        **(extra or {}),
        "locale": "en",
        "aid": "1988",
        "priority_region": region,
        "region": region,
        "app_name": "tiktok_creator_center",
        "app_language": "en",
        "device_platform": "web_pc",
        "channel": "tiktok_web",
        "os": "win",
        "screen_width": "1920",
        "screen_height": "1080",
        "browser_language": "en-US",
        "browser_platform": "Win32",
        "browser_name": "Mozilla",
        "browser_version": USER_AGENT.removeprefix("Mozilla/"),
    }
    if cookies.get("msToken"):
        query["msToken"] = cookies["msToken"]
    return query


def refreshed(session: Any, cookies: dict[str, str]) -> dict[str, str]:
    now = {c.name: c.value for c in session.cookies.jar if c.value}
    return {k: v for k, v in now.items() if cookies.get(k) != v}
