# Duong Tan Phuc - Portfolio & Blog

Minimalist, monospace personal portfolio, technical blog, and reading log.

## Stack & Architecture

- **Static Site Engine**: [Jekyll](https://jekyllrb.com/) natively hosted on GitHub Pages, with a native Python static builder (`manager/builder.py`) for local builds and previews.
- **Design System**: Monospace typography stack, responsive centered container (`max-width: 720px`), zero decorative bloat, zero runtime framework dependencies.
- **Blog**: Markdown files stored in `_posts/` with YAML front-matter.
- **Reading Log**: Structured YAML library in `_data/books.yml` with native HTML5 `<details><summary>` click-to-expand reviews.

## Repository Structure

```text
├── index.html               # Main portfolio landing page
├── blog.html                # Blog archive page
├── books.html               # Reading log with expandable notes
├── _config.yml              # Jekyll / GitHub Pages configuration
├── _posts/                  # Markdown blog posts (YYYY-MM-DD-title.md)
├── _data/
│   └── books.yml            # Structured reading list and reflections
├── _layouts/
│   └── post.html            # Article reading layout
├── assets/                  # Icons and project/profile images
├── css/                     # Website typography, layout, and utilities
├── js/                      # Website smooth scroll script
├── project-pages/           # Dedicated project deep-dives
└── manager/                 # Desktop Portfolio Manager App & Build Tooling
    ├── gui.py               # Desktop GUI launcher (WebView2 / Browser)
    ├── server.py            # Flask backend API server
    ├── builder.py           # Native Python static site builder
    ├── package.py           # PyInstaller standalone EXE builder & shortcut creator
    ├── requirements.txt     # Python dependencies
    └── static/              # Manager frontend UI & vendor assets (CodeMirror Vim, Marked)
```

## Management App GUI

A dedicated desktop management application powered by Windows WebView2 and Python:

```bash
# 1. Open from Windows Desktop:
Double-click "Portfolio Manager" on your Desktop

# 2. Or run via Python:
python manager/gui.py               # Native desktop window
python manager/gui.py --browser     # Open in default web browser

# 3. Build static site into _site/ directly:
python manager/builder.py

# 4. Compile standalone .exe and refresh Desktop shortcut:
python manager/package.py
```

**Features in GUI**:
- **Blog Manager**: Permanent 50/50 split-pane live Markdown editor with built-in **Neovim / Vim modal editing** (`:w` to save & build) and YAML frontmatter controls.
- **Reading Log Manager**: Add/edit books, status filters, ratings, personal reflections, and memorable quotes.
- **Site Preview**: One-click local HTTP server toggle (`http://localhost:8080`) with embedded live preview iframe.
- **Git & Deploy**: Working tree inspector, custom commit message, and one-click commit & push to GitHub Pages.

## License

CC0 1.0 Universal.
