from __future__ import annotations

import hashlib
import hmac
import json
import random
import string
import zlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from tiktokApi import transport

TOP = "https://www.tiktok.com/top/v1"
UPLOAD_PAGE = "https://www.tiktok.com/tiktokstudio/upload"
REGION = "ap-singapore-1"
SERVICE = "vod"
VERSION = "2020-11-19"
SINGLE_MAX = 8 * 1024 * 1024
PART_SIZE = 5 * 1024 * 1024


class UploadRefused(Exception):
    def __init__(self, code: str, detail: str) -> None:
        super().__init__(detail)
        self.code = code
        self.detail = detail


def crc32_of(data: bytes) -> str:
    return format(zlib.crc32(data) & 0xFFFFFFFF, "08x")


def random_s() -> str:
    return "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(11))


def sign(key: bytes, text: str) -> bytes:
    return hmac.new(key, text.encode("utf-8"), hashlib.sha256).digest()


def canonical_query(query: dict[str, str]) -> str:
    return "&".join(f"{quote(k, safe='-_.~')}={quote(str(v), safe='-_.~')}" for k, v in sorted(query.items()))


def aws4_headers(method: str, query: dict[str, str], token: dict[str, str], body: bytes = b"", now: datetime | None = None) -> dict[str, str]:
    moment = now or datetime.now(timezone.utc)
    amz_date = moment.strftime("%Y%m%dT%H%M%SZ")
    day = moment.strftime("%Y%m%d")
    headers = {"x-amz-date": amz_date, "x-amz-security-token": token["SessionToken"]}
    if method == "POST":
        headers["x-amz-content-sha256"] = hashlib.sha256(body).hexdigest()
    names = sorted(headers)
    canonical = "\n".join([method, "/top/v1", canonical_query(query), "".join(f"{n}:{headers[n]}\n" for n in names), ";".join(names), hashlib.sha256(body).hexdigest()])
    scope = f"{day}/{REGION}/{SERVICE}/aws4_request"
    to_sign = "\n".join(["AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical.encode("utf-8")).hexdigest()])
    key = sign(sign(sign(sign(("AWS4" + token["SecretAccessKey"]).encode("utf-8"), day), REGION), SERVICE), "aws4_request")
    signature = hmac.new(key, to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    headers["authorization"] = f"AWS4-HMAC-SHA256 Credential={token['AccessKeyId']}/{scope}, SignedHeaders={';'.join(names)}, Signature={signature}"
    return headers


def answer_json(res: Any) -> dict[str, Any] | None:
    try:
        data = res.json()
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


async def sts_token(session: Any) -> dict[str, str]:
    res = await session.get("https://www.tiktok.com/api/v1/video/upload/auth/", params={"aid": "1988"}, headers=transport.headers(UPLOAD_PAGE))
    data = answer_json(res) or {}
    raw = data.get("video_token_v5") or {}
    if data.get("status_code") not in (0, None) or not raw.get("access_key_id"):
        raise UploadRefused("uploadAuthRefused", f"TikTok answered HTTP {res.status_code} to /api/v1/video/upload/auth/ with status {data.get('status_code')} {data.get('status_msg') or ''}".rstrip())
    return {"AccessKeyId": raw["access_key_id"], "SecretAccessKey": raw.get("secret_acess_key") or raw.get("secret_access_key"), "SessionToken": raw["session_token"]}


async def apply_upload(session: Any, token: dict[str, str], size: int) -> dict[str, Any]:
    query = {"Action": "ApplyUploadInner", "Version": VERSION, "SpaceName": "tiktok", "FileType": "video", "IsInner": "1", "FileSize": str(size), "s": random_s(), "device_platform": "web", "business_tag": "tiktok_video_submission_web"}
    headers = {**transport.headers(UPLOAD_PAGE), **aws4_headers("GET", query, token)}
    res = await session.get(TOP + "?" + canonical_query(query), headers=headers)
    data = answer_json(res) or {}
    error = (data.get("ResponseMetadata") or {}).get("Error")
    nodes = ((data.get("Result") or {}).get("InnerUploadAddress") or {}).get("UploadNodes") or []
    if error or not nodes or not nodes[0].get("StoreInfos"):
        raise UploadRefused("applyUploadRefused", f"TikTok's upload gateway answered HTTP {res.status_code} to ApplyUploadInner: {(error or {}).get('Code') or 'no upload node'} {(error or {}).get('Message') or ''}".rstrip())
    return nodes[0]


def upload_headers(store: dict[str, Any], node: dict[str, Any], user_id: str) -> dict[str, str]:
    extra = {str(k): str(v) for k, v in {**(node.get("UploadHeader") or {}), **(store.get("UploadHeader") or {})}.items()}
    return {"accept": "*/*", "authorization": store["Auth"], "x-storage-u": user_id, "origin": "https://www.tiktok.com", "referer": "https://www.tiktok.com/", "user-agent": transport.USER_AGENT, **extra}


def post_upload_param(node: dict[str, Any], token: dict[str, str]) -> dict[str, str]:
    return {"sts2_token": token["SessionToken"], "sts2_secret": token["SecretAccessKey"], "session_key": node["SessionKey"]}


def vid_of(data: dict[str, Any] | None) -> dict[str, Any] | None:
    results = (((data or {}).get("data") or {}).get("post_upload_resp") or {}).get("results") or []
    return results[0] if results and results[0].get("vid") else None


async def send_single(session: Any, node: dict[str, Any], store: dict[str, Any], token: dict[str, str], user_id: str, video: bytes) -> dict[str, Any]:
    from curl_cffi import CurlMime

    mime = CurlMime()
    mime.addpart(name="file", content_type="application/octet-stream", filename="blob", data=video)
    mime.addpart(name="post_upload_req", data=json.dumps(post_upload_param(node, token)).encode("utf-8"))
    headers = {**upload_headers(store, node, user_id), "content-crc32": crc32_of(video), "x-upload-with-postupload": "1"}
    res = await session.post(f"https://{node['UploadHost']}/upload/v1/{store['StoreUri']}", headers=headers, multipart=mime)
    data = answer_json(res)
    result = vid_of(data)
    if res.status_code != 200 or (data or {}).get("code") != 2000 or not result:
        raise UploadRefused("videoUploadRefused", f"TikTok's storage answered HTTP {res.status_code} code {(data or {}).get('code')} {(data or {}).get('message') or ''} to the video upload".rstrip())
    return result


async def send_parts(session: Any, node: dict[str, Any], store: dict[str, Any], token: dict[str, str], user_id: str, video: bytes) -> dict[str, Any]:
    base = f"https://{node['UploadHost']}/upload/v1/{store['StoreUri']}"
    headers = upload_headers(store, node, user_id)
    crcs: list[str] = []
    for number, start in enumerate(range(0, len(video), PART_SIZE), start=1):
        part = video[start:start + PART_SIZE]
        crc = crc32_of(part)
        res = await session.post(base, params={"uploadid": store["UploadID"], "part_number": str(number), "phase": "transfer"}, headers={**headers, "content-crc32": crc, "content-type": "application/octet-stream"}, data=part)
        data = answer_json(res)
        if res.status_code != 200 or (data or {}).get("code") != 2000:
            raise UploadRefused("videoUploadRefused", f"TikTok's storage answered HTTP {res.status_code} code {(data or {}).get('code')} to part {number}")
        crcs.append(f"{number}:{crc}")
    body = json.dumps({"parts_crc": ",".join(crcs), "post_upload_param": post_upload_param(node, token)})
    res = await session.post(base, params={"uploadmode": "part", "phase": "finish", "uploadid": store["UploadID"]}, headers={**headers, "content-type": "application/json", "x-upload-with-postupload": "1"}, data=body)
    data = answer_json(res)
    result = vid_of(data)
    if res.status_code != 200 or (data or {}).get("code") != 2000 or not result:
        raise UploadRefused("videoUploadRefused", f"TikTok's storage answered HTTP {res.status_code} code {(data or {}).get('code')} {(data or {}).get('message') or ''} to finishing the upload".rstrip())
    return result


async def upload_video(session: Any, user_id: str, path: Path) -> dict[str, Any]:
    video = path.read_bytes()
    token = await sts_token(session)
    node = await apply_upload(session, token, len(video))
    store = node["StoreInfos"][0]
    sender = send_single if len(video) <= SINGLE_MAX else send_parts
    return await sender(session, node, store, token, user_id, video)
