from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote, urlsplit

GITHUB_RELEASES = re.compile(r"^https://api\.github\.com/repos/([^/]+/[^/]+)/releases/?(\?.*)?$")
PRERELEASE_TAG = re.compile(r"(alpha|rc|pre)", re.I)

_PATCHED: dict[str, Any] = {}


def settings_path() -> Path:
    named = os.environ.get("LOG_SETTINGS", "").strip()
    return Path(named) if named else Path.home() / ".logCli" / "settings.json"


def source(env: dict[str, str] | None = None) -> str | None:
    env = dict(os.environ) if env is None else env
    named = (env.get("LOG_CAMOUFOX_SOURCE") or "").strip()
    if not named:
        try:
            named = str(json.loads(settings_path().read_text(encoding="utf-8")).get("camoufoxSource") or "").strip()
        except (OSError, ValueError, AttributeError):
            named = ""
    if not named:
        return None
    if not re.fullmatch(r"(https://[^/\s]+|http://(127\.0\.0\.1|localhost)(:\d+)?)/[^\s]+", named):
        raise ValueError(f"LOG_CAMOUFOX_SOURCE must be a GitLab project URL like https://gitlab.example.com/daijro/camoufox, not {named!r}")
    return named.rstrip("/").removesuffix(".git")


def gitlab_api(project_url: str) -> str:
    parts = urlsplit(project_url)
    path = parts.path.strip("/")
    return f"{parts.scheme}://{parts.netloc}/api/v4/projects/{quote(path, safe='')}/releases?per_page=100"


def as_github_release(release: dict[str, Any]) -> dict[str, Any]:
    tag = str(release.get("tag_name") or release.get("name") or "")
    at = release.get("released_at") or release.get("created_at")
    links = ((release.get("assets") or {}).get("links")) or []
    assets = [
        {
            "id": link.get("id"),
            "name": link.get("name"),
            "browser_download_url": link.get("direct_asset_url") or link.get("url"),
            "size": None,
            "digest": "",
            "created_at": at,
            "updated_at": at,
        }
        for link in links
        if link.get("name") and (link.get("direct_asset_url") or link.get("url"))
    ]
    return {
        "tag_name": tag,
        "name": release.get("name") or tag,
        "prerelease": bool(release.get("upcoming_release")) or bool(PRERELEASE_TAG.search(tag)),
        "published_at": at,
        "assets": assets,
    }


class _Response:
    def __init__(self, payload: Any, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            import requests

            raise requests.HTTPError(f"{self.status_code} from the camoufox GitLab source")

    def json(self) -> Any:
        return self._payload


def releases_from(project_url: str, get: Callable[..., Any]) -> list[dict[str, Any]]:
    resp = get(gitlab_api(project_url), timeout=20)
    resp.raise_for_status()
    return [as_github_release(r) for r in resp.json()]


def install(env: dict[str, str] | None = None) -> str | None:
    project = source(env)
    if not project:
        return None
    from camoufox import pkgman

    if _PATCHED.get("project") == project:
        return project
    real = _PATCHED.get("real") or pkgman.requests

    class Requests:
        def __getattr__(self, name: str) -> Any:
            return getattr(real, name)

        def get(self, url: str, *args: Any, **kwargs: Any) -> Any:
            if GITHUB_RELEASES.match(str(url)):
                return _Response(releases_from(project, real.get))
            return real.get(url, *args, **kwargs)

    pkgman.requests = Requests()
    _PATCHED.update({"real": real, "project": project})
    return project


def main(argv: list[str]) -> int:
    project = install()
    if project:
        print(f"camoufox releases from {project}", file=sys.stderr)
    else:
        print("no LOG_CAMOUFOX_SOURCE set: camoufox uses its own GitHub sources", file=sys.stderr)
    from camoufox.__main__ import cli

    try:
        cli.main(args=argv or ["version"], prog_name="camoufox", standalone_mode=False)
    except SystemExit as exc:
        return int(exc.code or 0)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
