#!/usr/bin/env python3
"""Generate a daily bullet-point activity report using ByteDance Seed 2."""

import json
import os
import sys
import argparse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

LOG_DIR = Path.home() / ".activity-tracker"
REPORTS_DIR = Path.home() / "daily-reports"
REPORTS_DIR.mkdir(exist_ok=True)

# Load .env from same directory as this script
_env = Path(__file__).parent / ".env"
if _env.exists():
    for line in _env.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# ── Log loading ────────────────────────────────────────────────────────────────

def load_log(day: date) -> list:
    path = LOG_DIR / f"{day.strftime('%Y-%m-%d')}.jsonl"
    if not path.exists():
        return []
    entries = []
    for line in path.read_text().splitlines():
        try:
            entries.append(json.loads(line))
        except Exception:
            pass
    return entries


def compress(entries: list) -> list:
    """Merge consecutive identical (app, title) entries; count minutes."""
    if not entries:
        return []
    merged, cur = [], {**entries[0], "mins": 1}
    for e in entries[1:]:
        if e["app"] == cur["app"] and e["title"] == cur["title"]:
            cur["mins"] += 1
        else:
            merged.append(cur)
            cur = {**e, "mins": 1}
    merged.append(cur)
    return merged


def format_timeline(entries: list) -> str:
    lines = []
    for e in compress(entries):
        mins = e["mins"]
        dur = f"{mins}m" if mins < 60 else f"{mins // 60}h {mins % 60:02d}m"
        title = f" — {e['title']}" if e["title"] else ""
        lines.append(f"[{e['ts']}] {e['app']}{title}  ({dur})")
    return "\n".join(lines)


# ── ByteDance Seed 2 API call ──────────────────────────────────────────────────

def call_seed(timeline: str, day: date) -> str:
    api_key = os.environ.get("BYTEDANCE_API_KEY", "")
    if not api_key:
        sys.exit("Error: BYTEDANCE_API_KEY not set in activity-tracker/.env")

    model = os.environ.get("BYTEDANCE_MODEL", "seed-2-0-mini-260428")
    endpoint = os.environ.get(
        "BYTEDANCE_API_URL",
        "https://ark.ap-southeast.bytepluses.com/api/v3/responses",
    )

    prompt = f"""Here is my computer activity log for {day.strftime('%A, %B %d, %Y')}:

{timeline}

Output ONLY a valid JSON array — no markdown, no explanation, nothing else.

Each item has:
- "task": what was worked on (specific name from window titles where possible)
- "status": "Done" if the task seems completed, "In-progress" if it's an ongoing project

Rules:
- Group related work (multiple windows/tabs for the same project = one item)
- Focus on WHAT was done, not which app was used
- Past tense task names: "API testing and validation", "Revenue tracking", "Team sync"
- Skip idle time, lock screen, trivial Finder browsing
- 3 to 10 items maximum

Example output:
[
  {{"task": "API testing and validation", "status": "Done"}},
  {{"task": "Playground stability improvements", "status": "In-progress"}},
  {{"task": "Team sync", "status": "Done"}}
]"""

    body = json.dumps({
        "model": model,
        "stream": False,
        "input": [
            {
                "role": "user",
                "content": [{"type": "input_text", "text": prompt}],
            }
        ],
    }).encode()

    req = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())

    # Responses API: output[].content[].text
    for item in data.get("output", []):
        if item.get("type") == "message":
            for part in item.get("content", []):
                if part.get("type") == "output_text":
                    return part["text"].strip()

    raise ValueError(f"Unexpected response shape: {json.dumps(data)[:300]}")


# ── GitHub sync ────────────────────────────────────────────────────────────────

def sync_to_github(day: date, content: str):
    """Push report JSON to srv09/daily-tracker/reports/YYYY-MM-DD.json via gh CLI."""
    import subprocess, base64 as b64

    repo = "srv09/daily-tracker"
    file_path = f"reports/{day.isoformat()}.json"
    encoded = b64.b64encode(content.encode()).decode()

    # Get SHA if file already exists (required for updates)
    sha_result = subprocess.run(
        ["gh", "api", f"repos/{repo}/contents/{file_path}", "-q", ".sha"],
        capture_output=True, text=True,
    )
    sha = sha_result.stdout.strip() if sha_result.returncode == 0 else None

    cmd = [
        "gh", "api", f"repos/{repo}/contents/{file_path}",
        "-X", "PUT",
        "-f", f"message=report: {day.isoformat()}",
        "-f", f"content={encoded}",
    ]
    if sha:
        cmd += ["-f", f"sha={sha}"]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  Pushed to GitHub → {file_path}")
    else:
        print(f"  GitHub push failed: {result.stderr.strip()}")


# ── Web sync (legacy — kept for optional Vercel API sync) ─────────────────────

def sync_to_web(day: date, markdown: str):
    url = os.environ.get("REPORTS_API_URL", "").rstrip("/")
    secret = os.environ.get("REPORTS_API_SECRET", "")
    if not url or not secret:
        return

    body = json.dumps({"date": day.isoformat(), "report": markdown}).encode()
    req = urllib.request.Request(
        f"{url}/api/reports",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-reports-secret": secret,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print(f"  Synced to web viewer  ({resp.status})")
    except Exception as e:
        print(f"  Web sync failed (report still saved locally): {e}")


# ── Main ───────────────────────────────────────────────────────────────────────

def generate(day: date):
    entries = load_log(day)
    if not entries:
        print(f"No activity logged for {day}.")
        print(f"  Make sure tracker.py is running: launchctl list | grep activity-tracker")
        return

    timeline = format_timeline(entries)
    total_mins = len(entries)
    model = os.environ.get("BYTEDANCE_MODEL", "seed-2-0-mini-260428")
    print(f"Generating report for {day}  ({total_mins} minutes tracked)  [{model}]...")

    raw = call_seed(timeline, day)

    # Parse JSON; fall back to raw text if the model didn't comply
    try:
        tasks = json.loads(raw)
        assert isinstance(tasks, list)
    except Exception:
        tasks = None

    if tasks:
        content = json.dumps({"date": day.isoformat(), "tasks": tasks}, ensure_ascii=False)
    else:
        content = raw

    report_path = REPORTS_DIR / f"{day.isoformat()}.md"
    report_path.write_text(content + "\n")
    print(f"Saved → {report_path}")

    sync_to_web(day, content)

    print()
    if tasks:
        print(f"📅 {day.strftime('%A, %B %d, %Y')}\n")
        for t in tasks:
            status_icon = "✅" if t.get("status") == "Done" else "🔄"
            print(f"  {status_icon}  {t['task']}  [{t.get('status', '')}]")
    else:
        print(content)


def main():
    p = argparse.ArgumentParser(description="Generate daily activity report")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--yesterday", action="store_true", help="Report for yesterday")
    g.add_argument("--date", metavar="YYYY-MM-DD", help="Specific date")
    args = p.parse_args()

    if args.yesterday:
        day = date.today() - timedelta(days=1)
    elif args.date:
        day = date.fromisoformat(args.date)
    else:
        day = date.today()

    generate(day)


if __name__ == "__main__":
    main()
