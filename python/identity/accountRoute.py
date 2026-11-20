from __future__ import annotations

import ipaddress
import re
import socket
from typing import Any, Mapping
from urllib.parse import quote, unquote, urlsplit

REQUIRED = frozenset({"facebook"})
SCHEMES = {"http": "http", "https": "https", "socks5": "socks5h", "socks5h": "socks5h", "socks4": "socks4a", "socks4a": "socks4a"}
COLON_FORM = re.compile(r"^([^\s:/@]+):(\d{1,5}):([^:\s]+):(\S+)$")
LOOPBACK_NAMES = frozenset({"", "localhost", "localhost.localdomain"})

_state: dict[str, Any] = {"armed": False, "platform": None, "proxy": None, "proxyHost": None}
_patched: dict[str, bool] = {}


class RouteError(Exception):

    def __init__(self, code: str, detail: str) -> None:
        super().__init__(f"{code}: {detail}")
        self.code = code
        self.detail = detail


class RouteRefused(OSError):

    def __init__(self, detail: str) -> None:
        super().__init__(f"routeBypass: {detail}")
        self.code = "routeBypass"
        self.detail = detail


def normalize(raw: Any) -> str | None:
    text = str(raw or "").strip()
    if not text:
        return None
    colon = COLON_FORM.match(text)
    if colon and "://" not in text:
        host, port, user, password = colon.groups()
        return f"http://{quote(user, safe='')}:{quote(password, safe='')}@{host}:{port}"
    parts = urlsplit(text if "://" in text else f"http://{text}")
    scheme = SCHEMES.get(parts.scheme.lower())
    try:
        port = parts.port
    except ValueError:
        port = None
    if not scheme or not parts.hostname or not port:
        raise RouteError("proxyMalformed", "the account's proxy must be scheme://user:pass@host:port")
    auth = ""
    if parts.username:
        auth = quote(unquote(parts.username), safe="")
        if parts.password:
            auth += ":" + quote(unquote(parts.password), safe="")
        auth += "@"
    return f"{scheme}://{auth}{parts.hostname}:{port}"


def _proxy_of(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, Mapping):
        found = {normalize(v) for v in value.values() if v}
        if len(found) > 1:
            raise RouteError("routeBypass", "a client asked for more than one proxy")
        return next(iter(found), None)
    return normalize(value)


def arm(platform: str | None, spec: Mapping[str, Any]) -> dict[str, Any]:
    route = spec.get("route")
    if not isinstance(route, Mapping):
        raise RouteError("routeMissing", f"the {platform or 'platform'} call came without the account's route: every engine spec is built through engineRoute (rule 12)")
    proxy = normalize(route.get("proxy"))
    if proxy is None and str(platform or "") in REQUIRED:
        raise RouteError("noProxy", f"a {platform} account never calls out without its proxy (rule 12)")
    _state.update({"armed": True, "platform": platform, "proxy": proxy, "proxyHost": urlsplit(proxy).hostname if proxy else None})
    install()
    return {"platform": platform, "proxy": proxy}


def disarm() -> None:
    _state.update({"armed": False, "platform": None, "proxy": None, "proxyHost": None})


def armed() -> bool:
    return bool(_state["armed"])


def proxy() -> str | None:
    return _state["proxy"]


def proxies() -> dict[str, str] | None:
    return {"http": _state["proxy"], "https": _state["proxy"]} if _state["proxy"] else None


def enforce(session_proxies: Any, kwargs: dict[str, Any]) -> dict[str, Any]:
    if not _state["armed"]:
        return kwargs
    want = _state["proxy"]
    asked = [_proxy_of(kwargs.get("proxies")), _proxy_of(kwargs.get("proxy")), _proxy_of(session_proxies)]
    for got in asked:
        if got is not None and got != want:
            raise RouteError("routeBypass", f"a client asked for a proxy that isn't the account's ({_state['platform']})")
    out = {k: v for k, v in kwargs.items() if k not in ("proxies", "proxy")}
    out["proxies"] = {"all": want} if want else None
    return out


def _loopback(host: Any) -> bool:
    name = str(host or "").strip("[]").lower()
    if name in LOOPBACK_NAMES:
        return True
    try:
        return ipaddress.ip_address(name).is_loopback
    except ValueError:
        return False


