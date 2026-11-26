from __future__ import annotations

import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from twitterApi import engine


def tweet(id_, text, media=None, reposted=None, user="someone"):
    return SimpleNamespace(id=id_, created_at="Thu Nov 12 17:56:00 +0000 2026", full_text=text, text=text, retweeted_tweet=reposted, is_quote_status=False, favorite_count=5, retweet_count=2, reply_count=1, quote_count=0, view_count="120", media=media or [], user=SimpleNamespace(screen_name=user))


def video(duration=62000):
    return SimpleNamespace(_data={"type": "video", "media_url_https": "https://pbs.twimg.com/thumb.jpg", "video_info": {"duration_millis": duration, "variants": [
        {"content_type": "application/x-mpegURL", "url": "https://video.twimg.com/v.m3u8"},
        {"content_type": "video/mp4", "bitrate": 832000, "url": "https://video.twimg.com/low.mp4"},
        {"content_type": "video/mp4", "bitrate": 10368000, "url": "https://video.twimg.com/high.mp4"},
    ]}})


class Page(list):
    def __init__(self, items, nxt=None):
        super().__init__(items)
        self.next_cursor = "c" if nxt else None
        self._next = nxt

    async def next(self):
        return self._next


class FakeClient:
    def __init__(self, pages):
        self.pages = pages
        self.calls = []

    async def get_user_by_screen_name(self, handle):
        self.calls.append(("user", handle))
        return SimpleNamespace(id="42", screen_name=handle, name="Someone", description="", location="", followers_count=685, following_count=10, statuses_count=1664, can_dm=True, protected=False, created_at=None, profile_image_url=None)

    async def get_user_tweets(self, user_id, kind, count=40):
        self.calls.append(("tweets", user_id, kind, count))
        return self.pages


def test_a_post_keeps_its_text_stats_and_best_video():
    row = engine.post_of(tweet("1", "introducing log", [video()]), "someone")
    assert row["url"] == "https://x.com/someone/status/1" and row["views"] == 120 and row["likes"] == 5
    assert row["media"] == [{"type": "video", "url": "https://pbs.twimg.com/thumb.jpg", "videoUrl": "https://video.twimg.com/high.mp4", "durationMs": 62000}]


def test_a_repost_points_at_the_original_author():
    original = tweet("9", "their post", user="other")
    row = engine.post_of(tweet("2", "RT", reposted=original), "someone")
    assert row["repostOf"] == "other" and row["url"] == "https://x.com/other/status/9" and row["text"] == "their post"


def test_user_posts_pages_until_the_limit_and_reads_the_media_tab_when_asked(monkeypatch):
    async def no_sleep(_):
        return None

    monkeypatch.setattr(engine.asyncio, "sleep", no_sleep)
    second = Page([tweet("3", "c"), tweet("4", "d")])
    client = FakeClient(Page([tweet("1", "a"), tweet("2", "b")], second))
    out = asyncio.run(engine.user_posts(client, {"user": "@someone", "limit": 3, "mediaOnly": True}))
    assert [p["id"] for p in out["posts"]] == ["1", "2", "3"] and out["pages"] == 2
    assert client.calls[0] == ("user", "someone") and client.calls[1] == ("tweets", "42", "Media", 3)
    assert out["user"]["followers"] == 685


def test_a_follower_keeps_the_picture_url_the_engine_answer_carries():
    user = SimpleNamespace(id="7", screen_name="someone", name="Someone", description="", location="", followers_count=1, following_count=2, statuses_count=3, can_dm=True, protected=False, created_at=None, profile_image_url=None, profile_image_url_https="https://pbs.example/picture.jpg")
    row = engine.follower_of(user)
    assert row["pictureUrl"] == "https://pbs.example/picture.jpg"


def test_dm_and_notification_people_keep_the_picture_url_the_client_bundle_uses():
    users = {"7": {"screen_name": "someone", "name": "Someone", "profile_image_url_https": "https://pbs.example/person.jpg"}}
    person = engine.user_of(users, "7")
    assert person["pictureUrl"] == "https://pbs.example/person.jpg"

    from twitterApi.notifications import engager, person as notification_person

    brief = {"user_id": "8", "screen_name": "other", "name": "Other", "profile_image_url_https": "https://pbs.example/other.jpg"}
    assert notification_person(brief)["pictureUrl"] == "https://pbs.example/other.jpg"
    assert engager(SimpleNamespace(id="9", screen_name="third", name="Third", followers_count=1, profile_image_url="https://pbs.example/third.jpg"))["pictureUrl"] == "https://pbs.example/third.jpg"
