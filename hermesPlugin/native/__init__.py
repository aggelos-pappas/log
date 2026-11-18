import json
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

HOOK_TIMEOUT_SECONDS = 20
EVENT_SCRIPT = ("scripts", "hooks", "event.ts")
PUSH_SCRIPT = ("scripts", "hooks", "push.ts")
PUSH_RETRY_SECONDS = 10
BUSY_LIMIT_SECONDS = 600
PACKAGE = ("@listeningkit", "log")


def has_event_script(root):
    try:
        return root.joinpath(*EVENT_SCRIPT).is_file()
    except OSError:
        return False


def named_root():
    named = os.environ.get("LOG_ROOT", "").strip()
    if named:
        return Path(named)
    meta = Path(__file__).with_name("plugin.yaml")
    if meta.exists():
        for line in meta.read_text(encoding="utf-8").splitlines():
            if line.startswith("log_root:"):
                return Path(line.split(":", 1)[1].strip().strip("'\""))
    return None


def bun_home():
    return Path(os.environ.get("BUN_INSTALL", "").strip() or Path.home() / ".bun")


def global_installs():
    home = Path.home()
    roots = [bun_home() / "install" / "global" / "node_modules"]
    appdata = os.environ.get("APPDATA", "").strip()
    if appdata:
        roots.append(Path(appdata) / "npm" / "node_modules")
    prefix = os.environ.get("NPM_CONFIG_PREFIX", "").strip()
    if prefix:
        roots += [Path(prefix) / "lib" / "node_modules", Path(prefix) / "node_modules"]
    roots += [home / ".npm-global" / "lib" / "node_modules", Path("/usr/local/lib/node_modules"), Path("/opt/homebrew/lib/node_modules"), Path("/usr/lib/node_modules")]
    return [root.joinpath(*PACKAGE) for root in roots]


def log_root():
    named = named_root()
    if named is not None:
        return named
    for candidate in global_installs():
        if has_event_script(candidate):
            return candidate.resolve()
    return Path(__file__).resolve().parents[2]


def bun_command():
    named = os.environ.get("LOG_BUN", "").strip()
    if named:
        return named
    found = shutil.which("bun")
    if found:
        return found
    for name in ("bun.exe", "bun"):
        candidate = bun_home() / "bin" / name
        if candidate.is_file():
            return str(candidate)
    return "bun"


