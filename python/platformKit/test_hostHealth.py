from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from platformKit import engine as kit
from discordApi import engine as discord


def test_an_import_failure_poisons_the_host() -> None:
    assert kit.poisoned({"ok": False, "code": "ImportError", "detail": "cannot import name 'ArgsKwargs' from 'pydantic_core._pydantic_core' (unknown location)"})
    assert kit.poisoned({"ok": False, "code": "platformError", "detail": "ImportError: DLL load failed while importing win32clipboard"})
    assert not kit.poisoned({"ok": False, "code": "rateLimited", "detail": "Discord answered 429"})
    assert not kit.poisoned({"ok": True})


def test_a_host_keeps_one_discord_client_per_token_and_identity() -> None:
    made: list[str] = []
    saved = (discord.identity, discord.browserRest.browser_discord)
    discord.browserRest.browser_discord = lambda token, identity, launched: made.append(token) or object()
    try:
        discord.CLIENTS.clear()
        discord.identity = {"headers": {"user-agent": "a"}}
        first = discord.client_of("tokenA")
        assert discord.client_of("tokenA") is first
        discord.identity = {"headers": {"user-agent": "b"}}
        assert discord.client_of("tokenA") is not first
        assert made == ["tokenA", "tokenA"]
    finally:
        discord.identity, discord.browserRest.browser_discord = saved
        discord.CLIENTS.clear()
