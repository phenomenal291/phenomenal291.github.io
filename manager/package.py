#!/usr/bin/env python3
"""
manager/package.py - Standalone Windows Desktop Executable Builder & Shortcut Creator.
Uses PyInstaller to package manager/gui.py into a windowless desktop executable,
cleans temporary build artifacts, and updates the Windows Desktop shortcut.
"""

import os
import sys
import shutil
import subprocess

MANAGER_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(MANAGER_DIR)

EXCLUDED_MODULES = [
    "scipy", "pandas", "numpy", "matplotlib", "pyarrow",
    "IPython", "jedi", "tkinter", "sqlite3", "pytest"
]

def ensure_icon():
    ico_path = os.path.join(ROOT_DIR, "assets", "icon.ico")
    if not os.path.exists(ico_path):
        from PIL import Image
        png_path = os.path.join(ROOT_DIR, "assets", "images", "1311.png")
        if os.path.exists(png_path):
            img = Image.open(png_path)
            img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
            print("[OK] Generated assets/icon.ico from 1311.png")
    return ico_path

def create_desktop_shortcut(exe_path, ico_path):
    if sys.platform != "win32":
        return
    ps_script = f"""
    $wsh = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shortcutPath = Join-Path $desktop 'Portfolio Manager.lnk'
    $shortcut = $wsh.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = '{exe_path}'
    $shortcut.WorkingDirectory = '{ROOT_DIR}'
    $shortcut.IconLocation = '{ico_path},0'
    $shortcut.Description = 'Portfolio Manager - Duong Tan Phuc'
    $shortcut.Save()
    """
    subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_script],
        cwd=ROOT_DIR,
        capture_output=True
    )
    print("[OK] Updated Windows Desktop shortcut: Portfolio Manager.lnk")

def cleanup_temp_artifacts():
    build_dir = os.path.join(ROOT_DIR, "build")
    spec_file = os.path.join(ROOT_DIR, "PortfolioManager.spec")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir, ignore_errors=True)
    if os.path.exists(spec_file):
        try:
            os.remove(spec_file)
        except OSError:
            pass
    print("[OK] Cleaned up temporary PyInstaller build/ and .spec files")

def build_exe():
    print("=" * 60)
    print("      BUILDING PORTFOLIO MANAGER STANDALONE EXECUTABLE      ")
    print("=" * 60)

    ico_path = ensure_icon()
    gui_script = os.path.join(MANAGER_DIR, "gui.py")
    static_data = f"{MANAGER_DIR};manager"

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconsole",
        "--name=PortfolioManager",
        f"--icon={ico_path}",
        f"--add-data={static_data}",
        "--clean",
        "-y",
    ]
    for mod in EXCLUDED_MODULES:
        cmd.append(f"--exclude-module={mod}")
    cmd.append(gui_script)

    print(f"[*] Executing command:\n    {' '.join(cmd)}\n")
    res = subprocess.run(cmd, cwd=ROOT_DIR)

    if res.returncode == 0:
        exe_path = os.path.join(ROOT_DIR, "dist", "PortfolioManager", "PortfolioManager.exe")
        cleanup_temp_artifacts()
        create_desktop_shortcut(exe_path, ico_path)
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
