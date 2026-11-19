import json
import os
import re
import shutil
import subprocess
import threading
from pathlib import Path

HOOK_TIMEOUT_SECONDS = 20
EVENT_SCRIPT = ("scripts", "hooks", "event.ts")
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


def pre_llm_call(session_id="", user_message="", conversation_history=None, is_first_turn=False, **kwargs):
    events = (["SessionStart"] if is_first_turn else []) + ["UserPromptSubmit"]
    payload = {"session_id": session_id or "", "prompt": user_message or "", "source": "startup"}
    texts = [ask_log(event, payload) for event in events]
    text = "\n\n".join(t for t in texts if t)
    return {"context": text} if text else None


def tool_calls_this_turn(conversation_history):
    count = 0
    for message in reversed(conversation_history or []):
        if not isinstance(message, dict):
            continue
        if message.get("role") == "user":
            break
        if message.get("role") == "assistant":
            count += len(message.get("tool_calls") or [])
    return count


def post_llm_call(session_id="", conversation_history=None, **kwargs):
    payload = {"session_id": session_id or "", "tool_calls": tool_calls_this_turn(conversation_history)}
    threading.Thread(target=ask_log, args=("Stop", payload), daemon=True).start()


SCRIPT_TOOLS = re.compile(r"(^|_)(execute_code|terminal)$")
SPILL_PATH = re.compile(r"[A-Za-z]:[\/][^\s'\"]*spillover[\/][\w.-]+|/[^\s'\"]*spillover/[\w.-]+")
LOG_PIPE = re.compile(r"(?:^|[;&|(\s])log\s+([a-z][a-zA-Z]*)\s+([a-z][a-zA-Z]*)?[^\n|]*\|\s*(?:grep|rg|findstr|python\d?|py|jq|awk|sed|Select-String|ConvertFrom-Json)\b")
LOG_ARGV = re.compile(r"\[\s*['\"]log['\"]\s*,\s*['\"]([a-z][a-zA-Z]*)['\"](?:\s*,\s*['\"]([a-z][a-zA-Z]*)['\"])?")
LOG_RESULT_HEAD = "Browsers:"
NARROWING = {
    "discordChats": "--kind dm,group, --name <text>",
    "inboxWaiting": "--tail <n>, --platform <p>, --limit <n>",
}


def tool_of(words):
    first, second = (words + ("",))[:2]
    return first + second[:1].upper() + second[1:] if second else first


def spilled_log_result(text):
    for path in SPILL_PATH.findall(text):
        try:
            with open(path, encoding="utf-8", errors="replace") as handle:
                if handle.read(len(LOG_RESULT_HEAD)) == LOG_RESULT_HEAD:
                    return True
        except OSError:
            continue
    return False


def parsed_log_tool(text):
    for pattern in (LOG_PIPE, LOG_ARGV):
        found = pattern.search(text)
        if found and (pattern is LOG_PIPE or re.search(r"json\.loads?|re\.(search|findall)|\bgrep\b|split\(", text)):
            return tool_of(tuple(g for g in found.groups() if g))
    return "a log tool" if spilled_log_result(text) else ""


def script_refusal(tool_name, args):
    if not SCRIPT_TOOLS.search(tool_name or "") or not isinstance(args, dict):
        return ""
    text = re.sub(r"\bgit\s+log\b", "git", "\n".join(str(args.get(key) or "") for key in ("code", "command")))
    tool = parsed_log_tool(text) if text.strip() else ""
    if not tool:
        return ""
    flags = NARROWING.get(tool, "the narrowing flags in its schema")
    return f"log has a flag for this: {tool} {flags}; don't parse log output with scripts. Call the log tool again with those flags (a log result over 40 KB comes back as a head that names them)."


def pre_tool_call(tool_name="", args=None, **kwargs):
    message = script_refusal(tool_name, args)
    return {"action": "block", "message": message} if message else None


def register(ctx):
    ctx.register_hook("pre_llm_call", pre_llm_call)
    ctx.register_hook("pre_tool_call", pre_tool_call)
    ctx.register_hook("post_llm_call", post_llm_call)
