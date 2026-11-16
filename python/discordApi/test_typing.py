from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from discordApi import engine


class FakeClient:
    def __init__(self, typing_answers):
        self.typing_answers = list(typing_answers)
        self.calls = []

    def send_typing(self, channel):
        self.calls.append(("typing", channel))
        return self.typing_answers.pop(0) if self.typing_answers else True

    def send_message(self, channel, content, attachments=None):
        self.calls.append(("message", channel, content))
        return {"channel_id": channel, "id": "9", "timestamp": "t", "content": content}


def opened(client):
    return lambda token: (client, None)


def no_files(client, target, paths):
    return [], None


def test_a_message_says_typing_first_and_keeps_saying_it_while_the_text_is_typed(monkeypatch):
    client = FakeClient([])
    slept = []
    monkeypatch.setattr(engine, "open_client", opened(client))
    monkeypatch.setattr(engine, "attached_media", lambda c, t, text: ([], None))
    monkeypatch.setattr(engine, "attached_files", no_files)
    monkeypatch.setattr(engine, "typing_seconds", lambda text: 19.0)
    out = engine.send_of("token", "123", "a message long enough to type for a while", sleep=slept.append)
    assert out["ok"] and out["event"] == "sent"
    assert [c[0] for c in client.calls] == ["typing", "typing", "typing", "message"]
    assert slept == [8.0, 8.0, 3.0]


def test_a_refused_or_unanswered_typing_signal_sends_nothing(monkeypatch):
    for answer, code in ((False, "sendFailed"), (None, "platformError")):
        client = FakeClient([answer])
        monkeypatch.setattr(engine, "open_client", opened(client))
        monkeypatch.setattr(engine, "attached_media", lambda c, t, text: ([], None))
        monkeypatch.setattr(engine, "attached_files", no_files)
        out = engine.send_of("token", "123", "hey", sleep=lambda s: None)
        assert not out["ok"] and out["code"] == code
        assert all(c[0] != "message" for c in client.calls)


def test_a_media_only_message_goes_without_typing(monkeypatch):
    client = FakeClient([])
    monkeypatch.setattr(engine, "open_client", opened(client))
    monkeypatch.setattr(engine, "attached_media", lambda c, t, text: ([{"id": "0"}], None))
    monkeypatch.setattr(engine, "attached_files", no_files)
    out = engine.send_of("token", "123", "https://example.com/clip.mp4", sleep=lambda s: None)
    assert out["ok"] and [c[0] for c in client.calls] == ["message"]


def test_typing_time_grows_with_the_text_and_stays_capped():
    assert 1.5 <= engine.typing_seconds("hi") <= 3.4
    assert 12.0 <= engine.typing_seconds("x" * 2000) <= 20.0
