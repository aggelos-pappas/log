from __future__ import annotations

import os
from pathlib import Path


def log_home() -> Path:
    named = (os.environ.get("LOG_HOME") or "").strip()
    return Path(named) if named else Path.home() / ".logCli"
