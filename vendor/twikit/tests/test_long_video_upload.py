import asyncio
import hashlib

from twikit.client.client import APPENDS_IN_FLIGHT, Client
from twikit.client.v11 import V11Client


class Recorder:
    def __init__(self):
        self.calls = []
        self.open = 0
        self.most_open = 0

    async def request(self, method, endpoint, **kwargs):
        self.open += 1
        self.most_open = max(self.most_open, self.open)
        await asyncio.sleep(0)
        self.open -= 1
        params = dict(kwargs.get("params") or {})
        self.calls.append((method, endpoint, params))
        if params.get("command") == "INIT":
            return {"media_id": "77"}, None
        if params.get("command") == "STATUS":
            return {"processing_info": {"state": "succeeded"}}, None
        return {}, None


class Recorded(Client):
    @property
    def _base_headers(self):
        return {"content-type": "application/json"}


def client_on(recorder):
    client = Recorded.__new__(Recorded)
    client.request = recorder.request
    client.v11 = V11Client(client)
    return client


def test_a_long_video_goes_up_the_way_x_com_sends_it():
    recorder = Recorder()
    data = bytes(range(256)) * (40 * 1024 * 1024 // 256 + 7)
    segment = 8 * 1024 * 1024
    media_id = asyncio.run(client_on(recorder).upload_media(data, wait_for_completion=True, media_type="video/mp4", media_category="amplify_video", is_long_video=True, video_duration_ms=180010))
    assert media_id == "77"
    init = recorder.calls[0]
    assert init[1].endswith("/i/media/upload2.json")
    assert init[2] == {"command": "INIT", "total_bytes": len(data), "media_type": "video/mp4", "video_duration_ms": 180010, "media_category": "amplify_video"}
    appends = [c for c in recorder.calls if c[2].get("command") == "APPENDMULTI"]
    assert len(appends) == -(-len(data) // segment)
    first = next(c for c in appends if c[2]["segment_indexes"] == 0)
    assert first[2]["max_segment_size"] == segment and first[2]["media_md5"] == hashlib.md5(data[:segment]).hexdigest()
    assert all(c[1].endswith("/i/media/upload2.json") for c in recorder.calls)
    assert [c[2]["command"] for c in recorder.calls[-2:]] == ["FINALIZE", "STATUS"]
    assert recorder.most_open <= APPENDS_IN_FLIGHT


def test_a_short_video_keeps_the_plain_append():
    recorder = Recorder()
    asyncio.run(client_on(recorder).upload_media(b"x" * 1000, media_type="video/mp4", media_category="tweet_video"))
    assert [c[2]["command"] for c in recorder.calls] == ["INIT", "APPEND", "FINALIZE"]
    assert "video_duration_ms" not in recorder.calls[0][2] and recorder.calls[0][1].endswith("/i/media/upload.json")
