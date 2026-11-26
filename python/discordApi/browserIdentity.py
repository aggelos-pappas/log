from __future__ import annotations

import base64
import copy
import json
import os
import time
import uuid
from pathlib import Path
from typing import Any

from identity import browserIdentity as _identity
from logHome import log_home

IMPERSONATE = _identity.curl_target("discord")
ORIGIN = "https://discord.com"
GATEWAY_URL = "wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream"
REST_HEADERS = ("accept-language", "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform", "user-agent", "x-debug-options", "x-discord-locale", "x-discord-timezone", "x-installation-id", "x-super-properties")
SCRIPT_ORDER = ("content-type", "x-context-properties", "authorization", "x-super-properties", "x-installation-id", "x-discord-locale", "x-discord-timezone", "x-debug-options")
CHROME_ONLY = ("sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform")
PER_SESSION = ("token", "qos_token")
PER_LAUNCH = ("client_launch_id", "launch_signature", "client_heartbeat_session_id")
IDENTIFY_REST = {"capabilities": 1734653, "presence": {"status": "online", "since": 0, "activities": [], "afk": False}, "compress": False, "client_state": {"guild_versions": {}}}
CONNECT_REASONS = "AppSkeleton"
WEB_CHANNELS = ("stable", "ptb", "canary")
FILE = "browserIdentity.json"


def runs_root() -> Path:
    return Path(os.environ.get("LOG_RUNS_ROOT") or log_home() / "runs")


def capture_folders(driver: str | None = None) -> tuple[str, ...]:
    family = _identity.DRIVER_FAMILY.get(driver or "")
    if not family:
        return tuple(_identity.DRIVER_FAMILY)
    return tuple(name for name, of in _identity.DRIVER_FAMILY.items() if of == family)


def recordings(account: str, root: Path | None = None, driver: str | None = None) -> list[Path]:
    base = (root or runs_root()) / "inspect"
    if not base.exists():
        return []
    found = [p / folder / "session.har" for p in base.glob(f"*_{account}") for folder in capture_folders(driver) if (p / folder / "session.har").exists()]
    return sorted(found, key=lambda p: p.stat().st_mtime, reverse=True)


def sent_op(entries: list[dict[str, Any]], op: int) -> dict[str, Any] | None:
    for entry in entries:
        if not str(entry.get("request", {}).get("url") or "").startswith("wss://gateway.discord.gg"):
            continue
        for message in entry.get("_webSocketMessages") or []:
            if message.get("type") != "send":
                continue
            try:
                sent = json.loads(message.get("data") or "")
            except ValueError:
                continue
            if isinstance(sent, dict) and sent.get("op") == op and isinstance(sent.get("d"), dict):
                return sent["d"]
    return None


def identify_of(entries: list[dict[str, Any]]) -> tuple[str, dict[str, Any]] | None:
    found = None
    for entry in entries:
        url = str(entry.get("request", {}).get("url") or "")
        if not url.startswith("wss://gateway.discord.gg"):
            continue
        for message in entry.get("_webSocketMessages") or []:
            if message.get("type") != "send":
                continue
            try:
                sent = json.loads(message.get("data") or "")
            except ValueError:
                continue
            if isinstance(sent, dict) and sent.get("op") == 2 and isinstance(sent.get("d"), dict):
                found = (url, sent["d"])
    return found


def headers_of(entries: list[dict[str, Any]]) -> dict[str, str] | None:
    found = None
    for entry in entries:
        request = entry.get("request", {})
        if not str(request.get("url") or "").startswith(f"{ORIGIN}/api/v9/"):
            continue
        named = {str(h.get("name") or "").lower(): str(h.get("value") or "") for h in request.get("headers") or []}
        if named.get("x-super-properties") and named.get("user-agent") and named.get("authorization"):
            found = {k: named[k] for k in REST_HEADERS if named.get(k)}
    return found


def template_of(identify: dict[str, Any]) -> dict[str, Any]:
    kept = {k: v for k, v in copy.deepcopy(identify).items() if k not in PER_SESSION}
    properties = kept.get("properties") or {}
    for key in PER_LAUNCH:
        properties.pop(key, None)
    kept["properties"] = properties
    return kept


def super_of(headers: dict[str, str]) -> dict[str, Any]:
    try:
        decoded = json.loads(base64.b64decode(headers.get("x-super-properties") or ""))
    except (ValueError, TypeError):
        return {}
    return decoded if isinstance(decoded, dict) else {}


