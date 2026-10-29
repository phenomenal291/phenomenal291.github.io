#!/usr/bin/env python3
"""
manager/builder.py - Native Python static site builder for Duong Tan Phuc's Portfolio & Blog.
"""

import os
import sys
import re
import shutil
from datetime import datetime, date
import yaml
import markdown
import liquid

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

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
SITE_DIR = os.path.join(ROOT_DIR, "_site")

def get_liquid_env():
    env = liquid.Environment()
    def relative_url(val):
        return str(val) if val is not None else ""
    env.filters["relative_url"] = relative_url
    return env

def parse_front_matter(content):
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
            except Exception as e:
                print(f"[!] Warning: Failed to parse YAML front-matter: {e}")
    return meta, body

def clean_title_and_body(meta, body, slug):
    title = meta.get("title", "")
    if title:
        title = str(title).strip()
        # If body starts with an H1 heading matching title, strip it to prevent duplicate title
        match = re.match(r"^\s*#\s+(.*?)(?:\n+|$)", body)
        if match:
            first_h1 = match.group(1).strip()
            if first_h1.lower() == title.lower() or not first_h1:
                body = re.sub(r"^\s*#\s+.*?(?:\n+|$)", "", body, count=1)
    else:
        match = re.search(r"^\s*#\s+(.+?)\s*$", body, flags=re.MULTILINE)
        if match:
            title = match.group(1).strip()
            body = re.sub(r"^\s*#\s+.*?(?:\n+|$)", "", body, count=1)
        else:
            title = slug.replace("-", " ").capitalize()
    return title, body

def get_description(meta, body):
    if meta.get("description"):
        return str(meta["description"]).strip()
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", body.strip()) if p.strip() and not p.strip().startswith("#")]
    first_p = paragraphs[0] if paragraphs else ""
    clean_p = re.sub(r"[#*_`\[\]]", "", first_p).strip()
    return (clean_p[:137] + "...") if len(clean_p) > 140 else clean_p

def parse_date(date_val, date_str):
    if isinstance(date_val, (datetime, date)):
        return date_val
    target_str = str(date_val) if date_val else date_str
    try:
        return datetime.strptime(target_str[:10], "%Y-%m-%d").date()
    except Exception:
        return datetime.now().date()

def build():
    print(f"[*] Building site into {SITE_DIR}/ using native Python builder...")
    os.makedirs(SITE_DIR, exist_ok=True)
    env = get_liquid_env()

    # 1. Copy static assets
    for asset_dir_name in ["css", "js", "assets", "project-pages"]:
        asset_dir = os.path.join(ROOT_DIR, asset_dir_name)
        if os.path.exists(asset_dir):
            dest = os.path.join(SITE_DIR, asset_dir_name)
            if os.path.exists(dest):
                shutil.rmtree(dest)
            shutil.copytree(asset_dir, dest)

    # 2. Load books data
    books = []
    books_file = os.path.join(ROOT_DIR, "_data", "books.yml")
    if os.path.exists(books_file):
        with open(books_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            if isinstance(data, list):
                books = data

    # 3. Load and render posts
    posts = []
    posts_dir = os.path.join(ROOT_DIR, "_posts")
    post_layout_file = os.path.join(ROOT_DIR, "_layouts", "post.html")
    post_layout = ""
    if os.path.exists(post_layout_file):
        with open(post_layout_file, "r", encoding="utf-8") as f:
            post_layout = f.read()

    md_processor = markdown.Markdown(extensions=["fenced_code", "tables", "toc"])

    if os.path.exists(posts_dir) and post_layout:
        post_files = sorted([f for f in os.listdir(posts_dir) if f.endswith(".md")], reverse=True)
        for post_filename in post_files:
            filepath = os.path.join(posts_dir, post_filename)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()

            meta, body = parse_front_matter(content)
            base_name = post_filename[:-3] # remove .md
            date_match = re.match(r"^(\d{4}-\d{2}-\d{2})-(.*)$", base_name)
            if date_match:
                date_str = date_match.group(1)
                slug = date_match.group(2)
            else:
                date_str = str(meta.get("date", datetime.now().strftime("%Y-%m-%d")))
                slug = base_name

            title, cleaned_body = clean_title_and_body(meta, body, slug)
            description = get_description(meta, cleaned_body)
            post_date = parse_date(meta.get("date"), date_str)
            url = f"/blog/{slug}/"

            # Render markdown to HTML
            md_processor.reset()
            html_body = md_processor.convert(cleaned_body)

            # Render layout
            page_context = dict(meta)
            page_context.update({
                "title": title,
                "date": post_date,
                "description": description,
                "url": url,
                "slug": slug
            })

            post_context = {
                "page": page_context,
                "content": html_body,
                "site": {"title": "Phuc Duong"}
            }

            post_template = env.from_string(post_layout)
            rendered_post = post_template.render(post_context)

            # Output post
            post_out_dir = os.path.join(SITE_DIR, "blog", slug)
            os.makedirs(post_out_dir, exist_ok=True)
            with open(os.path.join(post_out_dir, "index.html"), "w", encoding="utf-8") as f:
                f.write(rendered_post)

            posts.append({
                "title": title,
                "date": post_date,
                "description": description,
                "url": url,
                "slug": slug
            })

    site_context = {
        "site": {
            "title": "Phuc Duong",
            "posts": posts,
            "data": {"books": books}
        }
    }

    # 4. Render core pages
    for page in ["index.html", "blog.html", "books.html"]:
        page_path = os.path.join(ROOT_DIR, page)
        if os.path.exists(page_path):
            with open(page_path, "r", encoding="utf-8") as f:
                raw_page = f.read()
            cleaned_page = re.sub(r"^---[\s\S]*?---\n", "", raw_page)
            page_template = env.from_string(cleaned_page)
            rendered_page = page_template.render(site_context)
            with open(os.path.join(SITE_DIR, page), "w", encoding="utf-8") as f:
                f.write(rendered_page)

    print(f"[OK] Site built successfully into {SITE_DIR}/ ({len(posts)} posts, {len(books)} books)")
    return True

if __name__ == "__main__":
    build()
