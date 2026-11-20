import json
import os
import sys
import urllib.request

TIMEOUT_SECONDS = 4


def main():
    port = int(os.environ.get("LOG_JUDGE_PORT") or 47615)
    body = sys.stdin.buffer.read() or b"{}"
    request = urllib.request.Request(f"http://127.0.0.1:{port}/score", data=body, headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            sys.stdout.write(response.read().decode("utf-8"))
    except Exception as error:
        sys.stdout.write(json.dumps({"ok": False, "down": True, "error": str(error)}))


if __name__ == "__main__":
    main()
