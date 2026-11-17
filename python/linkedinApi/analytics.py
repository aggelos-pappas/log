from __future__ import annotations

import re
import secrets
import base64
from typing import Any

from linkedinApi.share import ORIGIN, Composer, ShareRefused, fill, template

SLOW_METRICS = "com.linkedin.sdui.requests.creatoranalytics.spaSlowMetrics"
PAGE_KEY = "leia_post_summary"
TEXT = re.compile(r'"children":\["([^"$][^"]{0,119})"\]')
NUMBER = re.compile(r"^\d[\d,]*$")
SHORT_NUMBER = re.compile(r"^\d[\d.,]*[KM]$")
DURATION = re.compile(r"^(?=\d)(?:\d+h ?)?(?:\d+m ?)?(?:\d+s)?$")
BEFORE = {
    "Impressions": "impressions",
    "Members reached": "membersReached",
    "Video views": "videoViews",
    "Profile viewers from this post": "profileViewers",
    "Followers gained from this post": "followersGained",
    "Social engagements": "engagements",
}
AFTER = {"In-network (followers and connections)": "inNetwork", "Out-of-network": "outOfNetwork", "Watch time": "watchTime", "Average watch time": "averageWatchTime"}


def texts_of(answer: str) -> list[str]:
    return TEXT.findall(answer)


def value_of(text: str) -> Any:
    if NUMBER.match(text):
        return int(text.replace(",", ""))
    if SHORT_NUMBER.match(text) or DURATION.match(text):
        return text
    return None


def metrics_of(texts: list[str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for i, text in enumerate(texts):
        key = BEFORE.get(text)
        if key and key not in out and i > 0:
            value = value_of(texts[i - 1])
            if value is not None:
                out[key] = value
        key = AFTER.get(text)
        if key and key not in out and i + 1 < len(texts) and (texts[i + 1].endswith("%") or DURATION.match(texts[i + 1])):
            out[key] = texts[i + 1]
    return out


class Analytics(Composer):
    def __init__(self, session: Any, cookies: dict[str, str], browser: dict[str, str], log: Any = None, sleep: Any = None) -> None:
        super().__init__(session, cookies, browser, log=log, sleep=sleep)
        self.page_key = PAGE_KEY

    def one(self, activity_id: str) -> dict[str, Any]:
        values = {"activityId": activity_id, "trackingId": base64.b64encode(secrets.token_bytes(16)).decode()}
        self.referer = f"{ORIGIN}/analytics/post-summary/urn:li:activity:{activity_id}/"
        summary = self.action("postSummary", f"{ORIGIN}/flagship-web/analytics/post-summary/urn:li:activity:{activity_id}/", fill(template("postSummary"), values))
        self.pause(1.0, 2.5)
        slow = self.server_request(SLOW_METRICS, fill(template("postSlowMetrics"), values))
        return metrics_of(texts_of(summary) + texts_of(slow))

    def views(self, activity_ids: list[str]) -> dict[str, Any]:
        self.version_from_feed()
        out: dict[str, dict[str, Any]] = {}
        for activity_id in activity_ids:
            self.pause(2.0, 5.0)
            metrics = self.one(activity_id)
            self.log(f"linkedin analytics {activity_id}: {metrics.get('impressions', 'no')} impressions")
            out[activity_id] = metrics
        if out and not any("impressions" in m for m in out.values()):
            raise ShareRefused("templateStale", "LinkedIn's post analytics answers named no impressions for any post: its analytics page changed, record it again")
        return {"views": out}
