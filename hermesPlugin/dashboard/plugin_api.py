from __future__ import annotations

import importlib.util
import json
import os
import re
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter
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
