from __future__ import annotations

import asyncio
import json
import sys
from typing import Any

PAGE = "<!doctype html><title>log</title>"


async def read_state(cdp_url: str, origins: list[str]) -> dict[str, Any]:
    from playwright.async_api import async_playwright

    async with async_playwright() as playwright:
        browser = await playwright.chromium.connect_over_cdp(cdp_url)
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        cookies = await context.cookies()
        page = await context.new_page()
        session = await context.new_cdp_session(page)
        await session.send("Network.enable")
        await session.send("Network.setBypassServiceWorker", {"bypass": True})

        async def answer(route: Any) -> None:
            if route.request.resource_type == "document":
                await route.fulfill(status=200, content_type="text/html", body=PAGE)
            else:
                await route.abort()

        await page.route("**/*", answer)
        found: list[dict[str, Any]] = []
        for origin in origins:
            await page.goto(origin.rstrip("/") + "/", wait_until="domcontentloaded")
            items = await page.evaluate("() => Object.keys(localStorage).map((name) => ({ name, value: localStorage.getItem(name) }))")
            if items:
                found.append({"origin": origin.rstrip("/"), "localStorage": items})
        await page.close()
    return {"cookies": cookies, "origins": found}


def main() -> int:
    request = json.loads(sys.stdin.read() or "{}")
    try:
        state = asyncio.run(read_state(str(request["cdpUrl"]), [str(o) for o in request.get("origins") or []]))
    except Exception as exc:
        print(json.dumps({"ok": False, "code": "cdpStateFailed", "detail": f"{type(exc).__name__}: {exc}"[:300]}))
        return 1
    print(json.dumps({"ok": True, **state}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
