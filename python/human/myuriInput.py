from __future__ import annotations

import asyncio
import hashlib
import random
import time
from typing import Any, Callable

IDENTITY_OS = "windows"
WHEEL_DEVICE = "mouse"
SECRET_MISTAKES = 0.0

try:
    import myuri as _myuri
except ImportError:
    _myuri = None


def available() -> bool:
    return _myuri is not None


def seed_for(account: Any) -> int:
    if not account:
        return random.SystemRandom().randrange(1, 2**31 - 1)
    return int.from_bytes(hashlib.sha256(f"myuri:{str(account)}".encode("utf8")).digest()[:4], "big") or 1


def make_stream(seed: int) -> Callable[[], float]:
    if _myuri is None:
        return random.Random(seed).random
    return _myuri.make_rng(seed)


def path(start: tuple[float, float], end: tuple[float, float], stream: Callable[[], float]) -> list[tuple[float, float, float]]:
    if _myuri is None:
        return [(0.0, end[0], end[1])]
    points = _myuri.plan_move(_myuri.Vector(start[0], start[1]), _myuri.Vector(end[0], end[1]), stream, os=IDENTITY_OS)
    return [(float(getattr(p, "t", getattr(p, "timestamp", 0.0))), float(p.x), float(p.y)) for p in points]


def _fixed_keystrokes(text: str) -> list[tuple[float, str, str]]:
    steps: list[tuple[float, str, str]] = []
    for i, ch in enumerate(text):
        at = i * 90.0
        if ch.isascii() and ch.isprintable():
            steps += [(at, "down", ch), (at + 40.0, "up", ch)]
        else:
            steps.append((at, "insert", ch))
    return steps


def account_seed() -> int:
    try:
        from browser import proxyGate
        return seed_for(proxyGate._armed.get("devicePath"))
    except Exception:
        return seed_for(None)


def keystrokes(text: str, stream: Callable[[], float], secret: bool = False) -> list[tuple[float, str, str]]:
    if _myuri is None:
        return _fixed_keystrokes(text)
    steps = _myuri.plan_type(text, stream, os=IDENTITY_OS, mistake_multiplier=SECRET_MISTAKES if secret else None)
    return [(float(t), str(kind), str(key)) for t, kind, key in steps]


def wheel(dx: float, dy: float, stream: Callable[[], float]) -> list[tuple[float, str, Any, Any]]:
    if _myuri is None:
        return [(0.0, "wheel", dx, dy)]
    out: list[tuple[float, str, Any, Any]] = []
    for step in _myuri.plan_wheel(dx, dy, stream, os=IDENTITY_OS, device=WHEEL_DEVICE):
        if step[0] == "wheel":
            out.append((float(step[3]), "wheel", float(step[1]), float(step[2])))
        else:
            out.append((float(step[3]), "key", step[1], step[2]))
    return out


def typed_text(steps: list[tuple[float, str, str]]) -> str:
    text: list[str] = []
    shift = False
    for _t, kind, key in steps:
        if kind == "insert":
            text.append(key)
        elif key == "Shift":
            shift = kind == "down"
        elif kind == "down" and key == "Backspace":
            if text:
                text.pop()
        elif kind == "down" and len(key) == 1:
            text.append(key.upper() if shift and key.isalpha() else key)
        elif kind == "down" and key == "Space":
            text.append(" ")
    return "".join(text)


async def _send_key(keyboard: Any, kind: str, key: str) -> None:
    if kind == "insert":
        await keyboard.insert_text(key)
    elif kind == "down":
        await keyboard.down(key)
    else:
        await keyboard.up(key)


def _send_key_sync(keyboard: Any, kind: str, key: str) -> None:
    if kind == "insert":
        keyboard.insert_text(key)
    elif kind == "down":
        keyboard.down(key)
    else:
        keyboard.up(key)


async def type_text(page: Any, text: str, seed: int | None = None, secret: bool = False, log: Callable[[str], None] = lambda _l: None) -> int:
    steps = keystrokes(text, make_stream(seed if seed is not None else account_seed()), secret)
    started = time.monotonic()
    held: set[str] = set()
    try:
        for at, kind, key in steps:
            wait = at / 1000 - (time.monotonic() - started)
            if wait > 0:
                await asyncio.sleep(wait)
            await _send_key(page.keyboard, kind, key)
            if kind == "down":
                held.add(key)
            elif kind == "up":
                held.discard(key)
    finally:
        for key in list(held):
            try:
                await page.keyboard.up(key)
            except Exception:
                pass
    log(f"  type: {len(text)} chars in {len(steps)} key steps, {(time.monotonic() - started) * 1000:.0f} ms ({'myuri' if available() else 'fixed'})")
    return len(steps)


def type_text_sync(page: Any, text: str, seed: int | None = None, secret: bool = False, log: Callable[[str], None] = lambda _l: None) -> int:
    steps = keystrokes(text, make_stream(seed if seed is not None else account_seed()), secret)
    started = time.monotonic()
    held: set[str] = set()
    try:
        for at, kind, key in steps:
            wait = at / 1000 - (time.monotonic() - started)
            if wait > 0:
                time.sleep(wait)
            _send_key_sync(page.keyboard, kind, key)
            if kind == "down":
                held.add(key)
            elif kind == "up":
                held.discard(key)
    finally:
        for key in list(held):
            try:
                page.keyboard.up(key)
            except Exception:
                pass
    log(f"  type: {len(text)} chars in {len(steps)} key steps, {(time.monotonic() - started) * 1000:.0f} ms ({'myuri' if available() else 'fixed'})")
    return len(steps)


async def play_wheel(page: Any, dx: float, dy: float, stream: Callable[[], float]) -> int:
    steps = wheel(dx, dy, stream)
    started = time.monotonic()
    for at, kind, a, b in steps:
        wait = at / 1000 - (time.monotonic() - started)
        if wait > 0:
            await asyncio.sleep(wait)
        if kind == "wheel":
            await page.mouse.wheel(a, b)
        elif b == "down":
            await page.keyboard.down(a)
        else:
            await page.keyboard.up(a)
    return len(steps)


def play_wheel_sync(page: Any, dx: float, dy: float, stream: Callable[[], float]) -> int:
    steps = wheel(dx, dy, stream)
    started = time.monotonic()
    for at, kind, a, b in steps:
        wait = at / 1000 - (time.monotonic() - started)
        if wait > 0:
            time.sleep(wait)
        if kind == "wheel":
            page.mouse.wheel(a, b)
        elif b == "down":
            page.keyboard.down(a)
        else:
            page.keyboard.up(a)
    return len(steps)
