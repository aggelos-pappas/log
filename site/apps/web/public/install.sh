#!/bin/sh
set -eu

say() { printf '[1mlog:[0m %s
' "$1"; }
fail() { printf '[31mlog:[0m %s
' "$1" >&2; exit 1; }

SKILLS="${LOG_SKILLS:-}"
SKILLS_ONLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --skills) SKILLS="${2:-}"; [ $# -gt 1 ] && shift; shift ;;
    --skills=*) SKILLS="${1#--skills=}"; shift ;;
    --skillsOnly) SKILLS_ONLY=1; shift ;;
    *) shift ;;
  esac
done
LOG_SITE="${LOG_SITE:-https://log.listeningkit.com}"

skill_dirs() {
  for pair in ".claude:.claude/skills" ".codex:.codex/skills" ".cursor:.cursor/skills" ".gemini:.gemini/skills"     ".copilot:.copilot/skills" ".config/opencode:.config/opencode/skills" ".codeium/windsurf:.codeium/windsurf/skills"     ".roo:.roo/skills" ".continue:.continue/skills" ".qwen:.qwen/skills" ".config/goose:.config/goose/skills"; do
    [ -d "$HOME/${pair%%:*}" ] && printf '%s
' "$HOME/${pair#*:}"
  done
  printf '%s
' "$HOME/.agents/skills"
}

install_one() {
  site="$1"; name="$2"
  case "$name" in *[!a-z0-9-]*|"") fail "not a skill name: $name" ;; esac
  body=$(curl -fsSL "$site/.well-known/skills/$name/SKILL.md") || fail "couldn't fetch the $name skill from $site"
  printf '%s
' "$body" | head -n 1 | grep -q '^---' || fail "$site sent something that isn't a skill for $name"
  skill_dirs | while IFS= read -r dir; do
    mkdir -p "$dir/$name"
    printf '%s
' "$body" > "$dir/$name/SKILL.md"
  done
  say "installed the $name skill (from $site)"
  printf '%s
' "$body" | sed -n 's/^ *dependsOn: *//p' | head -n 1 | tr ' ' '
' | while IFS= read -r dep; do
    [ -n "$dep" ] || continue
    dep_host="${dep%/*}"; dep_name="${dep##*/}"
    install_one "https://$dep_host" "$dep_name"
  done
}

install_skills() {
  [ -n "$SKILLS" ] || return 0
  if [ "$SKILLS" = "all" ]; then
    SKILLS=$(curl -fsSL "$LOG_SITE/.well-known/skills/index.json" | sed -n 's/^ *"name": *"\([a-z0-9-]*\)".*/\1/p' | tr '
' ',')
  fi
  for name in $(printf '%s' "$SKILLS" | tr ',' ' '); do install_one "$LOG_SITE" "$name"; done
  say "skills are in $(skill_dirs | tr '
' ' ')"
  say "start a new agent session so it loads them"
}

if [ "$SKILLS_ONLY" = 1 ]; then
  [ -n "$SKILLS" ] || fail "--skillsOnly needs --skills <names> (or --skills all)"
  install_skills
  exit 0
fi

LOG_HOME="${LOG_HOME:-$HOME/.logCli}"
PACKAGE="${LOG_PACKAGE:-@listeningkit/log}"
LOG_REPO="${LOG_REPO:-matthewdonsemail-lab/log}"
mkdir -p "$LOG_HOME"

TRACK="${LOG_TRACK:-stable}"
case "$TRACK" in stable|nightly) ;; *) fail "LOG_TRACK is stable or nightly, not $TRACK" ;; esac

release_version() {
  if [ -n "${LOG_VERSION:-}" ]; then printf '%s' "${LOG_VERSION#v}"; return 0; fi
  if [ "$TRACK" = nightly ]; then
    next=$(curl -fsSL "https://registry.npmjs.org/$PACKAGE/next" 2>/dev/null | grep -o '"version": *"[^"]*"' | head -n 1 | cut -d '"' -f 4)
    if [ -n "$next" ]; then printf '%s' "$next"; return 0; fi
  fi
  tag=$(curl -fsSL "https://api.github.com/repos/$LOG_REPO/releases/latest" 2>/dev/null | grep -o '"tag_name": *"[^"]*"' | head -n 1 | cut -d '"' -f 4 | sed 's/^v//')
  if [ -n "$tag" ]; then printf '%s' "$tag"; return 0; fi
  curl -fsSL "https://registry.npmjs.org/$PACKAGE/latest" 2>/dev/null | grep -o '"version": *"[^"]*"' | head -n 1 | cut -d '"' -f 4
}