def allowed_host(host: Any) -> bool:
    if not _state["armed"] or not _state["proxy"]:
        return True
    return _loopback(host) or str(host or "").lower() == str(_state["proxyHost"] or "").lower()


def _refuse_host(host: Any) -> None:
    if not allowed_host(host):
        raise RouteRefused(f"{host} would be reached from this machine, not through the account's proxy ({_state['platform']})")


def install() -> None:
    if _patched.get("socket"):
        _install_curl()
        return
    _patched["socket"] = True
    original_getaddrinfo = socket.getaddrinfo
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex

    def getaddrinfo(host: Any, *args: Any, **kwargs: Any) -> Any:
        _refuse_host(host.decode() if isinstance(host, bytes) else host)
        return original_getaddrinfo(host, *args, **kwargs)

    def target_of(address: Any) -> Any:
        return address[0] if isinstance(address, tuple) and address else None

    def connect(self: Any, address: Any) -> Any:
        if self.family in (socket.AF_INET, socket.AF_INET6) and _state["armed"] and _state["proxy"]:
            host = target_of(address)
            if not _loopback(host) and not _proxy_ip(host):
                raise RouteRefused(f"{host} would be reached from this machine, not through the account's proxy ({_state['platform']})")
        return original_connect(self, address)

    def connect_ex(self: Any, address: Any) -> Any:
        if self.family in (socket.AF_INET, socket.AF_INET6) and _state["armed"] and _state["proxy"]:
            host = target_of(address)
            if not _loopback(host) and not _proxy_ip(host):
                raise RouteRefused(f"{host} would be reached from this machine, not through the account's proxy ({_state['platform']})")
        return original_connect_ex(self, address)

    socket.getaddrinfo = getaddrinfo
    socket.socket.connect = connect
    socket.socket.connect_ex = connect_ex
    _install_curl()


def _proxy_ip(host: Any) -> bool:
    proxy_host = _state["proxyHost"]
    if not proxy_host or not host:
        return False
    if str(host).lower() == str(proxy_host).lower():
        return True
    cached = _state.get("proxyIps")
    if cached is None or _state.get("proxyIpsOf") != proxy_host:
        try:
            cached = {info[4][0] for info in socket.getaddrinfo(proxy_host, None)}
        except OSError:
            cached = set()
        _state["proxyIps"], _state["proxyIpsOf"] = cached, proxy_host
    return str(host) in cached


def _install_curl() -> None:
    if _patched.get("curl"):
        return
    try:
        from curl_cffi.requests import AsyncSession, Session
    except ImportError:
        return
    _patched["curl"] = True
    sync_request = Session.request
    async_request = AsyncSession.request
    sync_ws = getattr(Session, "ws_connect", None)
    async_ws = getattr(AsyncSession, "ws_connect", None)

    def request(self: Any, method: Any, url: Any, *args: Any, **kwargs: Any) -> Any:
        return sync_request(self, method, url, *args, **enforce(getattr(self, "proxies", None), kwargs))

    async def arequest(self: Any, method: Any, url: Any, *args: Any, **kwargs: Any) -> Any:
        return await async_request(self, method, url, *args, **enforce(getattr(self, "proxies", None), kwargs))

    Session.request = request
    AsyncSession.request = arequest
    if sync_ws is not None:
        def ws_connect(self: Any, url: Any, *args: Any, **kwargs: Any) -> Any:
            return sync_ws(self, url, *args, **enforce(getattr(self, "proxies", None), kwargs))

        Session.ws_connect = ws_connect
    if async_ws is not None:
        def aws_connect(self: Any, url: Any, *args: Any, **kwargs: Any) -> Any:
            return async_ws(self, url, *args, **enforce(getattr(self, "proxies", None), kwargs))

        AsyncSession.ws_connect = aws_connect


def session(platform: str | None) -> Any:
    from curl_cffi.requests import Session

    from identity import browserIdentity

    install()
    return Session(impersonate=browserIdentity.curl_target(platform), proxies=proxies())


def download(url: str, platform: str | None, timeout: int = 60, headers: Mapping[str, str] | None = None) -> bytes:
    from identity import browserIdentity

    with session(platform) as client:
        answer = client.get(url, headers={"User-Agent": browserIdentity.user_agent(platform), **dict(headers or {})}, timeout=timeout)
    if answer.status_code >= 400:
        raise RouteError("mediaDownloadFailed", f"{urlsplit(url).hostname} answered {answer.status_code}")
    return answer.content
