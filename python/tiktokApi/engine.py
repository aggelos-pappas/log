from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from platformKit import engine as kit
from platformKit import media

PLATFORM = "tiktok"
LIBRARY = None
WRITES: tuple[str, ...] = ()


def message_of(message_id: str, at: str | None, sender: str | None, from_me: bool, text: str | None, attachments: list[dict[str, Any]]) -> dict[str, Any]:
    return {"id": message_id, "at": at, "from": sender, "fromMe": from_me, "text": media.text_with_audio(text, attachments), "attachments": [{k: v for k, v in a.items() if k != "url"} for a in attachments]}


async def ping(spec: dict[str, Any], cookies: dict[str, str]) -> dict[str, Any]:
    return kit.not_built(PLATFORM, "ping")


ACTIONS = {"ping": ping}


if __name__ == "__main__":
    raise SystemExit(kit.main(ACTIONS, WRITES, LIBRARY))
