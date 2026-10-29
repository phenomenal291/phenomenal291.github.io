#!/usr/bin/env python3
"""
manager/gui.py - Desktop Application GUI Launcher for Duong Tan Phuc's Portfolio Manager.
Runs a native desktop window using Windows WebView2 (via pywebview), with graceful
fallback to local browser dashboard.
"""

import sys
import os
import threading
import time
import webbrowser

# Add manager & repo root dirs to path
MANAGER_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(MANAGER_DIR)
for p in (ROOT_DIR, MANAGER_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from manager.server import app, ROOT_DIR as APP_ROOT
except ImportError:
    from server import app, ROOT_DIR as APP_ROOT

PORT = 5050
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"

def run_server():
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)

def main():
    use_browser = "--browser" in sys.argv or "-b" in sys.argv

    # Start Flask background server
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(0.4) # Wait for server to bind

    print("=" * 60)
    print("   DUONG TAN PHUC - PORTFOLIO & BLOG MANAGEMENT APP   ")
    print("=" * 60)
    print(f"[*] Backend server active at: {URL}")

    if use_browser:
        print("[*] Opening in default web browser...")
        webbrowser.open(URL)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[i] Server stopped.")
            sys.exit(0)

    try:
        import webview
        print("[*] Launching native Windows WebView2 desktop application...")
        window = webview.create_window(
            title="Portfolio Manager — Duong Tan Phuc",
            url=URL,
            width=1240,
            height=820,
            min_size=(920, 620),
            confirm_close=False,
            text_select=True,
            background_color='#F8F4ED'
        )
        webview.start()
    except Exception as e:
        print(f"[!] PyWebView window could not open ({e}).")
        print("[*] Falling back to default web browser...")
        webbrowser.open(URL)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n[i] Server stopped.")
            sys.exit(0)

if __name__ == "__main__":
    main()
