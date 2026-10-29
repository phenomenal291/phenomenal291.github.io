"""
manager/server.py - Flask backend server for Portfolio Management GUI.
Provides RESTful APIs for Posts, Books, Site Building, Preview Server, and Git Deployments.
"""

import os
import sys
import re

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
import shutil
import subprocess
import threading
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
import yaml

# Safe subprocess execution with no console window flashing on Windows
def safe_run_cmd(cmd, **kwargs):
    if sys.platform == "win32":
        kwargs.setdefault("creationflags", subprocess.CREATE_NO_WINDOW)
    return subprocess.run(cmd, **kwargs)

def safe_popen_cmd(cmd, **kwargs):
    if sys.platform == "win32":
        kwargs.setdefault("creationflags", subprocess.CREATE_NO_WINDOW)
    return subprocess.Popen(cmd, **kwargs)

# Determine repository root directory
def resolve_root_dir():
    if "PORTFOLIO_ROOT" in os.environ and os.path.exists(os.environ["PORTFOLIO_ROOT"]):
        return os.path.abspath(os.environ["PORTFOLIO_ROOT"])
    if os.path.exists(os.path.join(os.getcwd(), "_posts")):
        return os.path.abspath(os.getcwd())
    if getattr(sys, "frozen", False):
        cur = os.path.dirname(os.path.abspath(sys.executable))
        for _ in range(4):
            if os.path.exists(os.path.join(cur, "_posts")):
                return cur
            cur = os.path.dirname(cur)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ROOT_DIR = resolve_root_dir()
