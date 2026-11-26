from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Mapping
from logHome import log_home

DEFAULT_BROWSER = "chrome152"
DEFAULT_OS = "windows"
DEFAULT_CLIENT = "curl_cffi"
CLIENTS = ("curl_cffi", "httpcloak")
OSES = ("windows", "macos", "linux")
FAMILIES = ("chrome", "firefox")

UA_PLATFORM = {
    "chrome": {
        "windows": "Windows NT 10.0; Win64; x64",
        "macos": "Macintosh; Intel Mac OS X 10_15_7",
        "linux": "X11; Linux x86_64",
    },
    "firefox": {
        "windows": "Windows NT 10.0; Win64; x64",
        "macos": "Macintosh; Intel Mac OS X 10.15",
        "linux": "X11; Linux x86_64",
    },
}
CH_PLATFORM = {"windows": '"Windows"', "macos": '"macOS"', "linux": '"Linux"'}


class IdentityError(ValueError):
    pass


def settings_path() -> Path:
    named = os.environ.get("LOG_SETTINGS", "").strip()
    return Path(named) if named else log_home() / "settings.json"


def _settings(path: Path | None = None) -> dict[str, Any]:
    file = path or settings_path()
    try:
        data = json.loads(file.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    identity = data.get("identity") if isinstance(data, dict) else None
    return identity if isinstance(identity, dict) else {}


def _per_platform(value: Any, platform: str | None) -> str | None:
    if isinstance(value, Mapping):
        picked = value.get(platform) if platform else None
        return str(picked or value.get("default") or "").strip() or None
    if isinstance(value, str) and value.strip():
        parts = [p.strip() for p in value.split(",") if p.strip()]
        if len(parts) == 1 and "=" not in parts[0]:
            return parts[0]
        named = dict(p.split("=", 1) for p in parts if "=" in p)
        named = {k.strip(): v.strip() for k, v in named.items()}
        return (named.get(platform) if platform else None) or named.get("default")
    return None


def parse(browser: str) -> tuple[str, int]:
    found = re.fullmatch(r"(chrome|firefox)(\d{2,3})", browser.strip().lower())
    if not found:
        raise IdentityError(f"LOG_BROWSER must be a pinned browser like chrome152 or firefox155, not {browser!r}")
    return found.group(1), int(found.group(2))


def resolve(platform: str | None = None, env: Mapping[str, str] | None = None, settings: Mapping[str, Any] | None = None) -> dict[str, Any]:
    env = os.environ if env is None else env
    stored = _settings() if settings is None else dict(settings)
    browser = _per_platform(env.get("LOG_BROWSER"), platform) or _per_platform(stored.get("browser"), platform) or DEFAULT_BROWSER
    os_name = (_per_platform(env.get("LOG_BROWSER_OS"), platform) or _per_platform(stored.get("os"), platform) or DEFAULT_OS).lower()
    client = (_per_platform(env.get("LOG_HTTP_CLIENT"), platform) or _per_platform(stored.get("client"), platform) or DEFAULT_CLIENT).lower()
    family, version = parse(browser)
    if os_name not in OSES:
        raise IdentityError(f"LOG_BROWSER_OS must be one of {', '.join(OSES)}, not {os_name!r}")
    if client not in CLIENTS:
        raise IdentityError(f"LOG_HTTP_CLIENT must be one of {', '.join(CLIENTS)}, not {client!r}")
    user_agent = (
        f"Mozilla/5.0 ({UA_PLATFORM['chrome'][os_name]}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version}.0.0.0 Safari/537.36"
        if family == "chrome"
        else f"Mozilla/5.0 ({UA_PLATFORM['firefox'][os_name]}; rv:{version}.0) Gecko/20100101 Firefox/{version}.0"
    )
    headers = {"user-agent": user_agent}
    if family == "chrome":
        headers["sec-ch-ua-platform"] = CH_PLATFORM[os_name]
        headers["sec-ch-ua-mobile"] = "?0"
    return {
        "platform": platform,
        "browser": f"{family}{version}",
        "family": family,
        "version": version,
        "os": os_name,
        "client": client,
        "curl": f"{family}{version}_macos" if os_name == "macos" and family == "chrome" and version >= 151 else f"{family}{version}",
        "httpcloak": f"{family}-{version}-{os_name}",
        "wreq": f"{family}_{version}",
        "userAgent": user_agent,
        "headers": headers,
    }


def curl_targets() -> set[str]:
    try:
        from curl_cffi.requests import BrowserType
    except ImportError:
        return set()
    return {str(b.value) for b in BrowserType}


def curl_target(platform: str | None = None, env: Mapping[str, str] | None = None) -> str:
    identity = resolve(platform, env)
    if identity["client"] != "curl_cffi":
        raise IdentityError(f"{platform or 'this platform'} has no {identity['client']} adapter yet; set LOG_HTTP_CLIENT={platform or 'default'}=curl_cffi")
    available = curl_targets()
    if available and identity["curl"] not in available:
        near = sorted(t for t in available if t.startswith(identity["family"]))[-4:]
        raise IdentityError(f"curl_cffi on this machine has no {identity['curl']} target (newest: {', '.join(near)}); upgrade curl_cffi or set LOG_BROWSER")
    return identity["curl"]


def user_agent(platform: str | None = None, env: Mapping[str, str] | None = None) -> str:
    return resolve(platform, env)["userAgent"]


def headers(platform: str | None = None, env: Mapping[str, str] | None = None) -> dict[str, str]:
    return dict(resolve(platform, env)["headers"])


def http_client(platform: str | None = None, env: Mapping[str, str] | None = None) -> str:
    return resolve(platform, env)["client"]


DRIVER_FAMILY = {"camoufox": "firefox", "firefox": "firefox", "adsPower": "chrome", "brave": "chrome", "chrome": "chrome"}
FIREFOX_FETCH_HEAD = ("user-agent", "accept", "accept-language", "accept-encoding", "referer")
FIREFOX_FETCH_TAIL = ("content-length", "origin", "cookie", "sec-fetch-dest", "sec-fetch-mode", "sec-fetch-site", "priority", "te")
FIREFOX_FETCH_EXTRA = {"priority": "u=4", "te": "trailers"}
DESKTOP_APPS = ("Discord Client",)


def browser_of(user_agent: str) -> tuple[str, int] | None:
    text = str(user_agent or "")
    if "Electron/" in text or re.search(r"\bdiscord/\d", text):
        return None
    firefox = re.search(r"\bFirefox/(\d{2,3})", text)
    if firefox:
        return "firefox", int(firefox.group(1))
    chrome = re.search(r"\bChrome/(\d{2,3})", text)
    if chrome:
        return "chrome", int(chrome.group(1))
    return None


def curl_target_for(user_agent: str, available: set[str] | None = None) -> str | None:
    found = browser_of(user_agent)
    if not found:
        return None
    family, version = found
    mac = "Macintosh" in str(user_agent)
    targets = curl_targets() if available is None else available
    if not targets:
        return f"{family}{version}"
    parsed = [(m.group(1), int(m.group(2)), bool(m.group(3)), t) for t in targets for m in [re.fullmatch(r"(chrome|firefox)(\d{2,3})(_macos)?", t)] if m]
    own = [p for p in parsed if p[0] == family]
    macos = mac and any(p[2] for p in own)
    pinned = [(p[1], p[3]) for p in own if p[2] == macos]
    if not pinned:
        return None
    below = [p for p in pinned if p[0] <= version]
    return max(below)[1] if below else min(pinned)[1]


def describe(platform: str | None = None) -> str:
    i = resolve(platform)
    return f"{i['browser']} on {i['os']} through {i['client']} (curl {i['curl']}, httpcloak {i['httpcloak']})"


GREASE_CHARS = (" ", "(", ":", "-", ".", "/", ")", ";", "=", "?", "_")
GREASE_VERSIONS = ("8", "99", "24")
BRAND_ORDERS = ((0, 1, 2), (0, 2, 1), (1, 0, 2), (1, 2, 0), (2, 0, 1), (2, 1, 0))
FETCH_HEAD = ("content-length", "sec-ch-ua-platform")
FETCH_TAIL = ("user-agent", "sec-ch-ua", "content-type", "sec-ch-ua-mobile", "accept", "origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest", "referer", "accept-encoding", "accept-language", "cookie", "priority")
NAVIGATION_ONLY = ("upgrade-insecure-requests", "sec-fetch-user", "cache-control")
API_PATH = re.compile(r"/(api|graphql|voyager|ajax)(/|$)|\.json($|\?)", re.I)
API_HOST = re.compile(r"^(api|upload|graph|edge-chat|gateway)\.", re.I)


def sec_ch_ua(version: int) -> str:
    brands = (
        f'"Not{GREASE_CHARS[version % 11]}A{GREASE_CHARS[(version + 1) % 11]}Brand";v="{GREASE_VERSIONS[version % 3]}"',
        f'"Chromium";v="{version}"',
        f'"Google Chrome";v="{version}"',
    )
    placed: list[str] = [""] * 3
    for brand, slot in zip(brands, BRAND_ORDERS[version % 6]):
        placed[slot] = brand
    return ", ".join(placed)


def _site_of(url_host: str, origin_host: str) -> str:
    if url_host == origin_host:
        return "same-origin"
    base = lambda h: ".".join(h.split(".")[-2:])
    return "same-site" if base(url_host) == base(origin_host) else "cross-site"


def is_api_call(method: str, url: str, headers: Mapping[str, str]) -> bool:
    from urllib.parse import urlsplit

    accept = str(headers.get("accept") or "")
    if "text/html" in accept:
        return False
    if str(method).upper() != "GET":
        return True
    parts = urlsplit(str(url))
    return bool(API_PATH.search(parts.path) or API_HOST.match(parts.hostname or ""))


def fetch_enabled(platform: str | None, env: Mapping[str, str] | None = None) -> bool:
    env = os.environ if env is None else env
    value = _per_platform(env.get("LOG_FETCH_HEADERS"), platform) or _per_platform(_settings().get("fetchHeaders"), platform) or "on"
    return value.lower() not in ("off", "false", "0", "no")


def chrome_fetch(platform: str | None, method: str, url: str, origin: str, headers: Mapping[str, str] | None = None, env: Mapping[str, str] | None = None) -> tuple[dict[str, str], str]:
    from urllib.parse import urlsplit

    identity = resolve(platform, env)
    url_host = urlsplit(str(url)).hostname or ""
    origin_host = urlsplit(origin).hostname or ""
    site = _site_of(url_host, origin_host)
    given = {str(k).lower(): str(v) for k, v in (headers or {}).items() if v is not None}
    base: dict[str, str] = {"user-agent": identity["userAgent"], "accept": "*/*"}
    if identity["family"] == "chrome":
        base.update({"sec-ch-ua-platform": CH_PLATFORM[identity["os"]], "sec-ch-ua": sec_ch_ua(identity["version"]), "sec-ch-ua-mobile": "?0", "priority": "u=1, i"})
    base.update({"sec-fetch-site": site, "sec-fetch-mode": "cors", "sec-fetch-dest": "empty", "referer": origin.rstrip("/") + "/", "accept-encoding": "gzip, deflate, br, zstd", "accept-language": "en-US,en;q=0.9"})
    if str(method).upper() != "GET" or site != "same-origin":
        base["origin"] = origin.rstrip("/")
    merged = {**base, **given}
    for key in NAVIGATION_ONLY:
        merged.pop(key, None)
    custom = [k for k in merged if k not in FETCH_HEAD and k not in FETCH_TAIL]
    names = [k for k in FETCH_HEAD if k == "content-length" or k in merged] + custom + [k for k in FETCH_TAIL if k in merged or k == "cookie"]
    ordered = {k: merged[k] for k in names if k in merged}
    return ordered, ",".join(names)


_PATCHED: dict[str, bool] = {}


def attach(session: Any, platform: str, origin: str) -> Any:
    session._log_fetch = {"platform": platform, "origin": origin}
    install()
    return session


def _rewrite(session: Any, method: Any, url: Any, kwargs: dict[str, Any]) -> dict[str, Any]:
    fetch = getattr(session, "_log_fetch", None)
    if not fetch or not fetch_enabled(fetch["platform"]):
        return kwargs
    combined = {str(k).lower(): v for k, v in dict(getattr(session, "headers", None) or {}).items()}
    combined.update({str(k).lower(): v for k, v in dict(kwargs.get("headers") or {}).items()})
    if not is_api_call(str(method), str(url), combined):
        return kwargs
    ordered, order = chrome_fetch(fetch["platform"], str(method), str(url), fetch["origin"], combined)
    extra = dict(kwargs.get("extra_fp") or {})
    extra["header_order"] = order
    return {**kwargs, "headers": ordered, "default_headers": False, "extra_fp": extra}


def install() -> None:
    if _PATCHED.get("fetch"):
        return
    try:
        from curl_cffi.requests import AsyncSession, Session
    except ImportError:
        return
    _PATCHED["fetch"] = True
    sync_request = Session.request
    async_request = AsyncSession.request

    def request(self: Any, method: Any, url: Any, *args: Any, **kwargs: Any) -> Any:
        return sync_request(self, method, url, *args, **_rewrite(self, method, url, kwargs))

    async def arequest(self: Any, method: Any, url: Any, *args: Any, **kwargs: Any) -> Any:
        return await async_request(self, method, url, *args, **_rewrite(self, method, url, kwargs))

    Session.request = request
    AsyncSession.request = arequest


if __name__ == "__main__":
    import sys

    print(json.dumps(resolve(sys.argv[1] if len(sys.argv) > 1 else None)))
