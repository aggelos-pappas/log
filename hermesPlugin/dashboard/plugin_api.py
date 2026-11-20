from __future__ import annotations

import base64
import importlib.util
import json
import os
import re
import sqlite3
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse

router = APIRouter()

PLATFORMS = {
    "twitter": ("X", 240),
    "discord": ("Discord", 60),
    "slack": ("Slack", 40),
    "instagram": ("Instagram", 40),
    "reddit": ("Reddit", 40),
    "linkedin": ("LinkedIn", 10),
}
WAITING_LIMIT = 12
TEXT_LIMIT = 200


def _home() -> Path:
    override = os.environ.get("LOG_CLI_HOME", "").strip()
    return Path(override).expanduser() if override else Path.home() / ".logCli"


def _read(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return None


def _iso(seconds: Any) -> str | None:
    try:
        return datetime.fromtimestamp(float(seconds), tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _today(governor: dict[str, Any]) -> bool:
    day = str(governor.get("day") or "")
    return day in (time.strftime("%Y-%m-%d"), datetime.now(timezone.utc).strftime("%Y-%m-%d"))


def _account(platform: str, folder: Path) -> dict[str, Any]:
    label, limit = PLATFORMS[platform]
    session = _read(folder / "session.json") or {}
    governor = _read(folder / "governor_state.json") or {}
    fresh = isinstance(governor, dict) and _today(governor)
    cooldown = float(governor.get("cooldown_until") or 0) if isinstance(governor, dict) else 0.0
    return {
        "platform": platform,
        "platformLabel": label,
        "account": folder.name,
        "sessionState": str(session.get("sessionState") or "unknown") if isinstance(session, dict) else "unknown",
        "checkedAt": session.get("checkedAt") if isinstance(session, dict) else None,
        "writesToday": int(governor.get("mutation_count") or 0) if fresh else 0,
        "requestsToday": int(governor.get("day_count") or 0) if fresh else 0,
        "writesLimit": limit,
        "lastActionAt": _iso(governor.get("last_request_ts")) if fresh else None,
        "coolingDownUntil": _iso(cooldown) if cooldown > time.time() else None,
    }


def _accounts(home: Path) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for platform in PLATFORMS:
        root = home / platform
        if not root.is_dir():
            continue
        for folder in sorted(root.iterdir(), key=lambda p: p.name.lower()):
            if folder.is_dir() and (folder / "session.json").is_file():
                out.append(_account(platform, folder))
    return out


def _waiting(home: Path, account: str) -> tuple[list[dict[str, Any]], int, str | None]:
    state = _read(home / "twitter" / account / "inboxSync.json")
    if not isinstance(state, dict) or not isinstance(state.get("xchat"), dict) or not state.get("userId"):
        return [], 0, None
    me = str(state["userId"])
    rows: list[dict[str, Any]] = []
    for conversation_id, chat in state["xchat"].items():
        if not isinstance(chat, dict):
            continue
        last_ms, sender = chat.get("lastMs"), chat.get("lastSender")
        if not last_ms or not sender or str(sender) == me:
            continue
        handles = chat.get("handles") or {}
        people = [f"@{handles[p]}" for p in chat.get("participants") or [] if handles.get(p)]
        said = [m for m in chat.get("messages") or [] if isinstance(m, dict) and m.get("text") is not None]
        last = said[-1] if said else None
        text = str(last["text"]) if last and last.get("time_ms") == last_ms else ""
        rows.append({
            "account": account,
            "platform": "twitter",
            "conversationId": conversation_id,
            "with": ", ".join(people) or "someone",
            "handle": people[0][1:] if len(people) == 1 else None,
            "at": _iso(float(last_ms) / 1000),
            "text": " ".join(text.split())[:TEXT_LIMIT],
            "ms": float(last_ms),
        })
    rows.sort(key=lambda r: -r["ms"])
    for r in rows:
        r.pop("ms")
    return rows[:WAITING_LIMIT], len(rows), state.get("syncedAt")


@router.get("/overview")
async def overview() -> dict[str, Any]:
    home = _home()
    if not home.is_dir():
        return {"installed": False, "accounts": [], "waiting": [], "waitingTotal": 0, "syncedAt": None}
    accounts = _accounts(home)
    waiting: list[dict[str, Any]] = []
    total = 0
    synced: list[str] = []
    for a in accounts:
        if a["platform"] != "twitter" or a["sessionState"] != "loggedIn":
            continue
        rows, count, synced_at = _waiting(home, a["account"])
        a["waiting"] = count
        waiting.extend(rows)
        total += count
        if synced_at:
            synced.append(str(synced_at))
    waiting.sort(key=lambda r: r["at"] or "", reverse=True)
    return {
        "installed": True,
        "accounts": accounts,
        "waiting": waiting[:WAITING_LIMIT],
        "waitingTotal": total,
        "syncedAt": max(synced) if synced else None,
    }


VIEW_ID = re.compile(r"^[0-9a-f]{8}$")
VIEW_TEXT_LIMIT = 512 * 1024


def _log_db() -> Path:
    named = os.environ.get("LOG_DB", "").strip()
    if named:
        return Path(named)
    state = os.environ.get("LOG_INBOX_STATE", "").strip()
    return Path(state) / "log.db" if state else Path.home() / ".logCli" / "log.db"


def _stored_view(view_id: str) -> Any:
    path = _log_db()
    if not path.is_file():
        return None
    try:
        handle = sqlite3.connect(f"{path.resolve().as_uri()}?mode=ro", uri=True, timeout=2)
        try:
            row = handle.execute("SELECT body FROM state WHERE scope = 'hermesView' AND key = ?", (view_id,)).fetchone()
        finally:
            handle.close()
        if not row or len(row[0]) > VIEW_TEXT_LIMIT:
            return None
        return json.loads(row[0])
    except (sqlite3.Error, ValueError, OSError):
        return None


def _view(view_id: str) -> dict[str, Any] | None:
    if not VIEW_ID.fullmatch(view_id or ""):
        return None
    stored = _stored_view(view_id)
    if not isinstance(stored, dict) or not isinstance(stored.get("html"), str):
        return None
    view = {"id": view_id, "title": str(stored.get("title") or ""), "html": stored["html"]}
    if isinstance(stored.get("subtitle"), str):
        view["subtitle"] = stored["subtitle"]
    return view


@router.get("/views/{view_id}")
def get_view(view_id: str):
    view = _view(view_id)
    if view is None:
        return JSONResponse({"error": "noSuchView"}, status_code=404)
    return view


BROWSER_ACCOUNT = re.compile(r"^[A-Za-z0-9_.@+-]{1,128}$")
BROWSER_GENERATION = re.compile(r"^[a-f0-9]{32}$")
BROWSER_ERRORS = {"browserBusy", "browserStateChanged", "browserInputStopped", "browserInputInvalid", "browserInputFailed"}


def _inspect_sessions() -> Path:
    named = os.environ.get("LOG_INSPECT_CURRENT", "").strip()
    if named:
        return Path(named).parent / "sessions"
    home = os.environ.get("LOG_HOME", "").strip()
    return (Path(home) if home else _home()) / "runs" / "inspect" / "sessions"


def _browser_viewer(account: str) -> dict[str, Any] | None:
    if not BROWSER_ACCOUNT.fullmatch(account or ""):
        return None
    session = _read(_inspect_sessions() / f"{re.sub(r'[^A-Za-z0-9_.-]', '_', account)}.json")
    if not isinstance(session, dict) or session.get("account") != account or not isinstance(session.get("runDir"), str):
        return None
    descriptor = _read(Path(session["runDir"]) / "browserViewer.json")
    if not isinstance(descriptor, dict) or not isinstance(descriptor.get("port"), int) or not isinstance(descriptor.get("token"), str):
        return None
    if not BROWSER_GENERATION.fullmatch(str(descriptor.get("generation") or "")) or not 0 < descriptor["port"] < 65536:
        return None
    return descriptor


def _browser_call(descriptor: dict[str, Any], method: str, path: str, body: Any = None, timeout: float = 8) -> tuple[int, dict[str, str], bytes]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(f"http://127.0.0.1:{descriptor['port']}{path}", data=data, method=method, headers={"Authorization": f"Bearer {descriptor['token']}", **({"Content-Type": "application/json"} if data is not None else {})})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, {key.lower(): value for key, value in response.headers.items()}, response.read()
    except urllib.error.HTTPError as error:
        return error.code, {}, error.read()


def _browser_view(account: str, state: Any, generation: str) -> dict[str, Any] | None:
    if not isinstance(state, dict) or state.get("generation") != generation or not isinstance(state.get("revision"), str):
        return None
    phase = "needsAttention" if state.get("blocked") else "busy" if state.get("busy") else "signInRequired" if state.get("inputAllowed") else "ready"
    url = state.get("url") if isinstance(state.get("url"), str) else ""
    address = re.sub(r"[?#].*$", "", url) if url.startswith(("http://", "https://")) else None
    return {"account": account, "phase": phase, "needsHuman": bool(state.get("blocked") or state.get("inputAllowed")), "generation": generation, "revision": state["revision"], "pageState": state.get("state"), "address": address, "width": state.get("width"), "height": state.get("height"), "canInteract": phase == "signInRequired"}


def _browser_missing(account: str, phase: str) -> dict[str, Any]:
    return {"account": account, "phase": phase, "needsHuman": False, "generation": None, "revision": None, "pageState": None, "address": None, "width": None, "height": None, "canInteract": False}


@router.get("/browser/{account}")
def browser_state(account: str):
    descriptor = _browser_viewer(account)
    if descriptor is None:
        return {"view": _browser_missing(account, "browserMissing")}
    try:
        status, _headers, body = _browser_call(descriptor, "GET", "/state")
        view = _browser_view(account, json.loads(body), descriptor["generation"]) if status == 200 else None
    except (OSError, ValueError):
        view = None
    return {"view": view or _browser_missing(account, "viewerUnavailable")}


def _browser_attached(account: str, generation: Any) -> dict[str, Any] | JSONResponse:
    descriptor = _browser_viewer(account)
    if descriptor is None:
        return JSONResponse({"error": "browserMissing"}, status_code=404)
    if generation != descriptor["generation"]:
        return JSONResponse({"error": "browserGenerationChanged"}, status_code=409)
    return descriptor


@router.post("/browser/{account}/ticket")
def browser_ticket(account: str, payload: dict = Body(default={})):
    descriptor = _browser_attached(account, payload.get("generation"))
    if isinstance(descriptor, JSONResponse):
        return descriptor
    try:
        status, _headers, body = _browser_call(descriptor, "POST", "/ticket", {"seconds": 60})
        ticket = json.loads(body).get("ticket") if status == 200 else None
    except (OSError, ValueError, AttributeError):
        ticket = None
    if not isinstance(ticket, str) or not re.fullmatch(r"[A-Za-z0-9_-]{16,64}", ticket):
        return JSONResponse({"error": "browserStreamUnavailable"}, status_code=503)
    return {"url": f"http://127.0.0.1:{descriptor['port']}/stream?ticket={ticket}", "generation": descriptor["generation"]}


@router.get("/browser/{account}/frame")
def browser_frame(account: str, generation: str = "", after: int = 0):
    descriptor = _browser_attached(account, generation)
    if isinstance(descriptor, JSONResponse):
        return descriptor
    try:
        status, headers, body = _browser_call(descriptor, "GET", f"/frame?after={max(0, int(after))}")
    except OSError:
        status, headers, body = 503, {}, b""
    if status != 200 or headers.get("x-log-browser-generation") != descriptor["generation"]:
        return JSONResponse({"error": "browserViewerUnavailable"}, status_code=503)
    return {"data": base64.b64encode(body).decode(), "revision": headers.get("x-log-browser-revision"), "seq": int(headers.get("x-log-frame-seq") or 0), "source": headers.get("x-log-frame-source") or "screenshot"}


@router.post("/browser/{account}/input")
def browser_input(account: str, payload: dict = Body(default={})):
    descriptor = _browser_attached(account, payload.get("generation"))
    if isinstance(descriptor, JSONResponse):
        return descriptor
    event = payload.get("event") if isinstance(payload.get("event"), dict) else {}
    try:
        status, _headers, body = _browser_call(descriptor, "POST", "/input", {**event, "generation": descriptor["generation"], "revision": payload.get("revision")}, timeout=120)
        answer = json.loads(body)
    except (OSError, ValueError):
        return JSONResponse({"error": "browserViewerUnavailable"}, status_code=503)
    if status != 200:
        code = answer.get("error") if isinstance(answer, dict) and answer.get("error") in BROWSER_ERRORS else "browserViewerUnavailable"
        return JSONResponse({"error": code}, status_code=409)
    return {"view": _browser_view(account, answer, descriptor["generation"]) or _browser_missing(account, "viewerUnavailable")}


GENUI_API = ("vendor", "hermesGenui", "dashboard", "plugin_api.py")
PACKAGE = ("@listeningkit", "log")


def _hooks_root() -> Path | None:
    here = Path(__file__).resolve().parents[1]
    for meta in (here / "plugin.yaml", here.parent / "logHooks" / "plugin.yaml"):
        try:
            for line in meta.read_text(encoding="utf-8").splitlines():
                if line.startswith("log_root:"):
                    return Path(line.split(":", 1)[1].strip().strip("'\""))
        except OSError:
            continue
    return None


def _log_roots() -> list[Path]:
    roots: list[Path] = []
    named = os.environ.get("LOG_ROOT", "").strip()
    if named:
        roots.append(Path(named))
    hooks = _hooks_root()
    if hooks is not None:
        roots.append(hooks)
    bun = Path(os.environ.get("BUN_INSTALL", "").strip() or Path.home() / ".bun")
    roots.append(bun.joinpath("install", "global", "node_modules", *PACKAGE))
    appdata = os.environ.get("APPDATA", "").strip()
    if appdata:
        roots.append(Path(appdata).joinpath("npm", "node_modules", *PACKAGE))
    return roots


def _genui_router() -> APIRouter | None:
    for root in _log_roots():
        path = root.joinpath(*GENUI_API)
        if not path.is_file():
            continue
        try:
            spec = importlib.util.spec_from_file_location("log_hermes_genui_api", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module.router
        except Exception:
            return None
    return None


_genui = _genui_router()
if _genui is not None:
    router.include_router(_genui)