def ask_log(event, payload):
    root = log_root()
    script = root.joinpath(*EVENT_SCRIPT)
    if not script.exists():
        return ""
    try:
        run = subprocess.run(
            [bun_command(), str(script), event, "--host", "hermes"],
            input=json.dumps({"hook_event_name": event, **payload}),
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=HOOK_TIMEOUT_SECONDS,
            cwd=str(root),
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    if run.returncode != 0 or not run.stdout.strip():
        return ""
    try:
        answer = json.loads(run.stdout)
    except ValueError:
        return ""
    context = answer.get("context") if isinstance(answer, dict) else None
    return context if isinstance(context, str) else ""


def reader_of(session_id):
    return re.sub(r"[^A-Za-z0-9_-]", "", session_id or "")[:80]


def push_state_path():
    return Path(os.environ.get("LOG_INBOX_STATE", "").strip() or Path.home() / ".logCli" / "inbox") / "hermesPush.json"


class Push:
    def __init__(self):
        self.ctx = None
        self.key = ""
        self.reader = ""
        self.proc = None
        self.lock = threading.Lock()
        self.busy_since = 0.0
        self.held = []

    def start_turn(self):
        with self.lock:
            self.busy_since = time.time()

    def busy(self):
        return self.busy_since and time.time() - self.busy_since < BUSY_LIMIT_SECONDS

    def take_held(self):
        with self.lock:
            held, self.held = self.held, []
        return "\n\n".join(held)

    def end_turn(self):
        with self.lock:
            self.busy_since = 0.0
        held = self.take_held()
        if held:
            self.deliver(held)

    def deliver(self, context):
        try:
            self.ctx.inject_message(context, role="user", session_key=self.key)
        except Exception:
            pass

    def arrived(self, context):
        with self.lock:
            if self.busy():
                self.held.append(context)
                return
        self.deliver(context)

    def remember(self, key, reader):
        try:
            path = push_state_path()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({"sessionKey": key, "reader": reader}), encoding="utf-8")
        except OSError:
            pass

    def recall(self):
        try:
            saved = json.loads(push_state_path().read_text(encoding="utf-8"))
            return str(saved.get("sessionKey") or ""), str(saved.get("reader") or "")
        except (OSError, ValueError):
            return "", ""

    def follow(self, key, reader):
        if not self.ctx or not key or not reader or not hasattr(self.ctx, "inject_message"):
            return
        with self.lock:
            if key == self.key and reader == self.reader and self.proc and self.proc.poll() is None:
                return
            self.key, self.reader = key, reader
            self.remember(key, reader)
            self.stop()
            threading.Thread(target=self.run, args=(key, reader), daemon=True).start()

    def stop(self):
        proc, self.proc = self.proc, None
        if proc and proc.poll() is None:
            try:
                proc.kill()
            except OSError:
                pass

    def run(self, key, reader):
        script = log_root().joinpath(*PUSH_SCRIPT)
        while self.key == key and self.reader == reader and script.exists():
            try:
                proc = subprocess.Popen(
                    [bun_command(), str(script), "--host", "hermes", "--reader", reader],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL,
                    text=True,
                    encoding="utf-8",
                    cwd=str(log_root()),
                    creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                )
            except OSError:
                time.sleep(PUSH_RETRY_SECONDS)
                continue
            with self.lock:
                if self.key != key or self.reader != reader:
                    proc.kill()
                    return
                self.proc = proc
            for line in proc.stdout:
                if self.key != key:
                    break
                try:
                    batch = json.loads(line)
                except ValueError:
                    continue
                context = batch.get("context") if isinstance(batch, dict) else None
                if isinstance(context, str) and context.strip():
                    self.arrived(context)
            if self.key == key:
                time.sleep(PUSH_RETRY_SECONDS)


PUSH = Push()


def bound_key():
    try:
        from gateway.session_context import bound_session_key
        return bound_session_key() or ""
    except Exception:
        return ""


def pre_llm_call(session_id="", user_message="", conversation_history=None, is_first_turn=False, **kwargs):
    PUSH.follow(bound_key(), reader_of(session_id))
    PUSH.start_turn()
    events = (["SessionStart"] if is_first_turn else []) + ["UserPromptSubmit"]
    payload = {"session_id": session_id or "", "prompt": user_message or "", "source": "startup"}
    texts = [ask_log(event, payload) for event in events] + [PUSH.take_held()]
    text = "\n\n".join(t for t in texts if t)
    return {"context": text} if text else None


LOG_TOOL = re.compile(r"^mcp__log__\w+$")
LIVE_MARK = "\n\n>>> LANDED WHILE THIS TOOL RAN (live, read before the next send; the draft may be stale):\n"


def log_tool_of(tool_name, args):
    if LOG_TOOL.match(tool_name or ""):
        return tool_name
    if tool_name in ("mcp__tool_call", "tool_call") and isinstance(args, dict):
        for call in args.get("calls") or []:
            name = call.get("name") if isinstance(call, dict) else ""
            if LOG_TOOL.match(name or ""):
                return name
    return ""


def transform_tool_result(tool_name="", args=None, result=None, session_id="", **kwargs):
    if not isinstance(result, str):
        return None
    subject = log_tool_of(tool_name, args)
    asked = ask_log("PostToolUse", {"session_id": session_id or "", "tool_name": subject}) if subject else ""
    landed = "\n\n".join(t for t in (PUSH.take_held(), asked) if t.strip())
    return result + LIVE_MARK + landed if landed else None


def post_llm_call(**kwargs):
    PUSH.end_turn()


def register(ctx):
    PUSH.ctx = ctx
    ctx.register_hook("pre_llm_call", pre_llm_call)
    ctx.register_hook("transform_tool_result", transform_tool_result)
    ctx.register_hook("post_llm_call", post_llm_call)
    key, reader = PUSH.recall()
    PUSH.follow(key, reader)