if ! command -v bun >/dev/null 2>&1; then
  say "installing Bun"
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
command -v bun >/dev/null 2>&1 || fail "Bun didn't install. Install it from https://bun.sh and run this again."

VERSION=$(release_version || true)
if [ -n "$VERSION" ]; then
  SPEC="$PACKAGE@$VERSION"
  if [ -n "${LOG_VERSION:-}" ]; then say "installing $PACKAGE $VERSION (pinned by LOG_VERSION)"; else say "installing $PACKAGE $VERSION, the newest $TRACK release"; fi
else
  SPEC="$PACKAGE"
  say "no release answered on GitHub or npm; installing $PACKAGE as npm has it"
fi
bun add -g "${LOG_PACKAGE_SOURCE:-$SPEC}"
GLOBAL_DIR=$(bun pm ls -g 2>/dev/null | head -n 1 | sed 's/ node_modules .*$//')
ROOT="$GLOBAL_DIR/node_modules/$PACKAGE"
[ -f "$ROOT/package.json" ] || ROOT="${BUN_INSTALL:-$HOME/.bun}/install/global/node_modules/$PACKAGE"
[ -f "$ROOT/package.json" ] || fail "couldn't find $PACKAGE in Bun's global folder ($GLOBAL_DIR)"
INSTALLED=$(grep -o '"version": *"[^"]*"' "$ROOT/package.json" | head -n 1 | cut -d '"' -f 4)
if [ -n "${LOG_VERSION:-}" ] && [ -z "${LOG_PACKAGE_SOURCE:-}" ] && [ "$INSTALLED" != "${LOG_VERSION#v}" ]; then fail "asked for $PACKAGE ${LOG_VERSION#v} but Bun installed $INSTALLED"; fi

if ! command -v uv >/dev/null 2>&1; then
  say "installing uv (it installs and manages Python)"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
fi
command -v uv >/dev/null 2>&1 || fail "uv didn't install. Install it from https://docs.astral.sh/uv and run this again."

say "setting up Python 3.12 for the engines in $LOG_HOME/python"
uv python install 3.12
[ -d "$LOG_HOME/python" ] || uv venv --python 3.12 "$LOG_HOME/python"
PYTHON="$LOG_HOME/python/bin/python"
[ -x "$PYTHON" ] || PYTHON="$LOG_HOME/python/Scripts/python.exe"

ENV_FILE="$LOG_HOME/.env"
touch "$ENV_FILE"
grep -q '^LOG_PYTHON=' "$ENV_FILE" || printf 'LOG_PYTHON=%s\n' "$PYTHON" >> "$ENV_FILE"

say "running the after-install steps log update runs too: the Python engines, database migrations, skills, harness plugins and the pinned local models"
LOG_PYTHON="$PYTHON" bun "$ROOT/scripts/update/postInstall.ts" || say "some after-install steps need a look (above); run bun $ROOT/scripts/update/postInstall.ts again any time"
if [ -n "${LOG_TRACK:-}" ]; then LOG_HOME="$LOG_HOME" bun "$ROOT/scripts/update/track.ts" "$TRACK" || say "couldn't save the track; run log update --track $TRACK"; fi

say "done. Your settings are in $ENV_FILE and your accounts will live in $LOG_HOME."
log --help >/dev/null 2>&1 && say "log is on your PATH" || say "open a new terminal so 'log' is on your PATH"
install_skills

LOG_BIN=$(command -v log 2>/dev/null || printf '%s' "${BUN_INSTALL:-$HOME/.bun}/bin/log")
if [ "${LOG_SETUP:-1}" != 0 ] && [ -x "$LOG_BIN" ] && [ -r /dev/tty ] && [ -w /dev/tty ]; then
  say "setting log up: pick your platforms, sign them in, and add extensions"
  "$LOG_BIN" launch --setup </dev/tty >/dev/tty 2>&1 || say "setup stopped. Run log launch --setup any time to finish it"
else
  say "next: run log launch --setup to pick your platforms, sign them in and add extensions"
fi
say "installed log $INSTALLED"