def identify_from(headers: dict[str, str], base: dict[str, Any] | None) -> dict[str, Any]:
    properties = {k: v for k, v in super_of(headers).items() if k not in PER_LAUNCH}
    properties["is_fast_connect"] = False
    properties["gateway_connect_reasons"] = CONNECT_REASONS
    if headers.get("x-installation-id"):
        properties["installation_id"] = headers["x-installation-id"]
    rest = {k: v for k, v in ((base or {}).get("identify") or {}).items() if k in IDENTIFY_REST}
    out: dict[str, Any] = {"capabilities": copy.deepcopy(rest.get("capabilities", IDENTIFY_REST["capabilities"])), "properties": properties}
    for key in ("presence", "compress", "client_state"):
        out[key] = copy.deepcopy(rest.get(key, IDENTIFY_REST[key]))
    return out


def from_har(path: Path, base: dict[str, Any] | None = None) -> dict[str, Any] | None:
    try:
        entries = json.loads(path.read_text(encoding="utf-8")).get("log", {}).get("entries") or []
    except (OSError, ValueError):
        return None
    headers = headers_of(entries)
    if not headers:
        return None
    found = identify_of(entries)
    url, identify, source = (found[0], template_of(found[1]), "recorded") if found else (GATEWAY_URL, identify_from(headers, base), "superProperties")
    voice = sent_op(entries, 4) or (base or {}).get("voiceState")
    beat = sent_op(entries, 40)
    qos = beat["qos"] if beat and isinstance(beat.get("qos"), dict) else (base or {}).get("qos")
    made: dict[str, Any] = {"recordedFrom": str(path), "recordedAt": path.stat().st_mtime, "driver": path.parent.name, "identifySource": source, "gatewayUrl": url, "identify": identify, "headers": headers}
    if voice is not None:
        made["voiceState"] = copy.deepcopy(voice)
    if qos is not None:
        made["qos"] = copy.deepcopy(qos)
    return made


def family_of(identity: dict[str, Any]) -> str | None:
    found = _identity.browser_of((identity.get("headers") or {}).get("user-agent") or "")
    return found[0] if found else None


def fits(identity: dict[str, Any], driver: str | None) -> bool:
    want = _identity.DRIVER_FAMILY.get(driver or "")
    return not want or family_of(identity) == want


def load(state_root: str, account: str, root: Path | None = None, driver: str | None = None) -> dict[str, Any] | None:
    path = Path(state_root) / account / FILE
    stored = json.loads(path.read_text(encoding="utf-8")) if path.exists() else None
    kept = stored if stored and fits(stored, driver) else None
    seen = max(float(stored.get("recordedAt") or 0), float(stored.get("checkedAt") or 0)) if stored else 0.0
    newest = 0.0
    for har in recordings(account, root, driver):
        mtime = har.stat().st_mtime
        newest = max(newest, mtime)
        if stored and mtime <= seen:
            break
        made = from_har(har, stored)
        if made and fits(made, driver):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(made, indent=1), encoding="utf-8")
            return made
    if stored and newest > seen:
        stored["checkedAt"] = newest
        path.write_text(json.dumps(stored, indent=1), encoding="utf-8")
    return kept


def impersonate_of(identity: dict[str, Any]) -> str:
    return _identity.curl_target_for((identity.get("headers") or {}).get("user-agent") or "") or IMPERSONATE


def problems(identity: dict[str, Any], driver: str | None = None) -> list[str]:
    headers = identity.get("headers") or {}
    agent = headers.get("user-agent") or ""
    family = family_of(identity)
    out: list[str] = []
    if not family:
        out.append(f"the recorded user agent is not a web browser: {agent[:80]!r}")
    want = _identity.DRIVER_FAMILY.get(driver or "")
    if want and family and family != want:
        out.append(f"the account's browser is {driver} ({want}) but the recording is {family}: {agent[:80]}")
    sent = super_of(headers)
    if sent.get("browser_user_agent") != agent:
        out.append("X-Super-Properties browser_user_agent differs from the User-Agent")
    if sent.get("browser") in _identity.DESKTOP_APPS or sent.get("release_channel") not in WEB_CHANNELS:
        out.append(f"X-Super-Properties is not the web client ({sent.get('browser')}, {sent.get('release_channel')})")
    properties = (identity.get("identify") or {}).get("properties") or {}
    if properties.get("browser_user_agent") != agent:
        out.append("the gateway IDENTIFY browser_user_agent differs from the User-Agent")
    if properties.get("client_build_number") != sent.get("client_build_number"):
        out.append(f"the gateway IDENTIFY build {properties.get('client_build_number')} differs from X-Super-Properties' {sent.get('client_build_number')}")
    target = impersonate_of(identity)
    if family and not target.startswith(family):
        out.append(f"the TLS fingerprint {target} is not {family}")
    if family == "firefox" and any(h in headers for h in CHROME_ONLY):
        out.append("Chrome client hints on a Firefox identity")
    return out


