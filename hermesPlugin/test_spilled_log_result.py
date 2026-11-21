import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import hermesPlugin as plugin


def spill(body):
    folder = os.path.join(tempfile.mkdtemp(), "spillover")
    os.makedirs(folder)
    path = os.path.join(folder, "result.txt")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(body)
    return path.replace("\\", "/")


def test_a_result_with_an_open_browser_is_a_log_result():
    path = spill("Browsers: matthewsoldit on x.com (step 3).\n\nlog voice: ok\n\nexit 0")
    assert plugin.spilled_log_result(f"open('{path}')")


def test_a_result_with_no_browser_line_is_still_a_log_result():
    path = spill("log inbox waiting: 12 people\n\nstderr:\nreading\n\nexit 0\n\n>>> PLAY twitter/dmInbox")
    assert plugin.spilled_log_result(f"open('{path}')")


def test_a_failed_result_is_a_log_result():
    path = spill("voice: textMissing: --text is needed\n\nexit 1")
    assert plugin.spilled_log_result(f"open('{path}')")


def test_another_file_is_not_a_log_result():
    path = spill("some notes about an exit plan\nexit strategy 2")
    assert not plugin.spilled_log_result(f"open('{path}')")


def test_parsing_a_spilled_result_without_a_browser_line_is_refused():
    path = spill("log discord chats: 400 chats\n\nexit 0")
    assert plugin.parsed_log_tool(f"import json\nopen('{path}').read()") == "a log tool"
