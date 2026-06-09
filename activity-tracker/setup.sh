#!/bin/bash
# Setup script for activity-tracker — run once after cloning.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_DIR="$HOME/Library/LaunchAgents"

echo ""
echo "╔══════════════════════════════════╗"
echo "║     Activity Tracker — Setup     ║"
echo "╚══════════════════════════════════╝"
echo ""

# ── Prerequisites ──────────────────────────────────────────────────────────────
python3 --version >/dev/null 2>&1 || { echo "✗ python3 not found — install from python.org"; exit 1; }

# ── .env ──────────────────────────────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "⚠  Created .env — please add your Anthropic API key:"
    echo "   $SCRIPT_DIR/.env"
    echo ""
    echo "   Get one at: https://console.anthropic.com/settings/api-keys"
    echo ""
    read -p "   Open .env now to edit? [y/N] " yn
    if [[ "$yn" =~ ^[Yy]$ ]]; then
        open -a TextEdit "$SCRIPT_DIR/.env" 2>/dev/null || nano "$SCRIPT_DIR/.env"
    fi
    echo ""
fi

# ── Directories ────────────────────────────────────────────────────────────────
mkdir -p ~/.activity-tracker
mkdir -p ~/daily-reports
mkdir -p "$PLIST_DIR"

# ── LaunchAgent plists ─────────────────────────────────────────────────────────
echo "Installing LaunchAgents..."

TRACKER_PLIST="$PLIST_DIR/com.sourav.activity-tracker.plist"
sed "s|__SCRIPT_DIR__|$SCRIPT_DIR|g" \
    "$SCRIPT_DIR/plist/tracker.plist.template" > "$TRACKER_PLIST"

REPORTER_PLIST="$PLIST_DIR/com.sourav.daily-reporter.plist"
sed "s|__SCRIPT_DIR__|$SCRIPT_DIR|g" \
    "$SCRIPT_DIR/plist/reporter.plist.template" > "$REPORTER_PLIST"

# Reload
for PLIST in "$TRACKER_PLIST" "$REPORTER_PLIST"; do
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl load "$PLIST"
done

echo ""
echo "✓  Tracker started   — logs every 60s to ~/.activity-tracker/"
echo "✓  Reporter scheduled — runs daily at 8:30 PM → ~/daily-reports/"
echo ""
echo "────────────────────────────────────────"
echo "  Quick commands:"
echo ""
echo "  Generate today's report now:"
echo "    python3 $SCRIPT_DIR/reporter.py"
echo ""
echo "  Generate yesterday's report:"
echo "    python3 $SCRIPT_DIR/reporter.py --yesterday"
echo ""
echo "  Check tracker is running:"
echo "    launchctl list | grep sourav"
echo ""
echo "  Watch live tracker log:"
echo "    tail -f /tmp/activity-tracker.log"
echo "────────────────────────────────────────"
echo ""
echo "Note: macOS will prompt for Accessibility & Screen Recording permissions"
echo "the first time the tracker reads window titles. Allow both."
echo ""