def launch_signature() -> str:
    bits = 0b00000000100000000001000000010000000010000001000000001000000000000010000010000001000000000100000000000001000000000000100000000000
    return str(uuid.UUID(int=uuid.uuid4().int & (~bits & ((1 << 128) - 1))))


def launch() -> dict[str, str]:
    return {"client_launch_id": str(uuid.uuid4()), "launch_signature": launch_signature(), "client_heartbeat_session_id": str(uuid.uuid4())}


def with_launch(properties: dict[str, Any], fresh: dict[str, str]) -> dict[str, Any]:
    missing = {k: v for k, v in fresh.items() if k not in properties}
    out: dict[str, Any] = {}
    for key, value in properties.items():
        out[key] = fresh.get(key, value)
        if key == "client_event_source":
            out.update(missing)
    for key, value in missing.items():
        out.setdefault(key, value)
    return out


def identify_payload(identity: dict[str, Any], token: str, launched: dict[str, str]) -> dict[str, Any]:
    d = {k: v for k, v in copy.deepcopy(identity["identify"]).items() if k != "token"}
    properties = with_launch(d.get("properties") or {}, {k: launched[k] for k in ("client_launch_id", "launch_signature")})
    properties["is_fast_connect"] = False
    d["properties"] = properties
    return {"op": 2, "d": {"token": token, **d}}


def after_ready(identity: dict[str, Any], launched: dict[str, str], started_ms: int, sequence: int | None) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if identity.get("voiceState") is not None:
        out.append({"op": 4, "d": copy.deepcopy(identity["voiceState"])})
    if identity.get("qos") is not None:
        out.append({"op": 41, "d": {"initialization_timestamp": started_ms, "session_id": launched["client_heartbeat_session_id"], "client_launch_id": launched["client_launch_id"]}})
    out.append(heartbeat(identity, sequence))
    return out


def heartbeat(identity: dict[str, Any], sequence: int | None) -> dict[str, Any]:
    if identity.get("qos") is not None:
        return {"op": 40, "d": {"seq": sequence, "qos": copy.deepcopy(identity["qos"])}}
    return {"op": 1, "d": sequence}


def super_properties(identity: dict[str, Any], launched: dict[str, str]) -> str:
    properties = super_of(identity["headers"])
    keys = PER_LAUNCH if "client_heartbeat_session_id" in properties else PER_LAUNCH[:2]
    properties = with_launch(properties, {k: launched[k] for k in keys})
    return base64.b64encode(json.dumps(properties, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).decode("ascii")


def title(name: str) -> str:
    return "-".join(part.capitalize() for part in name.split("-"))


def header_order(family: str | None, names: list[str]) -> list[str]:
    head, tail = (_identity.FIREFOX_FETCH_HEAD, _identity.FIREFOX_FETCH_TAIL) if family == "firefox" else (_identity.FETCH_HEAD, _identity.FETCH_TAIL)
    lowered = [n.lower() for n in names]
    custom = sorted((n for n in lowered if n not in head and n not in tail), key=lambda n: SCRIPT_ORDER.index(n) if n in SCRIPT_ORDER else len(SCRIPT_ORDER))
    return [n for n in head if n in lowered] + custom + [n for n in tail if n in lowered]


def rest_headers(identity: dict[str, Any], token: str, launched: dict[str, str], referer: str = f"{ORIGIN}/channels/@me", extra: dict[str, str] | None = None, method: str = "GET") -> dict[str, str]:
    family = family_of(identity)
    recorded = identity["headers"]
    named = {k: v for k, v in recorded.items() if not (family == "firefox" and k in CHROME_ONLY)}
    named["x-super-properties"] = super_properties(identity, launched)
    named.update({"authorization": token, "accept": "*/*", "referer": referer, "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin", "accept-encoding": "gzip, deflate, br, zstd"})
    named.update(_identity.FIREFOX_FETCH_EXTRA if family == "firefox" else {"priority": "u=1, i"})
    named["x-discord-timezone"] = recorded.get("x-discord-timezone") or time.tzname[0]
    for key, value in (extra or {}).items():
        named[key.lower()] = value
    if str(method).upper() not in ("GET", "HEAD"):
        named["origin"] = ORIGIN
    return {title(n): named[n] for n in header_order(family, list(named))}


def wire_order(family: str | None, headers: dict[str, str]) -> str:
    return ",".join(header_order(family, [*headers, "content-length", "cookie"]))
