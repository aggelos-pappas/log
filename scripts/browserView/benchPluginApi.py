import importlib.util
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("logPluginApi", root / "hermesPlugin" / "dashboard" / "plugin_api.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
app = FastAPI()
app.include_router(module.router, prefix="/api/plugins/log")
uvicorn.run(app, host="127.0.0.1", port=int(sys.argv[1]), log_level="warning")
