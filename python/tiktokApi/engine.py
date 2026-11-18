from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from platformKit import engine as kit
from platformKit import media
import random
import string

from tiktokApi import transport, upload

PLATFORM = "tiktok"
LIBRARY = None
WRITES: tuple[str, ...] = ("post", "deletePost")
STUDIO = "https://www.tiktok.com/tiktokstudio/content"
PAGE_SIZE = 30
MAX_PAGES = 20


def message_of(message_id: str, at: str | None, sender: str | None, from_me: bool, text: str | None, attachments: list[dict[str, Any]]) -> dict[str, Any]:
    return {"id": message_id, "at": at, "from": sender, "fromMe": from_me, "text": media.text_with_audio(text, attachments), "attachments": [{k: v for k, v in a.items() if k != "url"} for a in attachments]}


def as_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def answer_json(res: Any) -> dict[str, Any] | None:
    try:
        data = res.json()
    except (ValueError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


async def studio_user(session: Any) -> tuple[dict[str, Any] | None, Any]:
    res = await session.get("https://www.tiktok.com/tiktokstudio/api/web/user", headers=transport.headers(STUDIO))
    return answer_json(res), res


def logged_out(detail: str, status: int) -> dict[str, Any]:
    return {"ok": False, "code": "sessionDead", "detail": detail, "loginState": "loggedOut", "httpStatus": status}


def user_of(data: dict[str, Any]) -> dict[str, Any]:
    base = ((data.get("userBaseInfo") or {}).get("UserProfile") or {}).get("UserBase") or {}
    return {"userId": str(data.get("userId") or ""), "uniqueId": base.get("UniqueId") or base.get("UniqueID") or base.get("UserName"), "nickname": base.get("NickName") or base.get("Nickname"), "region": ((base.get("Region") or {}).get("Region"))}


async def signed_in(session: Any) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    data, res = await studio_user(session)
    if res.status_code in (301, 302, 401, 403) or not data:
        return None, logged_out(f"TikTok answered HTTP {res.status_code} to /tiktokstudio/api/web/user with no user", res.status_code)
    if data.get("statusCode") not in (0, None) or str(data.get("userId") or "0") == "0":
        return None, logged_out(f"TikTok answered statusCode {data.get('statusCode')} to /tiktokstudio/api/web/user: these cookies aren't signed in", res.status_code)
    return data, None


async def ping(spec: dict[str, Any], cookies: dict[str, str]) -> dict[str, Any]:
    async with transport.new_session(cookies) as session:
        data, dead = await signed_in(session)
        if dead:
            return dead
        user = user_of(data)
        return {"ok": True, "loginState": "loggedIn", "screenName": user["uniqueId"] or user["userId"], "user": user, "refreshedCookies": transport.refreshed(session, cookies)}


def tiktok_refused(path: str, res: Any, data: dict[str, Any] | None) -> dict[str, Any]:
    code = None if data is None else (data.get("status_code") if "status_code" in data else (data.get("BaseResp") or {}).get("StatusCode"))
    message = None if data is None else (data.get("status_msg") or (data.get("BaseResp") or {}).get("StatusMessage"))
    empty = data is None and not (res.text or "").strip()
    return {"ok": False, "code": "signatureRequired" if empty else "tiktokRefused", "detail": f"TikTok answered HTTP {res.status_code} to {path}" + (" with an empty body: it wants the page's signed request (X-Bogus)" if empty else f": status {code} {message or ''}".rstrip()), "httpStatus": res.status_code}


async def follow_counts(session: Any, cookies: dict[str, str], user_id: str, csrf: str) -> tuple[dict[str, int | None] | None, dict[str, Any] | None]:
    path = "/tiktokstudio/api/web/relation/multiGetFollowRelationCount"
    res = await session.get("https://www.tiktok.com" + path, params=transport.studio_query(cookies, {"userId": user_id}), headers=transport.headers(STUDIO, csrf=csrf, conv=True))
    data = answer_json(res)
    if not data or (data.get("BaseResp") or {}).get("StatusCode") not in (0, None):
        return None, tiktok_refused(path, res, data)
    return {"followers": as_int((data.get("FollowerCount") or {}).get(user_id)), "following": as_int((data.get("FollowingCount") or {}).get(user_id))}, None


def post_of(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(item.get("item_id") or ""),
        "caption": item.get("desc") or "",
        "postedAt": as_int(item.get("post_time")) or as_int(item.get("create_time")),
        "seconds": round((as_int(item.get("duration")) or 0) / 1000, 1),
        "views": as_int(item.get("play_count")),
        "likes": as_int(item.get("like_count")),
        "comments": as_int(item.get("comment_count")),
        "shares": as_int(item.get("share_count")),
        "saves": as_int(item.get("favorite_count")),
        "status": item.get("status"),
        "visibility": item.get("visibility"),
        "inReview": bool(item.get("in_review")),
        "pinned": bool(item.get("is_pinned")),
    }


async def item_list(session: Any, cookies: dict[str, str], csrf: str, limit: int) -> tuple[list[dict[str, Any]] | None, dict[str, Any] | None]:
    path = "/tiktok/creator/manage/item_list/v1/"
    out: list[dict[str, Any]] = []
    cursor = 0
    for _ in range(MAX_PAGES):
        body = {"cursor": cursor, "size": min(PAGE_SIZE, max(1, limit - len(out))), "query": {"conditions": [], "sort_orders": [{"field_name": "post_time", "order": 2}]}}
        res = await session.post("https://www.tiktok.com" + path, params=transport.studio_query(cookies), headers=transport.headers(STUDIO, csrf=csrf, conv=True, json_body=True), data=json.dumps(body, separators=(",", ":")))
        data = answer_json(res)
        if not data or data.get("status_code") not in (0, None):
            return None, tiktok_refused(path, res, data)
        out.extend(post_of(i) for i in data.get("item_list") or [] if isinstance(i, dict))
        if not data.get("has_more") or len(out) >= limit:
            break
        cursor = as_int(data.get("cursor")) or len(out)
    return out[:limit], None


async def stats(spec: dict[str, Any], cookies: dict[str, str]) -> dict[str, Any]:
    limit = max(1, int(spec.get("limit") or 50))
    async with transport.new_session(cookies) as session:
        data, dead = await signed_in(session)
        if dead:
            return dead
        user = user_of(data)
        csrf = str(data.get("tt-csrf-token") or cookies.get("tt_csrf_token") or "")
        counts, refused = await follow_counts(session, cookies, user["userId"], csrf)
        if refused:
            return refused
        posts, refused = await item_list(session, cookies, csrf, limit)
        if refused:
            return refused
        totals = {k: sum(p[k] or 0 for p in posts) for k in ("views", "likes", "comments", "shares", "saves")}
        return {"ok": True, "loginState": "loggedIn", "user": user, **counts, "postCount": len(posts), "totals": totals, "posts": posts, "refreshedCookies": transport.refreshed(session, cookies)}


UPLOAD_PAGE = "https://www.tiktok.com/tiktokstudio/upload"


def creation_id() -> str:
    return "".join(random.choice(string.ascii_letters + string.digits) for _ in range(21))


def post_body(video_id: str, caption: str, meta: dict[str, Any], visibility: int) -> dict[str, Any]:
    duration_ms = int(round(float(meta.get("Duration") or 0) * 1000))
    feature: dict[str, Any] = {
        "text": caption,
        "text_extra": [],
        "markup_text": caption,
        "music_info": {"origin_volume": "100"},
        "poster_delay": 0,
        "cloud_edit_video_height": int(meta.get("Height") or 1920),
        "cloud_edit_video_width": int(meta.get("Width") or 1080),
        "cloud_edit_is_use_video_canvas": False,
        "has_original_audio": 1,
        "is_upload_audio_track": False,
        "mature_theme_type": 0,
    }
    if duration_ms:
        feature["video_track_time_range_list"] = [{"start_time_in_ms": 0, "end_time_in_ms": duration_ms}]
    return {
        "post_common_info": {"creation_id": creation_id(), "enter_post_page_from": 8, "post_type": 3},
        "feature_common_info_list": [{
            "geofencing_regions": [],
            "playlist_name": "",
            "playlist_id": "",
            "tcm_params": '{"commerce_toggle_info":{}}',
            "sound_exemption": 0,
            "anchors": [],
            "vedit_common_info": {"draft": "", "video_id": video_id},
            "privacy_setting_info": {"visibility_type": visibility, "allow_duet": None, "allow_stitch": None, "allow_comment": 1, "allow_content_reuse": 1, "allow_ai_remix": 2},
            "content_check_id": "",
        }],
        "single_post_req_list": [{"batch_index": 0, "video_id": video_id, "is_long_video": 0, "single_post_feature_info": feature}],
    }


def post_query(cookies: dict[str, str]) -> dict[str, str]:
    query = {"app_name": "tiktok_web", "channel": "tiktok_web", "device_platform": "web", "tz_name": "America/Vancouver", "aid": "1988"}
    if cookies.get("msToken"):
        query["msToken"] = cookies["msToken"]
    return query


async def post(spec: dict[str, Any], cookies: dict[str, str]) -> dict[str, Any]:
    path = Path(str(spec.get("video") or ""))
    caption = str(spec.get("caption") or "")
    if not path.is_file():
        return {"ok": False, "code": "videoMissing", "detail": f"no such video file {path}"}
    visibility = {"everyone": 0, "friends": 2, "onlyMe": 1}.get(str(spec.get("visibility") or "everyone"), 0)
    async with transport.new_session(cookies) as session:
        data, dead = await signed_in(session)
        if dead:
            return dead
        user = user_of(data)
        csrf = str(data.get("tt-csrf-token") or cookies.get("tt_csrf_token") or "")
        try:
            uploaded = await upload.upload_video(session, user["userId"], path)
        except upload.UploadRefused as e:
            return {"ok": False, "code": e.code, "detail": e.detail}
        vid = uploaded["vid"]
        body = post_body(vid, caption, uploaded.get("video_meta") or {}, visibility)
        api = "/tiktok/web/project/post/v1/"
        res = await session.post("https://www.tiktok.com" + api, params=post_query(cookies), headers=transport.headers(UPLOAD_PAGE, csrf=csrf, json_body=True), data=json.dumps(body, separators=(",", ":")))
        answer = answer_json(res)
        single = ((answer or {}).get("single_post_resp_list") or [{}])[0]
        if not answer or answer.get("status_code") != 0 or single.get("status_code") not in (0, None) or not single.get("item_id"):
            refused = tiktok_refused(api, res, answer)
            return {**refused, "uploadedVideoId": vid, "detail": refused["detail"] + f" (the video was uploaded as {vid} and not posted)"}
        item = str(single["item_id"])
        handle = user["uniqueId"] or spec.get("account")
        return {"ok": True, "itemId": item, "videoId": vid, "url": f"https://www.tiktok.com/@{handle}/video/{item}", "projectId": str(answer.get("project_id") or ""), "refreshedCookies": transport.refreshed(session, cookies)}


async def delete_post(spec: dict[str, Any], cookies: dict[str, str]) -> dict[str, Any]:
    item = str(spec.get("itemId") or "").strip()
    if not item.isdigit():
        return {"ok": False, "code": "itemIdInvalid", "detail": f"{item!r} is not a TikTok post id"}
    async with transport.new_session(cookies) as session:
        data, dead = await signed_in(session)
        if dead:
            return dead
        csrf = str(data.get("tt-csrf-token") or cookies.get("tt_csrf_token") or "")
        api = "/tiktok/post/edit/v1/"
        res = await session.post("https://www.tiktok.com" + api, params=transport.studio_query(cookies), headers=transport.headers(STUDIO, csrf=csrf, json_body=True), data=json.dumps({"aweme_id": item, "scene": 1, "delete": {"delete_type": 1}}, separators=(",", ":")))
        answer = answer_json(res)
        results = (((answer or {}).get("edit_result") or {}).get("edit_biz_result")) or []
        deleted = str(((answer or {}).get("edit_diff") or {}).get("aweme_id") or "") == item
        if not answer or answer.get("status_code") not in (0, None) or not deleted or any(r.get("status_code") not in (0, None) for r in results):
            return tiktok_refused(api, res, answer)
        return {"ok": True, "itemId": item, "deleted": True, "refreshedCookies": transport.refreshed(session, cookies)}


ACTIONS = {"ping": ping, "stats": stats, "post": post, "deletePost": delete_post}


if __name__ == "__main__":
    raise SystemExit(kit.main(ACTIONS, WRITES, LIBRARY))
