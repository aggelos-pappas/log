from curl_cffi.requests import Cookies, Session

try:
    from identity import browserIdentity as _identity
except ImportError:  # used outside log: keep the old pin
    _identity = None
IMPERSONATE = _identity.curl_target("linkedin") if _identity else "chrome150"
USER_AGENT = _identity.user_agent("linkedin") if _identity else None
COOKIE_DOMAIN = ".linkedin.com"

__all__ = ["COOKIE_DOMAIN", "Cookies", "IMPERSONATE", "new_session"]


def new_session(proxies=None):
    return Session(impersonate=IMPERSONATE, proxies=dict(proxies or {}) or None, headers=_identity.headers("linkedin") if _identity else None)
