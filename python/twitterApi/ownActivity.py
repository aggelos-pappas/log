from __future__ import annotations

import asyncio
import json
import random
from pathlib import Path
from typing import Any, Awaitable, Callable

KINDS = ("replies", "likes", "following")
PAGE = 20
KEEP = 400
POLL_STEPS_SECONDS = (15 * 60.0, 30 * 60.0, 60 * 60.0)


def read_seen(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def write_seen(path: Path, seen: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(seen), encoding="utf-8")
    tmp.replace(path)


def legacy_of(tweet: Any) -> dict[str, Any]:
    return getattr(tweet, "_legacy", None) or {}


def user_of(tweet: Any) -> tuple[str, str | None]:
    user = getattr(tweet, "user", None)
    return str(getattr(user, "id", "") or ""), getattr(user, "screen_name", None)


def text_of(tweet: Any) -> str:
    return (getattr(tweet, "full_text", None) or getattr(tweet, "text", "") or "")[:280]


def own_post_of(tweet: Any, me: str) -> dict[str, Any] | None:
    author, handle = user_of(tweet)
    if author and author != me:
        return None
    reposted = getattr(tweet, "retweeted_tweet", None)
    if reposted is not None:
        user_id, to = user_of(reposted)
        return {"kind": "repost", "id": str(tweet.id), "tweetId": str(reposted.id), "userId": user_id, "handle": to, "text": text_of(reposted), "at": getattr(tweet, "created_at", None)}
    legacy = legacy_of(tweet)
    replied = legacy.get("in_reply_to_status_id_str")
    if replied:
        to = legacy.get("in_reply_to_screen_name")
        return {"kind": "reply", "id": str(tweet.id), "tweetId": str(replied), "userId": str(legacy.get("in_reply_to_user_id_str") or ""), "handle": to, "text": text_of(tweet), "at": getattr(tweet, "created_at", None), "url": f"https://x.com/{handle or 'i'}/status/{tweet.id}"}
    quoted = getattr(tweet, "quote", None)
    if quoted is not None:
        user_id, to = user_of(quoted)
        return {"kind": "quote", "id": str(tweet.id), "tweetId": str(quoted.id), "userId": user_id, "handle": to, "text": text_of(tweet), "at": getattr(tweet, "created_at", None), "url": f"https://x.com/{handle or 'i'}/status/{tweet.id}"}
    return {"kind": "post", "id": str(tweet.id), "tweetId": str(tweet.id), "userId": me, "handle": handle, "text": text_of(tweet), "at": getattr(tweet, "created_at", None), "url": f"https://x.com/{handle or 'i'}/status/{tweet.id}"}


def like_of(tweet: Any) -> dict[str, Any]:
    user_id, handle = user_of(tweet)
    return {"kind": "like", "id": str(tweet.id), "tweetId": str(tweet.id), "userId": user_id, "handle": handle, "text": text_of(tweet), "at": None, "url": f"https://x.com/{handle or 'i'}/status/{tweet.id}"}


def follow_of(user: Any) -> dict[str, Any]:
    user_id = str(getattr(user, "id", "") or "")
    return {"kind": "follow", "id": user_id, "tweetId": None, "userId": user_id, "handle": getattr(user, "screen_name", None), "text": "", "at": None}


Reader = Callable[[str], Awaitable[list[dict[str, Any]]]]


def reader_for(client: Any, me: str) -> Reader:
    async def read(kind: str) -> list[dict[str, Any]]:
        if kind == "replies":
            page = await client.get_user_tweets(me, "Replies", count=PAGE)
            tweets = [t for top in page for t in [top, *(getattr(top, "replies", None) or [])]]
            return [row for row in (own_post_of(t, me) for t in tweets) if row]
        if kind == "likes":
            return [like_of(t) for t in await client.get_user_tweets(me, "Likes", count=PAGE)]
        return [follow_of(u) for u in await client.get_user_following(me, count=PAGE)]

    return read


async def new_activity(read: Reader, path: Path, before_read: Callable[[], None] = lambda: None, kinds: tuple[str, ...] = KINDS) -> dict[str, Any]:
    seen = read_seen(path)
    out: list[dict[str, Any]] = []
    baselined: list[str] = []
    for i, kind in enumerate(kinds):
        if i:
            await asyncio.sleep(random.uniform(0.8, 2.5))
        before_read()
        rows = await read(kind)
        known = seen.get(kind)
        ids = [r["id"] for r in rows if r.get("id")]
        if not isinstance(known, list):
            baselined.append(kind)
        else:
            had = set(known)
            out.extend(r for r in rows if r.get("id") and r["id"] not in had)
        seen[kind] = (ids + [k for k in (known or []) if k not in set(ids)])[:KEEP]
    write_seen(path, seen)
    return {"items": out, "baselined": baselined}


def next_wait(step: int, found: bool) -> tuple[float, int]:
    step = 0 if found else min(step + 1, len(POLL_STEPS_SECONDS) - 1)
    return POLL_STEPS_SECONDS[step] * random.uniform(0.9, 1.1), step
