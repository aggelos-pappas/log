import fastjson
from urllib.parse import urlencode
from . import signer
from scraper_utils import debug
from scraper_errors import BadRequest, Blocked, NotFound, UpstreamError


WWW = "https://www.tiktok.com"


USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


API_TIMEOUT = 30


LOGIN_WALL_STATUS = 2483


class TikTokUpstreamError(UpstreamError):
    """Transport failure, 5xx or an unexpected upstream status — retryable."""


class TikTokBlocked(TikTokUpstreamError, Blocked):
    """Silent empty body, 403 / 429 or a login wall — retryable on a new exit."""


class TikTokBadRequest(BadRequest):
    """Upstream rejected the params — never retried."""


class TikTokNotFound(NotFound):
    """The user / video / hashtag / sound ... does not exist — never retried."""


def dump_debug(name, text):
    """Write a raw response to $TIKTOK_DEBUG_DIR/<name>.txt."""
    debug.dump("TIKTOK_DEBUG_DIR", name, text)


def _base_params(client, region):
    """The web app's fixed query params, in the app's own order."""
    return {
        "WebIdLastTime": str(int(client.born)),
        "aid": "1988",
        "app_language": "en",
        "app_name": "tiktok_web",
        "browser_language": "en-US",
        "browser_name": "Mozilla",
        "browser_online": "true",
        "browser_platform": "MacIntel",
        "browser_version": USER_AGENT[8:],
        "channel": "tiktok_web",
        "cookie_enabled": "true",
        "data_collection_enabled": "false",
        "device_id": client.device_id,
        "device_platform": "web_pc",
        "focus_state": "true",
        "from_page": "user",
        "history_len": "3",
        "is_fullscreen": "false",
        "is_page_visible": "true",
        "language": "en",
        "os": "mac",
        "priority_region": "",
        "referer": "",
        "region": region,
        "screen_height": "1080",
        "screen_width": "1920",
        "tz_name": "America/New_York",
        "user_is_login": "false",
        "webcast_language": "en",
    }


def status_of(payload):
    """The upstream status code of a JSON answer (0 = ok). The web API
    spells it statusCode, status_code or code depending on the service."""
    for key in ("statusCode", "status_code", "code"):
        value = payload.get(key)
        if isinstance(value, int) and not isinstance(value, bool):
            return value
    return 0


def _api_once(client, path, params, *, signed, base, host, referer):
    query = _base_params(client, client.country.upper()) if base else {}
    query.update({key: str(value) for key, value in params.items() if value is not None})
    ms_token = client.session.cookies.get("msToken") or ""
    if signed:
        query_string, _ = signer.sign(list(query.items()), USER_AGENT, ms_token=ms_token)
    else:
        if ms_token and base:
            query["msToken"] = ms_token
        query_string = urlencode(query)
    try:
        resp = client.session.get(f"{host}{path}?{query_string}",
                                  headers={"accept": "*/*", "referer": referer or WWW + "/"}, timeout=API_TIMEOUT)
    except Exception as e:
        raise TikTokUpstreamError(f"request failed: {type(e).__name__}: {e}")
    status = resp.status_code
    text = resp.text or ""
    if status in (401, 403, 429):
        raise TikTokBlocked(f"HTTP {status} on {path}")
    if status >= 500:
        raise TikTokUpstreamError(f"HTTP {status} on {path}")
    if status == 400:
        raise TikTokBadRequest(f"tiktok rejected {path}")
    if not text.strip():
        raise TikTokBlocked(f"{path} answered with an empty body")
    try:
        payload = fastjson.loads(text)
    except ValueError:
        dump_debug("nonjson" + path.replace("/", "_"), text)
        raise TikTokBlocked(f"{path} returned a non-JSON body")
    if not isinstance(payload, dict):
        raise TikTokUpstreamError(f"{path} returned unexpected JSON")
    if status_of(payload) == LOGIN_WALL_STATUS:
        raise TikTokBlocked(f"{path} asked for a login")
    return payload
