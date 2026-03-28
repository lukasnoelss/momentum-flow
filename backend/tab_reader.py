#!/usr/bin/env python3
# macOS:   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir=/tmp/chrome-debug-profile
# Linux:   google-chrome --remote-debugging-port=9222 --remote-allow-origins=*
# Windows: chrome.exe --remote-debugging-port=9222 --remote-allow-origins=*
"""
Momentum — Chrome Tab Reader
Connects to Chrome via CDP, extracts tab data, and POSTs it to the
Momentum backend. Runs in a 15-second loop by default; pass --once
to run a single scan.
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error

import requests

CDP_URL = "http://localhost:9222"
BACKEND_URL = "http://localhost:8000/tabs"
SCAN_INTERVAL = 15  # seconds

SKIP_SCHEMES = ("chrome://", "devtools://", "chrome-extension://", "extension://")


def get_open_tabs() -> list[dict]:
    """Fetch the list of open tabs from Chrome DevTools Protocol."""
    try:
        req = urllib.request.Request(f"{CDP_URL}/json")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.URLError as exc:
        print(f"[error] Cannot connect to Chrome CDP at {CDP_URL}: {exc}")
        print("        Make sure Chrome is running with --remote-debugging-port=9222")
        return []


def extract_tab_content(ws_url: str) -> dict | None:
    """Use CDP Runtime.evaluate over WebSocket to grab page content."""
    try:
        import websocket  # type: ignore[import-untyped]
    except ImportError:
        return None

    js_expression = """
    (function() {
        return JSON.stringify({
            title: document.title || '',
            href: window.location.href || '',
            text: (document.body && document.body.innerText || '').substring(0, 3000)
        });
    })()
    """

    try:
        ws = websocket.create_connection(ws_url, timeout=5)
        payload = json.dumps({
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {"expression": js_expression, "returnByValue": True},
        })
        ws.send(payload)
        result = json.loads(ws.recv())
        ws.close()

        value = result.get("result", {}).get("result", {}).get("value")
        if value:
            return json.loads(value)
    except Exception:
        pass
    return None


def build_payload(tabs_json: list[dict]) -> list[dict]:
    """Build the tab payload to send to the backend."""
    payload: list[dict] = []

    for tab in tabs_json:
        if tab.get("type") != "page":
            continue

        url: str = tab.get("url", "")
        if any(url.startswith(s) for s in SKIP_SCHEMES):
            continue

        ws_url = tab.get("webSocketDebuggerUrl")
        content = extract_tab_content(ws_url) if ws_url else None

        if content:
            payload.append({
                "title": content.get("title", tab.get("title", "")),
                "url": content.get("href", url),
                "text": content.get("text", "")[:3000],
            })
        else:
            payload.append({
                "title": tab.get("title", ""),
                "url": url,
                "text": "",
            })

    return payload


def send_to_backend(tabs: list[dict]) -> dict | None:
    """POST tab payload to the Momentum backend."""
    try:
        resp = requests.post(BACKEND_URL, json={"tabs": tabs}, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        print(f"[error] Failed to reach backend at {BACKEND_URL}: {exc}")
        return None


def print_result(result: dict) -> None:
    score = result.get("focus_score", "?")
    label = result.get("focus_label", "?")
    tab_count = result.get("tab_count", "?")
    insight = result.get("insight", {})

    print(f"\n{'─' * 50}")
    print(f"  Focus Score : {score}/100  ({label})")
    print(f"  Tabs        : {tab_count}")
    print(f"  Working on  : {insight.get('working_on', '—')}")
    print(f"  Next action : {insight.get('next_action', '—')}")
    stuck = insight.get("stuck_signal")
    if stuck:
        print(f"  Stuck?      : {stuck}")
    print(f"{'─' * 50}\n")


def scan_once() -> None:
    tabs_json = get_open_tabs()
    if not tabs_json:
        print("[info] No tabs found or Chrome not reachable.")
        return

    payload = build_payload(tabs_json)
    if not payload:
        print("[info] No eligible tabs to analyse.")
        return

    print(f"[info] Sending {len(payload)} tab(s) to Momentum backend …")
    result = send_to_backend(payload)
    if result:
        print_result(result)


def main() -> None:
    parser = argparse.ArgumentParser(description="Momentum Chrome Tab Reader")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single scan instead of looping every 15 seconds.",
    )
    args = parser.parse_args()

    print("🚀 Momentum Tab Reader")
    print(f"   CDP endpoint : {CDP_URL}")
    print(f"   Backend      : {BACKEND_URL}")
    print()

    if args.once:
        scan_once()
    else:
        print(f"Scanning every {SCAN_INTERVAL}s — press Ctrl+C to stop.\n")
        try:
            while True:
                scan_once()
                time.sleep(SCAN_INTERVAL)
        except KeyboardInterrupt:
            print("\n[info] Stopped by user.")


if __name__ == "__main__":
    main()
