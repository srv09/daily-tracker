#!/usr/bin/env python3
"""Background daemon — logs active app + window title every 60 seconds."""

import subprocess
import json
import time
from datetime import datetime
from pathlib import Path

LOG_DIR = Path.home() / ".activity-tracker"
LOG_DIR.mkdir(exist_ok=True)


def get_chrome_title() -> str:
    script = '''
    tell application "Google Chrome"
        if (count of windows) > 0 then
            return title of active tab of first window
        end if
        return ""
    end tell
    '''
    try:
        r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=3)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def get_active_window():
    script = '''
    tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        try
            set windowTitle to name of front window of frontApp
        on error
            set windowTitle to ""
        end try
        return appName & "|||" & windowTitle
    end tell
    '''
    try:
        r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=5)
        if r.returncode != 0:
            return None, None
        parts = r.stdout.strip().split("|||", 1)
        app = parts[0].strip()
        title = parts[1].strip() if len(parts) > 1 else ""
        # For Chrome, get actual tab title (richer context)
        if app in ("Google Chrome", "Chromium", "Google Chrome Canary"):
            chrome_title = get_chrome_title()
            if chrome_title:
                title = chrome_title
        return app, title
    except Exception:
        return None, None


def log_entry():
    app, title = get_active_window()
    if not app:
        return
    entry = {
        "ts": datetime.now().strftime("%H:%M"),
        "app": app,
        "title": title,
    }
    today = datetime.now().strftime("%Y-%m-%d")
    with open(LOG_DIR / f"{today}.jsonl", "a") as f:
        f.write(json.dumps(entry) + "\n")


def main():
    print(f"[activity-tracker] started — logging to {LOG_DIR}", flush=True)
    while True:
        try:
            log_entry()
        except Exception as e:
            print(f"[activity-tracker] error: {e}", flush=True)
        time.sleep(60)


if __name__ == "__main__":
    main()
