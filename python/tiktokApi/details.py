import random
import re
import time
from pathlib import Path
import sys
from types import SimpleNamespace

vendor = Path(__file__).resolve().parents[2] / "vendor" / "tiktokScraper"
sys.path.insert(0, str(vendor))

from tiktok import fetch, parsers
from identity import accountRoute, browserIdentity


def extractDetails(spec, cookies):
    videoId = str(spec.get("videoId") or "")
    if not re.fullmatch(r"\d{15,25}", videoId):
        return {"ok": False, "code": "videoIdInvalid", "detail": "Use a canonical TikTok video or photo link", "status": 400}
    try:
        with accountRoute.session("tiktok") as session:
            identity = browserIdentity.resolve("tiktok")
            session.headers.update({**browserIdentity.headers("tiktok"), "accept-language": "en-US,en;q=0.9"})
            for name, value in cookies.items():
                session.cookies.set(name, value, domain=".tiktok.com", path="/")
            session.trust_env = False
            client = SimpleNamespace(user_agent=identity["userAgent"], browser_platform={"windows": "Win32", "macos": "MacIntel", "linux": "Linux x86_64"}[identity["os"]], os=identity["os"], session=session, country="us", born=time.time(), device_id=cookies.get("tt_webid_v2") or str(random.randint(7250000000000000000, 7351147085025500000)))
            payload = fetch._api_once(client, "/api/item/detail/", {"itemId": videoId}, signed=True, base=True, host=fetch.WWW, referer=fetch.WWW + "/")
            status = fetch.status_of(payload)
            if status in (10204, 10215, 10216):
                return {"ok": False, "code": "videoNotFound", "detail": f"Video {videoId} not found", "status": 404}
            if status != 0:
                return {"ok": False, "code": "upstreamRefused", "detail": f"TikTok detail status {status}", "event": "automated"}
            item = (payload.get("itemInfo") or {}).get("itemStruct")
            if not isinstance(item, dict) or str(item.get("id")) != videoId:
                return {"ok": False, "code": "videoDetailMissing", "detail": "TikTok returned no matching video detail"}
            return {"ok": True, "data": parsers.video(item)}
    except ImportError:
        return {"ok": False, "code": "scraperDependencyMissing", "detail": "Install vendor/tiktokScraper/requirements.txt into LOG_PYTHON"}
    except fetch.TikTokBlocked as error:
        match = re.search(r"HTTP (401|403|429)\b", str(error))
        status = int(match[1]) if match else None
        return {"ok": False, "code": "tiktokBlocked", "detail": str(error), "status": status, "event": "throttled" if status == 429 else "automated"}
    except fetch.TikTokBadRequest as error:
        return {"ok": False, "code": "videoRequestRejected", "detail": str(error), "status": 400}
    except fetch.TikTokUpstreamError:
        return {"ok": False, "code": "upstreamFailed", "detail": "TikTok detail request failed", "status": None}
