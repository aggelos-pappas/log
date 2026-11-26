from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from twitterApi import ownActivity as own


def tweet(id: str, author: str, handle: str, **legacy):
    return SimpleNamespace(id=id, user=SimpleNamespace(id=author, screen_name=handle), full_text=f"text {id}", created_at="Thu Nov 26 17:00:00 +0000 2026", retweeted_tweet=None, quote=None, _legacy=legacy)


def reader(pages):
    async def read(kind):
        return pages[kind]

    return read


def test_first_read_baselines_then_only_new_items_come_out(tmp_path):
    path = tmp_path / "ownActivity.json"
    pages = {"replies": [{"kind": "reply", "id": "1"}], "likes": [{"kind": "like", "id": "a"}], "following": [{"kind": "follow", "id": "u1"}]}
    first = asyncio.run(own.new_activity(reader(pages), path))
    assert first == {"items": [], "baselined": ["replies", "likes", "following"]}
    pages["likes"] = [{"kind": "like", "id": "b"}, {"kind": "like", "id": "a"}]
    pages["following"] = [{"kind": "follow", "id": "u2"}, {"kind": "follow", "id": "u1"}]
    second = asyncio.run(own.new_activity(reader(pages), path))
    assert [i["id"] for i in second["items"]] == ["b", "u2"]
    assert asyncio.run(own.new_activity(reader(pages), path))["items"] == []


def test_every_read_is_counted(tmp_path):
    counted = []
    pages = {"replies": [], "likes": [], "following": []}
    asyncio.run(own.new_activity(reader(pages), tmp_path / "s.json", lambda: counted.append(1)))
    assert len(counted) == 3


def test_replies_tab_keeps_only_the_owners_own_tweets_and_names_who_he_answered():
    reply = tweet("10", "me", "fakeOwner", in_reply_to_status_id_str="9", in_reply_to_screen_name="grace", in_reply_to_user_id_str="77")
    other = tweet("9", "77", "grace")
    assert own.own_post_of(other, "me") is None
    row = own.own_post_of(reply, "me")
    assert (row["kind"], row["tweetId"], row["handle"], row["userId"]) == ("reply", "9", "grace", "77")


def test_replies_inside_a_conversation_module_are_read_too():
    parent = tweet("9", "77", "grace")
    parent.replies = [tweet("10", "me", "fakeOwner", in_reply_to_status_id_str="9", in_reply_to_screen_name="grace", in_reply_to_user_id_str="77")]

    class FakeClient:
        async def get_user_tweets(self, user_id, kind, count):
            return [parent]

    rows = asyncio.run(own.reader_for(FakeClient(), "me")("replies"))
    assert [(r["kind"], r["id"], r["handle"]) for r in rows] == [("reply", "10", "grace")]


def test_backoff_resets_on_activity_and_climbs_when_quiet():
    _, step = own.next_wait(0, False)
    _, step = own.next_wait(step, False)
    _, step = own.next_wait(step, False)
    assert step == 2
    wait, step = own.next_wait(step, True)
    assert step == 0 and 13 * 60 <= wait <= 17 * 60
