from __future__ import annotations

import os
import sys
import threading
from typing import Any, Callable

WINDOW_MODES = ("hidden", "visible")

WINDOW_ENV = "LOG_BROWSER_WINDOW"

OFFSCREEN_ARGS = ("--window-position=-32000,-32000", "--disable-backgrounding-occluded-windows", "--disable-features=CalculateNativeWinOcclusion")

FIRST_SECONDS = 15.0
FIRST_EVERY = 0.05
LATER_EVERY = 0.3


def window_mode(config: dict[str, Any]) -> str:
    mode = str(config.get("window") or "visible")
    return mode if mode in WINDOW_MODES else "visible"


def chromium_args(mode: str) -> list[str]:
    return list(OFFSCREEN_ARGS) if mode == "hidden" else []


def supported(platform: str | None = None) -> bool:
    return (platform or sys.platform) == "win32"


class Win32:
    def __init__(self) -> None:
        import ctypes
        from ctypes import wintypes

        self.ctypes = ctypes
        self.wintypes = wintypes
        self.user32 = ctypes.WinDLL("user32", use_last_error=True)
        self.kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        self.user32.EnumWindows.argtypes = [ctypes.c_void_p, wintypes.LPARAM]
        self.user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
        self.user32.GetWindow.argtypes = [wintypes.HWND, wintypes.UINT]
        self.user32.GetWindow.restype = wintypes.HWND
        self.user32.IsWindowVisible.argtypes = [wintypes.HWND]
        self.user32.ShowWindow.argtypes = [wintypes.HWND, ctypes.c_int]
        self.kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE

        class Entry(ctypes.Structure):
            _fields_ = [("dwSize", wintypes.DWORD), ("cntUsage", wintypes.DWORD), ("th32ProcessID", wintypes.DWORD), ("th32DefaultHeapID", ctypes.c_size_t), ("th32ModuleID", wintypes.DWORD), ("cntThreads", wintypes.DWORD), ("th32ParentProcessID", wintypes.DWORD), ("pcPriClassBase", ctypes.c_long), ("dwFlags", wintypes.DWORD), ("szExeFile", ctypes.c_wchar * 260)]

        self.Entry = Entry
        self.EnumProc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def parents(self) -> dict[int, int]:
        snap = self.kernel32.CreateToolhelp32Snapshot(0x2, 0)
        found: dict[int, int] = {}
        entry = self.Entry()
        entry.dwSize = self.ctypes.sizeof(entry)
        ok = self.kernel32.Process32FirstW(snap, self.ctypes.byref(entry))
        while ok:
            found[int(entry.th32ProcessID)] = int(entry.th32ParentProcessID)
            ok = self.kernel32.Process32NextW(snap, self.ctypes.byref(entry))
        self.kernel32.CloseHandle(snap)
        return found

    def shown_windows(self, pids: set[int]) -> list[int]:
        out: list[int] = []

        def each(hwnd: int, _lparam: int) -> bool:
            pid = self.wintypes.DWORD()
            self.user32.GetWindowThreadProcessId(hwnd, self.ctypes.byref(pid))
            if int(pid.value) in pids and not self.user32.GetWindow(hwnd, 4) and self.user32.IsWindowVisible(hwnd):
                out.append(hwnd)
            return True

        self.user32.EnumWindows(self.EnumProc(each), 0)
        return out

    def hide(self, hwnd: int) -> None:
        self.user32.ShowWindow(hwnd, 0)


def descendants(root: int, parents: dict[int, int]) -> set[int]:
    found = {root}
    grew = True
    while grew:
        grew = False
        for pid, parent in parents.items():
            if parent in found and pid not in found and pid != parent:
                found.add(pid)
                grew = True
    found.discard(root)
    return found


class WindowKeeper:
    def __init__(self, log: Callable[[str], None], system: Any = None, root: int | None = None, clock: Callable[[], float] | None = None) -> None:
        import time

        self.log = log
        self.system = system
        self.root = root or os.getpid()
        self.clock = clock or time.monotonic
        self.stopped = threading.Event()
        self.thread: threading.Thread | None = None
        self.hidden = 0

    def sweep(self) -> int:
        pids = descendants(self.root, self.system.parents())
        windows = self.system.shown_windows(pids) if pids else []
        for hwnd in windows:
            self.system.hide(hwnd)
        self.hidden += len(windows)
        return len(windows)

    def run(self) -> None:
        began = self.clock()
        while not self.stopped.is_set():
            try:
                self.sweep()
            except Exception as exc:
                self.log(f"Hidden window: a sweep failed ({type(exc).__name__}); trying again")
            self.stopped.wait(FIRST_EVERY if self.clock() - began < FIRST_SECONDS else LATER_EVERY)

    def start(self) -> "WindowKeeper":
        if self.system is None:
            self.system = Win32()
        self.thread = threading.Thread(target=self.run, name="logHiddenWindow", daemon=True)
        self.thread.start()
        return self

    def stop(self) -> None:
        self.stopped.set()
        if self.thread is not None:
            self.thread.join(timeout=2)


def keep_hidden(mode: str, log: Callable[[str], None], platform: str | None = None) -> WindowKeeper | None:
    if mode != "hidden":
        return None
    if not supported(platform):
        log(f"Hidden window: not built on {platform or sys.platform}, so the window stays visible (the stream still works)")
        return None
    log("Hidden window: the browser runs headed with no window or taskbar entry; the stream is its only view")
    return WindowKeeper(log).start()
