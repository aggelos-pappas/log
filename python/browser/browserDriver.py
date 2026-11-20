from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterator

from browser import proxyGate
from browser.visibleBrowser import launch_kwargs

BROWSERS = ("camoufox", "adsPower", "brave")

BRAVE_PATH_ENV = "LOG_BRAVE_PATH"

BRAVE_INSTALL_PATHS: dict[str, tuple[str, ...]] = {
    "win32": ("%PROGRAMFILES%/BraveSoftware/Brave-Browser/Application/brave.exe", "%PROGRAMFILES(X86)%/BraveSoftware/Brave-Browser/Application/brave.exe", "%LOCALAPPDATA%/BraveSoftware/Brave-Browser/Application/brave.exe"),
    "darwin": ("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", "~/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
    "linux": ("/usr/bin/brave-browser", "/usr/bin/brave", "/opt/brave.com/brave/brave", "/snap/bin/brave"),
}

BRAVE_VIEWPORT = {"width": 1280, "height": 800}


@dataclass
class Opened:
    browser: Any
    context: Any
    driver: str


def driver_of(config: dict[str, Any]) -> tuple[str, str | None]:
    browser = config.get("browser") or {}
    driver = str(browser.get("driver") or "camoufox")
    if driver not in BROWSERS:
        raise proxyGate.GateError("browserDriverUnknown", f"unknown browser driver {driver!r}")
    return driver, browser.get("profileId")


@asynccontextmanager
async def open_camoufox(config: dict[str, Any], own_trajectory: bool) -> AsyncIterator[Opened]:
    from camoufox.async_api import AsyncCamoufox

    state = Path(config["storageStatePath"])
    async with AsyncCamoufox(**launch_kwargs({}, own_trajectory=own_trajectory)) as browser:
        context = await browser.new_context(**({"storage_state": str(state)} if state.is_file() else {}))
        yield Opened(browser, context, "camoufox")


@asynccontextmanager
async def open_ads_power(config: dict[str, Any], own_trajectory: bool) -> AsyncIterator[Opened]:
    from browser import adsPowerBrowser
    from browser.harRecorder import SessionHar
    from playwright.async_api import async_playwright

    _driver, profile_id = driver_of(config)
    if not profile_id:
        raise proxyGate.GateError("adsPowerProfileMissing", "the account has no AdsPower profile: run log adsPower sync --apply")
    gate = proxyGate.gate_attached()
    started = False
    try:
        if gate["proxy"].get("direct"):
            adsPowerBrowser.set_proxy(profile_id, adsPowerBrowser.NO_PROXY)
            proxyGate.log(f"AdsPower profile {profile_id}: no proxy ({gate['proxy'].get('platform')} runs direct); starting it headed")
        else:
            adsPowerBrowser.set_proxy(profile_id, adsPowerBrowser.user_proxy_config(gate["proxy"]))
            proxyGate.log(f"AdsPower profile {profile_id}: proxy set; starting it headed")
        cdp = adsPowerBrowser.start(profile_id)
        started = True
        proxyGate.log(f"AdsPower profile {profile_id} started; attaching over CDP")
        async with async_playwright() as playwright:
            browser = await playwright.chromium.connect_over_cdp(cdp)
            context = browser.contexts[0] if browser.contexts else await browser.new_context()
            har = SessionHar(proxyGate.har_path(str(proxyGate._armed["captureDir"])))
            har.attach(context)
            try:
                await proxyGate.check_attached(context)
                await carry_session_once(context, Path(config["storageStatePath"]), config.get("site"))
                yield Opened(browser, context, "adsPower")
            finally:
                written = await har.write()
                proxyGate.log(f"Session HAR: {written} request(s) to {har.path.name}")
    finally:
        if started:
            try:
                adsPowerBrowser.stop(profile_id)
                proxyGate.log(f"AdsPower profile {profile_id} stopped")
            except proxyGate.GateError as exc:
                proxyGate.log(f"AdsPower profile {profile_id}: stop answered {exc.code} ({exc.detail})")
        try:
            adsPowerBrowser.set_proxy(profile_id, adsPowerBrowser.NO_PROXY)
            proxyGate.log(f"AdsPower profile {profile_id}: proxy cleared")
        except proxyGate.GateError as exc:
            proxyGate.log(f"AdsPower profile {profile_id}: clearing the proxy answered {exc.code} ({exc.detail})")


def _expand(path: str, env: dict[str, str], home: str) -> str:
    import re

    if path.startswith("~/"):
        path = home + path[1:]
    return re.sub(r"%([A-Z0-9_()]+)%", lambda m: env.get(m.group(1), env.get(m.group(1).lower(), m.group(0))), path)


def brave_path_candidates(platform: str | None = None, env: dict[str, str] | None = None, home: str | None = None) -> list[str]:
    import os
    import re
    import sys

    env = dict(os.environ if env is None else env)
    own = str(env.get(BRAVE_PATH_ENV) or "").strip()
    if own:
        return [own]
    listed = BRAVE_INSTALL_PATHS.get(platform or sys.platform, ())
    expanded = [_expand(path, env, home or str(Path.home())) for path in listed]
    return [path for path in expanded if not re.search(r"%[A-Z0-9_()]+%", path)]


def brave_path(platform: str | None = None, env: dict[str, str] | None = None, home: str | None = None, exists: Any = None) -> str:
    candidates = brave_path_candidates(platform, env, home)
    found = next((path for path in candidates if (exists or (lambda p: Path(p).is_file()))(path)), None)
    if not found:
        raise proxyGate.GateError("braveNotFound", f"no Brave at {', '.join(candidates) or 'any known place'}: install Brave or set {BRAVE_PATH_ENV}")
    return found


def brave_profile_dir(config: dict[str, Any]) -> Path:
    from logHome import log_home

    account = str(config.get("accountId") or "").strip()
    if not account or any(ch in account for ch in "/\\:"):
        raise proxyGate.GateError("braveProfileMissing", "a Brave session needs the account's id for its own profile folder")
    folder = log_home() / "browsers" / "brave" / account
    folder.mkdir(parents=True, exist_ok=True)
    return folder


@asynccontextmanager
async def open_brave(config: dict[str, Any], own_trajectory: bool) -> AsyncIterator[Opened]:
    from browser import browserWindow
    from playwright.async_api import async_playwright

    executable = brave_path()
    profile = brave_profile_dir(config)
    options = proxyGate.chromium_launch(executable)
    options["args"] = [*options["args"], *browserWindow.chromium_args(browserWindow.window_mode(config))]
    proxyGate.log(f"Brave {executable}: opening the account's own profile headed")
    async with async_playwright() as playwright:
        context = await playwright.chromium.launch_persistent_context(str(profile), viewport=BRAVE_VIEWPORT, **options)
        try:
            await carry_session_once(context, Path(config["storageStatePath"]), config.get("site"))
            yield Opened(context.browser, context, "brave")
        finally:
            try:
                await context.close()
            except Exception:
                pass


async def carry_site_session_once(context: Any, state: Path, site: dict[str, Any]) -> None:
    import json

    domain = str(site.get("domain") or "").lstrip(".")
    if not domain or not state.is_file():
        return
    if await context.cookies(f"https://www.{domain}"):
        return
    try:
        cookies = json.loads(state.read_text(encoding="utf8")).get("cookies") or []
    except Exception:
        return
    own = [c for c in cookies if domain in str(c.get("domain", ""))]
    if own:
        await context.add_cookies(own)
        proxyGate.log(f"The profile had no {site.get('platform')} session: carried Twenty's cookies in once ({len(own)} cookies)")


async def carry_session_once(context: Any, state: Path, site: dict[str, Any] | None = None) -> None:
    import json

    if site and site.get("platform") not in (None, "facebook"):
        await carry_site_session_once(context, state, site)
        return
    have = {c["name"] for c in await context.cookies("https://www.facebook.com")}
    if "c_user" in have or not state.is_file():
        return
    try:
        cookies = json.loads(state.read_text(encoding="utf8")).get("cookies") or []
    except Exception:
        return
    facebook = [c for c in cookies if "facebook.com" in str(c.get("domain", ""))]
    if any(c.get("name") == "c_user" for c in facebook):
        await context.add_cookies(facebook)
        proxyGate.log(f"The profile had no Facebook login: carried Twenty's session in once ({len(facebook)} cookies)")


OPENERS = {"camoufox": open_camoufox, "adsPower": open_ads_power, "brave": open_brave}


@asynccontextmanager
async def open_browser(config: dict[str, Any], own_trajectory: bool = True) -> AsyncIterator[Opened]:
    from browser import browserWindow

    driver, _profile = driver_of(config)
    keeper = browserWindow.keep_hidden(browserWindow.window_mode(config), proxyGate.log)
    try:
        async with OPENERS[driver](config, own_trajectory) as opened:
            yield opened
    finally:
        if keeper is not None:
            keeper.stop()