MANAGER_DIR = os.path.dirname(os.path.abspath(__file__))
for p in (ROOT_DIR, MANAGER_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from manager import builder as site_builder
except ImportError:
    import builder as site_builder

POSTS_DIR = os.path.join(ROOT_DIR, "_posts")
BOOKS_FILE = os.path.join(ROOT_DIR, "_data", "books.yml")
SITE_DIR = os.path.join(ROOT_DIR, "_site")
INDEX_FILE = os.path.join(ROOT_DIR, "index.html")

# Resolve static directory for bundled vs normal Python execution
if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
    static_dir = os.path.join(sys._MEIPASS, "manager", "static")
else:
    static_dir = os.path.join(MANAGER_DIR, "static")

app = Flask(__name__, static_folder=static_dir)

# Preview server state
preview_httpd = None
preview_thread = None
preview_port = 8080

def slugify(title):
    slug = title.lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    return slug

def parse_post_full(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    meta = {}
    body = content
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            raw_meta = parts[1]
            body = parts[2]
            try:
                parsed = yaml.safe_load(raw_meta)
                if isinstance(parsed, dict):
                    meta = parsed
            except Exception:
                for line in raw_meta.splitlines():
                    if ":" in line:
                        k, v = line.split(":", 1)
                        meta[k.strip().lower()] = v.strip().strip('"').strip("'")
    return meta, body

def load_books_data():
    if not os.path.exists(BOOKS_FILE):
        return []
    with open(BOOKS_FILE, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
        return data if isinstance(data, list) else []

def save_books_data(books):
    os.makedirs(os.path.dirname(BOOKS_FILE), exist_ok=True)
    with open(BOOKS_FILE, "w", encoding="utf-8") as f:
        yaml.dump(books, f, allow_unicode=True, sort_keys=False, default_flow_style=False)

# ----------------- STATIC & SPA ROUTES -----------------

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/favicon.ico")
def favicon():
    ico_path = os.path.join(ROOT_DIR, "assets", "icon.ico")
    if os.path.exists(ico_path):
        return send_from_directory(os.path.join(ROOT_DIR, "assets"), "icon.ico")
    png_path = os.path.join(ROOT_DIR, "assets", "images", "1311.png")
    if os.path.exists(png_path):
        return send_from_directory(os.path.join(ROOT_DIR, "assets", "images"), "1311.png")
    return ("", 204)

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(app.static_folder, path)

# ----------------- STATUS & OVERVIEW -----------------

@app.route("/api/status")
def get_status():
    global preview_thread, preview_port
    is_preview_running = preview_thread is not None and preview_thread.is_alive()
    posts_count = len([f for f in os.listdir(POSTS_DIR) if f.endswith(".md")]) if os.path.exists(POSTS_DIR) else 0
    books_count = len(load_books_data())

    git_branch = "unknown"
    git_clean = True
    try:
        branch_res = safe_run_cmd(["git", "branch", "--show-current"], cwd=ROOT_DIR, capture_output=True, text=True)
        if branch_res.returncode == 0:
            git_branch = branch_res.stdout.strip()
        status_res = safe_run_cmd(["git", "status", "-s"], cwd=ROOT_DIR, capture_output=True, text=True)
        git_clean = len(status_res.stdout.strip()) == 0
    except Exception:
        pass

    return jsonify({
        "preview_running": is_preview_running,
        "preview_port": preview_port,
        "preview_url": f"http://localhost:{preview_port}" if is_preview_running else None,
        "posts_count": posts_count,
        "books_count": books_count,
        "git_branch": git_branch,
        "git_clean": git_clean,
        "site_dir_exists": os.path.exists(SITE_DIR)
    })

# ----------------- POSTS API -----------------

@app.route("/api/posts")
def list_posts():
    if not os.path.exists(POSTS_DIR):
        return jsonify([])
    posts = []
    files = sorted([f for f in os.listdir(POSTS_DIR) if f.endswith(".md")], reverse=True)
    for f in files:
        fp = os.path.join(POSTS_DIR, f)
        meta, body = parse_post_full(fp)
        date_match = re.match(r"^(\d{4}-\d{2}-\d{2})", f)
        date_val = str(meta.get("date") or (date_match.group(1) if date_match else "Undated"))
        title = str(meta.get("title") or f.replace(".md", "").replace("-", " ").title())
        desc = str(meta.get("description", ""))
        tags = meta.get("tags", [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]

        posts.append({
            "filename": f,
            "title": title,
            "date": date_val,
            "description": desc,
            "tags": tags,
            "content": body.strip(),
            "word_count": len(body.split())
        })
    return jsonify(posts)

@app.route("/api/posts/<filename>")
def get_post(filename):
    fp = os.path.join(POSTS_DIR, filename)
    if not os.path.exists(fp):
        return jsonify({"error": "Post not found"}), 404
    meta, body = parse_post_full(fp)
    date_match = re.match(r"^(\d{4}-\d{2}-\d{2})", filename)
    date_val = str(meta.get("date") or (date_match.group(1) if date_match else datetime.now().strftime("%Y-%m-%d")))
    title = str(meta.get("title") or "")
    desc = str(meta.get("description", ""))
    tags = meta.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    return jsonify({
        "filename": filename,
        "title": title,
        "date": date_val,
        "description": desc,
        "tags": tags,
        "content": body
    })

@app.route("/api/posts", methods=["POST"])
def save_post():
    data = request.json or {}
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Title cannot be empty"}), 400

    content = data.get("content", "").strip()
    today = datetime.now().strftime("%Y-%m-%d")
    date_val = data.get("date", "").strip() or today
    description = data.get("description", "").strip()
    tags = data.get("tags", [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",") if t.strip()]

    # Clean leading duplicate H1 heading from body if it matches title
    cleaned_body = content
    if cleaned_body.startswith("#"):
        first_line = cleaned_body.splitlines()[0]
        h1_text = first_line.lstrip("#").strip()
        if h1_text.lower() == title.lower():
            lines = cleaned_body.splitlines()
            cleaned_body = "\n".join(lines[1:]).strip()

    slug = slugify(title) or "untitled"
    expected_filename = f"{date_val}-{slug}.md"
    orig_filename = data.get("filename")

    os.makedirs(POSTS_DIR, exist_ok=True)
    target_filepath = os.path.join(POSTS_DIR, expected_filename)

    # If updating an existing post with a different filename, remove old file
    if orig_filename and orig_filename != expected_filename:
        old_path = os.path.join(POSTS_DIR, orig_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Build frontmatter
    lines = ["---", f'title: "{title}"', f"date: {date_val}"]
    if description:
        lines.append(f'description: "{description}"')
    if tags:
        tag_str = ", ".join(f'"{t}"' for t in tags)
        lines.append(f"tags: [{tag_str}]")
    lines.append("---\n")
    lines.append(cleaned_body + "\n")

    with open(target_filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # Auto rebuild site
    try:
        site_builder.build()
    except Exception as e:
        print(f"[!] Build error on post save: {e}")

    return jsonify({
        "success": True,
        "filename": expected_filename,
        "title": title,
        "date": date_val,
        "description": description,
        "tags": tags,
        "content": cleaned_body
    })

@app.route("/api/posts/<filename>", methods=["DELETE"])
def delete_post(filename):
    fp = os.path.join(POSTS_DIR, filename)
    if os.path.exists(fp):
        os.remove(fp)
        try:
            site_builder.build()
        except Exception as e:
            print(f"[!] Build error on post delete: {e}")
        return jsonify({"success": True})
    return jsonify({"error": "Post not found"}), 404

# ----------------- BOOKS API -----------------

@app.route("/api/books")
def list_books():
    books = load_books_data()
    return jsonify(books)

@app.route("/api/books", methods=["POST"])
def save_book():
    data = request.json or {}
    title = data.get("title", "").strip()
    if not title:
        return jsonify({"error": "Title cannot be empty"}), 400

    author = data.get("author", "").strip()
    genre = data.get("genre", "").strip()
    status = data.get("status", "Read").strip()
    year_read = data.get("year_read") or datetime.now().year
    try:
        year_read = int(year_read)
    except Exception:
        year_read = datetime.now().year

    rating = data.get("rating", "").strip()
    notes = data.get("notes", "").strip()
    quote = data.get("quote", "").strip()

    entry = {
        "title": title,
        "author": author,
        "status": status,
        "rating": rating if rating else ("Reading" if status == "Reading" else "5/5"),
        "notes": notes
    }
    if genre:
        entry["genre"] = genre
    if status == "Read":
        entry["year_read"] = year_read
    if quote:
        entry["quote"] = quote

    books = load_books_data()
    index = data.get("index")

    if index is not None and isinstance(index, int) and 0 <= index < len(books):
        books[index] = entry
    else:
        # Insert at beginning
        books.insert(0, entry)

    save_books_data(books)
    try:
        site_builder.build()
    except Exception as e:
        print(f"[!] Build error on book save: {e}")

    return jsonify({"success": True, "books": books})

@app.route("/api/books/<int:index>", methods=["DELETE"])
def delete_book(index):
    books = load_books_data()
    if 0 <= index < len(books):
        books.pop(index)
        save_books_data(books)
        try:
            site_builder.build()
        except Exception as e:
            print(f"[!] Build error on book delete: {e}")
        return jsonify({"success": True, "books": books})
    return jsonify({"error": "Index out of range"}), 404

# ----------------- BUILD & PREVIEW API -----------------

@app.route("/api/build", methods=["POST"])
def trigger_build():
    try:
        site_builder.build()
        return jsonify({"success": True, "message": "Site built successfully into _site/"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

class CustomHTTPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SITE_DIR if os.path.exists(SITE_DIR) else ROOT_DIR, **kwargs)

    def log_message(self, format, *args):
        pass # suppress request noise

def run_preview_server(port):
    global preview_httpd
    try:
        preview_httpd = HTTPServer(("127.0.0.1", port), CustomHTTPHandler)
        preview_httpd.serve_forever()
    except Exception as e:
        print(f"[!] Preview server stopped: {e}")

@app.route("/api/preview/toggle", methods=["POST"])
def toggle_preview():
    global preview_httpd, preview_thread, preview_port
    data = request.json or {}
    port = int(data.get("port", preview_port))

    if preview_thread and preview_thread.is_alive():
        # Stop server
        if preview_httpd:
            preview_httpd.shutdown()
            preview_httpd.server_close()
        preview_thread = None
        preview_httpd = None
        return jsonify({"running": False, "message": "Preview server stopped"})
    else:
        # Start server
        # Make sure site is built
        try:
            site_builder.build()
        except Exception:
            pass

        preview_port = port
        preview_thread = threading.Thread(target=run_preview_server, args=(preview_port,), daemon=True)
        preview_thread.start()
        return jsonify({
            "running": True,
            "port": preview_port,
            "url": f"http://localhost:{preview_port}",
            "message": f"Preview server running at http://localhost:{preview_port}"
        })

# ----------------- GIT API -----------------

@app.route("/api/git/status")
def git_status():
    try:
        branch_res = safe_run_cmd(["git", "branch", "--show-current"], cwd=ROOT_DIR, capture_output=True, text=True)
        branch = branch_res.stdout.strip() if branch_res.returncode == 0 else "main"

        status_res = safe_run_cmd(["git", "status", "-s"], cwd=ROOT_DIR, capture_output=True, text=True)
        raw_status = status_res.stdout.strip()
        changes = []
        for line in raw_status.splitlines():
            line = line.strip()
            if line:
                changes.append(line)

        log_res = safe_run_cmd(["git", "log", "-n", "5", "--oneline"], cwd=ROOT_DIR, capture_output=True, text=True)
        recent_commits = log_res.stdout.strip().splitlines() if log_res.returncode == 0 else []

        return jsonify({
            "branch": branch,
            "clean": len(changes) == 0,
            "changes": changes,
            "recent_commits": recent_commits
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/git/push", methods=["POST"])
def git_push():
    data = request.json or {}
    msg = data.get("message", "").strip() or "docs: update content"
    try:
        safe_run_cmd(["git", "add", "."], cwd=ROOT_DIR, check=True)
        commit_res = safe_run_cmd(["git", "commit", "-m", msg], cwd=ROOT_DIR, capture_output=True, text=True)
        push_res = safe_run_cmd(["git", "push", "origin", "main"], cwd=ROOT_DIR, capture_output=True, text=True)
        if push_res.returncode != 0:
            pull_res = safe_run_cmd(["git", "pull", "--rebase", "--autostash", "origin", "main"], cwd=ROOT_DIR, capture_output=True, text=True)
            if pull_res.returncode == 0:
                push_res = safe_run_cmd(["git", "push", "origin", "main"], cwd=ROOT_DIR, capture_output=True, text=True)
        if push_res.returncode == 0:
            return jsonify({
                "success": True,
                "message": f"Pushed to GitHub successfully! Commit: '{msg}'",
                "commit_output": commit_res.stdout,
                "push_output": push_res.stdout
            })
        else:
            return jsonify({
                "success": False,
                "error": push_res.stderr or push_res.stdout
            }), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def start_flask(host="127.0.0.1", port=5050):
    app.run(host=host, port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    start_flask()
