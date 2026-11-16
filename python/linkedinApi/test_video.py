import json
import struct
from types import SimpleNamespace

import pytest

from linkedinApi import share
from linkedinApi.share import Composer, ShareRefused, upload_parts, video_of


class Headers(dict):
    def get_list(self, name):
        return []


def answered(text, status=200):
    return SimpleNamespace(status_code=status, text=text, headers=Headers())


class FakeSession:
    def __init__(self, posts):
        self.posts = posts
        self.sent = []

    def get(self, url, **kwargs):
        self.sent.append(("GET", url, None))
        return answered('<html>"appVersion":"0.2.8598"</html>')

    def post(self, url, data=None, **kwargs):
        body = json.loads(data)
        self.sent.append(("POST", url, body))
        name = url.split("sduiid=")[-1].rsplit(".", 1)[-1]
        return answered(self.posts.get(name, lambda b: "")(body))

    def put(self, url, data=None, **kwargs):
        self.sent.append(("PUT", url, len(data)))
        part = url.rsplit("pn=", 1)[-1].split("&", 1)[0]
        res = answered("", 201)
        res.headers = Headers({"Location": f"/ambry-video/signedId/part{part}.bin", "X-Li-Uuid": "u"})
        return res


def mp4(path, seconds, pad=0):
    mvhd = b"\x00\x00\x00\x00" + struct.pack(">IIII", 0, 0, 1000, seconds * 1000) + b"\x00" * 80
    moov = struct.pack(">I", 8 + 8 + len(mvhd)) + b"moov" + struct.pack(">I", 8 + len(mvhd)) + b"mvhd" + mvhd
    ftyp = struct.pack(">I", 16) + b"ftypisom" + b"\x00" * 4
    free = struct.pack(">I", 8 + pad) + b"free" + b"\x00" * pad
    path.write_bytes(ftyp + free + moov)
    return path


PREFIX = "https://www.linkedin.com/dms-uploads/mp/v2/D00TEST/uploadedVideo/X-?sau=a&pn="
FINALIZE = "https://www.linkedin.com/dms-uploads/finalizemp/v2/D00TEST/uploadedVideo/X-?sync=0"


def register_answer(size):
    half = size // 2
    parts = [{"uploadUrlSuffix": f"{n}&sync=0", "byteRange": {"start": f"$n{a}", "end": f"$n{b}"}} for n, (a, b) in enumerate([(0, half - 1), (half, size - 1)], 1)]
    instr = json.dumps({"assetUrn": "D00TEST", "uploadUrlPrefix": "$1", "partUploadRequests": parts, "finalizeUrl": FINALIZE}, separators=(",", ":"))
    return f"1:T{len(PREFIX):x},{PREFIX}2:[]\n0:{instr}"


def test_a_video_is_read_from_its_own_header_and_refused_outside_linkedins_range(tmp_path):
    video = video_of(str(mp4(tmp_path / "clip.mp4", 30)))
    assert video["mimeType"] == "video/mp4" and video["videoDuration"] == "30000"
    with pytest.raises(ShareRefused) as short:
        video_of(str(mp4(tmp_path / "blip.mp4", 1)))
    assert short.value.code == "fileRefused"
    with pytest.raises(ShareRefused):
        video_of(str(tmp_path / "missing.mp4"))


def test_upload_parts_read_the_prefix_row_by_its_length():
    base, parts = upload_parts(register_answer(1000))
    assert base == PREFIX
    assert parts == [("1&sync=0", 0, 499), ("2&sync=0", 500, 999)]


