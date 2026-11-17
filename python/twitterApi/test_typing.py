from __future__ import annotations

import ast
import asyncio
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from twitterApi import engine


class FakeGql:
    async def create_tweet(self, *args, **kwargs):
        return {"data": {"create_tweet": {"tweet_results": {"result": {"rest_id": "77"}}}}}, {}


class FakeClient:
    def __init__(self, order):
        self.order = order
        self.gql = FakeGql()

    async def create_tweet(self, **kwargs):
        self.order.append("create")
        await self.gql.create_tweet(**kwargs)
        return SimpleNamespace(id="77")

    async def send_dm(self, user_id, text, media_id=None):
        self.order.append("dm")
        return SimpleNamespace(id="m1", sender_id="1", recipient_id=user_id)


def run(spec, monkeypatch, seconds=6.0):
    order = []
    monkeypatch.setattr(engine, "state_dir", lambda account: Path(tempfile.mkdtemp()))

    async def fake_sleep(s):
        order.append(("typing", s))

    monkeypatch.setattr(engine.asyncio, "sleep", fake_sleep)
    monkeypatch.setattr(engine, "typing_seconds", lambda text: seconds)
    out = asyncio.run(engine.send(FakeClient(order), spec))
    return out, order


def test_a_post_is_typed_before_x_gets_it(monkeypatch):
    out, order = run({"action": "post", "account": "typingTest", "text": "apple took itself out", "media": []}, monkeypatch)
    assert order == [("typing", 6.0), "create"]
    assert out["ok"] is True and out["typedSeconds"] == 6.0


def test_a_quote_is_typed_before_x_gets_it(monkeypatch):
    out, order = run({"action": "quote", "text": "loud take", "tweetUrl": "https://x.com/a/status/5"}, monkeypatch, 4.2)
    assert order == [("typing", 4.2), "create"] and out["typedSeconds"] == 4.2


def test_a_dm_is_typed_before_x_gets_it(monkeypatch):
    out, order = run({"action": "dm", "account": "typingTest", "text": "yo", "userId": "2"}, monkeypatch, 2.0)
    assert order == [("typing", 2.0), "dm"] and out["typedSeconds"] == 2.0


def test_typing_time_grows_with_the_text_and_stays_capped():
    assert 1.5 <= engine.typing_seconds("hi") <= 3.4
    assert 12.0 <= engine.typing_seconds("x" * 280) <= 20.0


TEXT_SENDS = {"create_tweet", "send_dm", "send_xchat_message"}


def awaited_call(node):
    value = node.value if isinstance(node, (ast.Assign, ast.Expr, ast.AnnAssign)) else None
    if isinstance(value, ast.Await) and isinstance(value.value, ast.Call):
        func = value.value.func
        return func.attr if isinstance(func, ast.Attribute) else getattr(func, "id", None)
    return None


def untyped_sends(source):
    found = []
    for node in ast.walk(ast.parse(source)):
        for field in ("body", "orelse"):
            block = getattr(node, field, None)
            if not isinstance(block, list):
                continue
            for i, stmt in enumerate(block):
                name = awaited_call(stmt)
                owner = stmt.value.value.func.value if name in TEXT_SENDS else None
                if name in TEXT_SENDS and not (isinstance(owner, ast.Attribute) and owner.attr == "gql") and (i == 0 or awaited_call(block[i - 1]) != "typed"):
                    found.append(f"line {stmt.lineno}: {name}")
    return found


def test_every_text_x_gets_is_typed_first():
    source = (Path(__file__).resolve().parent / "engine.py").read_text(encoding="utf-8")
    assert untyped_sends(source) == []


def test_the_guard_catches_a_send_with_no_typing():
    assert untyped_sends("async def f(client):\n    tweet = await client.create_tweet(text='x')\n") == ["line 2: create_tweet"]
