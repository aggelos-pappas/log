from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Mapping

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
    return Path(named) if named else Path.home() / ".logCli" / "settings.json"


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


def describe(platform: str | None = None) -> str:
    i = resolve(platform)
    return f"{i['browser']} on {i['os']} through {i['client']} (curl {i['curl']}, httpcloak {i['httpcloak']})"


if __name__ == "__main__":
    import sys

    print(json.dumps(resolve(sys.argv[1] if len(sys.argv) > 1 else None)))
