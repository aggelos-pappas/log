from __future__ import annotations

import json
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from logHome import log_home

HEAD = "head"

STORES: dict[str, dict[str, Any]] = {
    "xInbox": {"platform": "twitter", "splits": ("xchat",)},
    "xNotifications": {"platform": "twitter", "splits": ("rows", "engagements")},
    "xLastCall": {"platform": "twitter", "splits": ()},
    "discordServers": {"platform": "discord", "splits": ()},
    "discordThreads": {"platform": "discord", "splits": ()},
    "linkedinConnects": {"platform": "linkedin", "splits": ()},
}

Merge = Callable[[dict[str, Any], dict[str, Any]], None]
Valid = Callable[[Any], bool]


def db_path() -> Path:
    if os.environ.get("LOG_DB"):
        return Path(os.environ["LOG_DB"])
    if os.environ.get("LOG_INBOX_STATE"):
        return Path(os.environ["LOG_INBOX_STATE"]) / "log.db"
    return log_home() / "log.db"


def connect() -> sqlite3.Connection | None:
    path = db_path()
    if not path.is_file():
        return None
    try:
        handle = sqlite3.connect(f"{path.resolve().as_uri()}?mode=rw", uri=True, timeout=10, isolation_level=None)
    except sqlite3.Error:
        return None
    try:
        handle.execute("PRAGMA busy_timeout = 10000")
        if handle.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'engineState'").fetchone() is None:
            handle.close()
            return None
    except sqlite3.Error:
        handle.close()
        return None
    return handle


def import_key(store: str, account: str) -> str:
    return f"engineState:{STORES[store]['platform']}:{account}:{store}"


def _text(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def parts_of(store: str, state: dict[str, Any]) -> dict[str, str]:
    splits = STORES[store]["splits"]
    out = {HEAD: _text({k: v for k, v in state.items() if k not in splits})}
    for key in splits:
        for name, value in (state.get(key) or {}).items():
            out[f"{key}:{name}"] = _text(value)
    return out


def assemble(store: str, rows: list[tuple[str, str]]) -> dict[str, Any] | None:
    splits = STORES[store]["splits"]
    out: dict[str, Any] = {key: {} for key in splits}
    head = False
    for part, body in rows:
        try:
            value = json.loads(body)
        except ValueError:
            continue
        if part == HEAD:
            if isinstance(value, dict):
                out.update(value)
            head = True
            continue
        key, _, name = part.partition(":")
        if key in splits and name:
            out[key][name] = value
    return out if head else None


def _rows(handle: sqlite3.Connection, store: str, account: str) -> list[tuple[str, str]]:
    return handle.execute("SELECT part, body FROM engineState WHERE platform = ? AND account = ? AND store = ?", (STORES[store]["platform"], account, store)).fetchall()


def _save(handle: sqlite3.Connection, store: str, account: str, state: dict[str, Any]) -> int:
    held = dict(_rows(handle, store, account))
    now = int(time.time() * 1000)
    changed = 0
    for part, text in parts_of(store, state).items():
        if held.get(part) == text:
            continue
        handle.execute(
            "INSERT INTO engineState (platform, account, store, part, body, updatedAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(platform, account, store, part) DO UPDATE SET body = excluded.body, updatedAt = excluded.updatedAt",
            (STORES[store]["platform"], account, store, part, text, now),
        )
        changed += 1
    return changed


def _stamp(legacy: Path | None) -> int | None:
    try:
        return legacy.stat().st_mtime_ns // 1_000_000 if legacy is not None else None
    except OSError:
        return None


def _legacy_changed(handle: sqlite3.Connection, store: str, account: str, legacy: Path | None) -> int | None:
    stamp = _stamp(legacy)
    if stamp is None:
        return None
    row = handle.execute("SELECT detail FROM imports WHERE store = ? AND state = 'done'", (import_key(store, account),)).fetchone()
    try:
        if row is not None and stamp <= int(row[0]):
            return None
    except (TypeError, ValueError):
        pass
    return stamp


def _import_legacy(handle: sqlite3.Connection, store: str, account: str, legacy: Path | None, merge: Merge | None, valid: Valid) -> None:
    stamp = _legacy_changed(handle, store, account, legacy)
    if stamp is None or legacy is None:
        return
    key = import_key(store, account)
    try:
        loaded = json.loads(legacy.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        loaded = None
    rows = 0
    if valid(loaded):
        held = assemble(store, _rows(handle, store, account))
        if held is not None and merge is not None:
            merge(loaded, held)
        rows = _save(handle, store, account, loaded)
    at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    handle.execute(
        "INSERT INTO imports (store, state, files, rows, detail, startedAt, endedAt) VALUES (?, 'done', 1, ?, ?, ?, ?) ON CONFLICT(store) DO UPDATE SET state = 'done', files = 1, rows = excluded.rows, detail = excluded.detail, endedAt = excluded.endedAt",
        (key, rows, str(stamp), at, at),
    )


def read(store: str, account: str, legacy: Path | None, merge: Merge | None, valid: Valid) -> tuple[bool, dict[str, Any] | None]:
    handle = connect()
    if handle is None:
        return False, None
    try:
        if _legacy_changed(handle, store, account, legacy) is not None:
            handle.execute("BEGIN IMMEDIATE")
            try:
                _import_legacy(handle, store, account, legacy, merge, valid)
                handle.execute("COMMIT")
            except Exception:
                handle.execute("ROLLBACK")
                raise
        state = assemble(store, _rows(handle, store, account))
        return True, state if valid(state) else None
    except sqlite3.Error:
        return False, None
    finally:
        handle.close()


def write(store: str, account: str, state: dict[str, Any], legacy: Path | None, merge: Merge | None, valid: Valid) -> bool:
    handle = connect()
    if handle is None:
        return False
    try:
        handle.execute("BEGIN IMMEDIATE")
        try:
            _import_legacy(handle, store, account, legacy, merge, valid)
            held = assemble(store, _rows(handle, store, account))
            if held is not None and merge is not None and valid(held):
                merge(state, held)
            _save(handle, store, account, state)
            handle.execute("COMMIT")
        except Exception:
            handle.execute("ROLLBACK")
            raise
        return True
    except sqlite3.Error:
        return False
    finally:
        handle.close()


def is_object(state: Any) -> bool:
    return isinstance(state, dict)


def load(store: str, legacy: Path, valid: Valid = is_object) -> dict[str, Any] | None:
    used, state = read(store, legacy.parent.name, legacy, None, valid)
    if used:
        return state
    try:
        state = json.loads(legacy.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return state if valid(state) else None


def save(store: str, legacy: Path, state: dict[str, Any], merge: Merge | None = None, valid: Valid = is_object) -> None:
    if write(store, legacy.parent.name, state, legacy, merge, valid):
        return
    legacy.parent.mkdir(parents=True, exist_ok=True)
    legacy.write_text(json.dumps(state), encoding="utf-8")