def test_a_video_post_uploads_every_part_then_waits_for_linkedin_to_finish_processing(tmp_path):
    path = mp4(tmp_path / "film.mp4", 180, pad=4000)
    size = path.stat().st_size
    polls = []

    def poll(body):
        attempt = body["serverRequest"]["requestedArguments"]["payload"]["pollAttempt"]
        polls.append(attempt)
        if attempt < 3:
            return '0:{"states":[],"response":{"errors":[],"completionAction":{"actions":[{"value":{"state":{"value":{"stringValue":"Processing"}}}}]}}}'
        return '0:{"response":{"errors":[]},"x":{"activityUrn":{"activityId":"7400000000000000009"}}},"trackingId":"abc"}'

    posts = {
        "ShareCompose": lambda b: '0:{"x":"urn:li:shareboxSession:SESSION=="}',
        "registerMediaUpload": lambda b: register_answer(size),
        "CreatePost": lambda b: '0:{"response":{"errors":[]},"payload":{"ugcId":"7400000000000000001","pollAttempt":1}}',
        "PollShareObjectByUgcPost": poll,
    }
    session = FakeSession(posts)
    composer = Composer(session, {"li_at": "x", "JSESSIONID": '"ajax:1"'}, {"userAgent": "Mozilla/5.0 Chrome/150"}, sleep=lambda s: None)
    out = composer.post("our film", None, video_of(str(path)))
    assert out["activityId"] == "7400000000000000009" and out["video"] is True and out["assetId"] == "D00TEST"
    puts = [s for s in session.sent if s[0] == "PUT"]
    assert [p[1] for p in puts] == [PREFIX + "1&sync=0", PREFIX + "2&sync=0"] and sum(p[2] for p in puts) == size
    names = [s[1].split("sduiid=")[-1].rsplit(".", 1)[-1] for s in session.sent if s[0] == "POST"]
    order = ["DispatchPostCreateWithDetour", "StartBackgroundVideoUpload", "registerMediaUpload", "ReportControlArmVideoRegistered", "ReportCrossScreenVideoUploadCompleted", "CreatePost"]
    assert [n for n in names if n in order] == order
    assert polls == [1, 2, 3]
    at = {s[1]: i for i, s in enumerate(session.sent)}
    finish = next(s[2] for s in session.sent if s[1] == FINALIZE)
    assert [p["headers"]["location"] for p in finish["completeUploadRequest"]["partUploadResponses"]] == ["/ambry-video/signedId/part1.bin", "/ambry-video/signedId/part2.bin"]
    assert all(p["httpStatusCode"] == 201 for p in finish["completeUploadRequest"]["partUploadResponses"])
    created_at = next(i for i, s in enumerate(session.sent) if s[1].endswith("CreatePost"))
    assert at[PREFIX + "2&sync=0"] < at[FINALIZE] < created_at
    created = next(s[2] for s in session.sent if s[0] == "POST" and s[1].endswith("CreatePost"))
    text = json.dumps(created)
    assert "{{" not in text and "urn:li:shareboxSession:SESSION==" in text and "D00TEST" in text
    commentary = [s["value"] for s in created["states"] if s["key"] == "sharing-bg-compositionrichCommentary"]
    assert commentary == [{"text": "our film", "attribute": [], "$type": "TextModel", "source": "local"}]
    register = next(s[2] for s in session.sent if s[0] == "POST" and s[1].endswith("registerMediaUpload"))
    assert '"videoDuration": "180000"' in json.dumps(register) and f'"size": "{size}"' in json.dumps(register)


def test_a_video_that_never_finishes_processing_is_not_called_live(tmp_path, monkeypatch):
    monkeypatch.setattr(share, "VIDEO_POLL_ATTEMPTS", 2)
    path = mp4(tmp_path / "film.mp4", 10)
    size = path.stat().st_size
    posts = {
        "ShareCompose": lambda b: '0:{"x":"urn:li:shareboxSession:S=="}',
        "registerMediaUpload": lambda b: register_answer(size),
        "CreatePost": lambda b: '0:{"payload":{"ugcId":"7400000000000000001"}}',
        "PollShareObjectByUgcPost": lambda b: '0:{"stringValue":"Processing"}',
    }
    with pytest.raises(ShareRefused) as refused:
        Composer(FakeSession(posts), {"JSESSIONID": '"ajax:1"'}, {"userAgent": "Mozilla/5.0"}, sleep=lambda s: None).post("x", None, video_of(str(path)))
    assert refused.value.code == "postUnconfirmed"
