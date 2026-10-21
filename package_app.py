#!/usr/bin/env python3
"""
package_app.py - Standalone Windows Desktop Executable Builder.
Uses PyInstaller to package gui.py into a windowless desktop executable.
"""

import os
import sys
import shutil
import subprocess

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

def ensure_icon():
    ico_path = os.path.join(ROOT_DIR, "assets", "icon.ico")
    if not os.path.exists(ico_path):
        from PIL import Image
        png_path = os.path.join(ROOT_DIR, "assets", "images", "1311.png")
        if os.path.exists(png_path):
            img = Image.open(png_path)
            img.save(ico_path, format="ICO", sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
            print("[OK] Generated assets/icon.ico from 1311.png")
    return ico_path

def build_exe():
    print("=" * 60)
    print("      BUILDING PORTFOLIO MANAGER STANDALONE EXECUTABLE      ")
    print("=" * 60)

    ico_path = ensure_icon()
    gui_script = os.path.join(ROOT_DIR, "gui.py")
    static_data = f"{os.path.join(ROOT_DIR, 'gui_app')};gui_app"

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",
        "--name=PortfolioManager",
        f"--icon={ico_path}",
        f"--add-data={static_data}",
        "--clean",
        "-y",
        gui_script
    ]

    print(f"[*] Executing command:\n    {' '.join(cmd)}\n")
    res = subprocess.run(cmd, cwd=ROOT_DIR)

    if res.returncode == 0:
        exe_path = os.path.join(ROOT_DIR, "dist", "PortfolioManager", "PortfolioManager.exe")
        print("\n" + "=" * 60)
        print("[OK] Build Successful!")
        print(f"[OK] Executable created at: {exe_path}")
        print("=" * 60)
        return True
    else:
        print("\n[!] PyInstaller build failed with exit code:", res.returncode)
        return False

if __name__ == "__main__":
    build_exe()
