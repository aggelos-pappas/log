import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const pythonDir = join(import.meta.dir, "..", "..", "..", "python");

function py(code: string, env: Record<string, string> = {}): any {
  const script = `import sys, json, os\nsys.path.insert(0, ${JSON.stringify(pythonDir)})\n${code}`;
  const clean = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== "LOG_CAMOUFOX_SOURCE"));
  const run = spawnSync(process.env.LOG_PYTHON || "python", ["-c", script], { encoding: "utf8", env: { ...clean, LOG_SETTINGS: join(pythonDir, "no-such-settings.json"), ...env } });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout.trim().split("\n").pop() as string);
}

const SERVER = `import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
REL = [{"tag_name": "v159.0-beta.42", "released_at": "2026-11-18T10:00:00Z", "upcoming_release": False, "assets": {"links": [{"id": 1, "name": "camoufox-159.0-beta.42-win.x86_64.zip", "url": "https://gl.example/a.zip", "direct_asset_url": "https://gl.example/a.zip"}, {"id": 2, "name": "camoufox-159.0-beta.42-lin.x86_64.zip", "url": "https://gl.example/b.zip"}], "sources": []}}]
seen = []
class H(BaseHTTPRequestHandler):
    def do_GET(self):
        seen.append(self.path)
        body = json.dumps(REL).encode()
        self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(body)
    def log_message(self, *a): pass
srv = HTTPServer(("127.0.0.1", 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
os.environ["LOG_CAMOUFOX_SOURCE"] = f"http://127.0.0.1:{srv.server_port}/daijro/camoufox"
`;

describe("camoufox releases from a GitLab mirror (daijro/camoufox was taken down on GitHub, 19 Nov 2026)", () => {
  test("nothing set: camoufox keeps its own GitHub sources", () => {
    expect(py(`from browser import camoufoxSource as s\nprint(json.dumps([s.source({}), s.install({})]))`)).toEqual([null, null]);
  });

  test("a GitLab project URL becomes its releases API; anything else is refused", () => {
    const out = py(`from browser import camoufoxSource as s
ok = s.gitlab_api(s.source({"LOG_CAMOUFOX_SOURCE": "https://git.daijro.dev/daijro/camoufox.git"}))
bad = []
for v in ("ftp://x/y", "not a url", "http://example.com/a/b"):
    try:
        s.source({"LOG_CAMOUFOX_SOURCE": v}); bad.append("allowed")
    except ValueError:
        bad.append("refused")
print(json.dumps([ok, bad]))`);
    expect(out[0]).toBe("https://git.daijro.dev/api/v4/projects/daijro%2Fcamoufox/releases?per_page=100");
    expect(out[1]).toEqual(["refused", "refused", "refused"]);
  });

  test("a GitLab release reads as the GitHub release camoufox expects", () => {
    const out = py(`from browser import camoufoxSource as s
g = s.as_github_release({"tag_name": "v159.0-beta.42", "released_at": "2026-11-18T10:00:00Z", "assets": {"links": [{"id": 7, "name": "camoufox-159.0-beta.42-win.x86_64.zip", "url": "https://gl/x", "direct_asset_url": "https://gl/direct"}, {"id": 8, "name": "", "url": "https://gl/y"}]}})
p = s.as_github_release({"tag_name": "v160.0-alpha.1", "assets": {"links": []}})
print(json.dumps([g, p["prerelease"]]))`);
    expect(out[0]).toMatchObject({ tag_name: "v159.0-beta.42", prerelease: false, assets: [{ id: 7, name: "camoufox-159.0-beta.42-win.x86_64.zip", browser_download_url: "https://gl/direct", created_at: "2026-11-18T10:00:00Z" }] });
    expect(out[0].assets.length).toBe(1);
    expect(out[1]).toBe(true);
  });

  test("camoufox's own version list finds the GitLab releases, and other URLs still go out untouched", () => {
    const out = py(`${SERVER}
from browser import camoufoxSource as s
s.install()
from camoufox import pkgman
from camoufox.pkgman import RepoConfig, list_available_versions
vs = list_available_versions(RepoConfig.find_by_name("Official"), include_prerelease=True, spoof_os="win", spoof_arch="x86_64")
print(json.dumps([seen, [(v.version.full_string, v.url) for v in vs], pkgman.requests.get is not None, hasattr(pkgman.requests, "Session")]))`);
    expect(out[0]).toEqual(["/api/v4/projects/daijro%2Fcamoufox/releases?per_page=100"]);
    expect(out[1]).toEqual([["159.0-beta.42", "https://gl.example/a.zip"]]);
    expect(out[3]).toBe(true);
  });

  test("every launch goes through the source", () => {
    const { readFileSync } = require("node:fs");
    expect(readFileSync(join(pythonDir, "browser", "visibleBrowser.py"), "utf8")).toContain("camoufoxSource.install()");
  });
});

describe("a GeoIP download that fails never stops a launch", () => {
  test("the gate keeps the database already on this machine and marks it checked", () => {
    const out = py(`import tempfile, time
from pathlib import Path
from camoufox import geolocation
from browser import proxyGate
db = Path(tempfile.mkdtemp()) / "db.mmdb"; db.write_bytes(b"x"); os.utime(db, (0, 0))
calls = []
class Geo:
    class locale: region = "ie"
    timezone = "Europe/Dublin"; latitude = 53.3; longitude = -6.2
def fake(ip):
    calls.append(ip)
    if len(calls) == 1:
        raise Exception("404 Client Error: Not Found for url: https://github.com/daijro/geoip-all-in-one/...")
    return Geo
geolocation.get_geolocation = fake
geolocation.get_mmdb_path = lambda v, c: db
geolocation.load_geoip_config = lambda: {}
lines = []
proxyGate.log = lines.append
out = proxyGate.locate_ip("203.0.113.9")
print(json.dumps([out, len(calls), db.stat().st_mtime > time.time() - 60, "keeping the database" in lines[0]]))`);
    expect(out[0]).toEqual({ country: "IE", timezone: "Europe/Dublin", latitude: 53.3, longitude: -6.2 });
    expect(out.slice(1)).toEqual([2, true, true]);
  });

  test("no database at all, or an IP the database doesn't know, still fails loudly", () => {
    const out = py(`import tempfile
from pathlib import Path
from camoufox import geolocation
from camoufox.exceptions import UnknownIPLocation
from browser import proxyGate
proxyGate.log = lambda l: None
geolocation.load_geoip_config = lambda: {}
res = []
geolocation.get_mmdb_path = lambda v, c: Path(tempfile.mkdtemp()) / "missing.mmdb"
def boom(ip): raise Exception("404")
geolocation.get_geolocation = boom
try:
    proxyGate.locate_ip("203.0.113.9"); res.append("ok")
except Exception:
    res.append("raised")
def unknown(ip): raise UnknownIPLocation("not found")
geolocation.get_geolocation = unknown
try:
    proxyGate.locate_ip("203.0.113.9"); res.append("ok")
except UnknownIPLocation:
    res.append("unknown")
print(json.dumps(res))`);
    expect(out).toEqual(["raised", "unknown"]);
  });
});
