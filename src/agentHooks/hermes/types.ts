export const HERMES_PLUGIN_FILES = ["plugin.yaml", "__init__.py", "dashboard/manifest.json", "dashboard/plugin_api.py", "dashboard/dist/index.js", "dashboard/dist/style.css", "desktop/plugin.js"] as const;

export const HERMES_DESKTOP_SOURCE = "desktop/plugin.js";

export const HERMES_ROUTES_FILE = "dashboard/plugin_api.py";

export const HERMES_DESKTOP_DIR = ["desktop", "plugins"].join("-");

export const RETIRED_HERMES_PLUGIN = "logHooks";

export const RETIRED_HERMES_MANIFESTS = ["plugin.json", "mcp.json"] as const;
