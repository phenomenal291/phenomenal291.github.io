# Duong Tan Phuc - Portfolio & Blog

Minimalist, monospace personal portfolio, technical blog, and reading log.

## Stack & Architecture

- **Static Site Engine**: [Jekyll](https://jekyllrb.com/) natively hosted on GitHub Pages.
- **Design System**: Monospace typography stack, responsive centered container (`max-width: 720px`), zero decorative bloat, zero runtime framework dependencies.
- **Blog**: Markdown files stored in `_posts/` with YAML front-matter.
- **Reading Log**: Structured YAML library in `_data/books.yml` with native HTML5 `<details><summary>` click-to-expand reviews.

## Repository Structure

```
├── index.html               # Main portfolio landing page
├── blog.html                # Blog archive page
├── books.html               # Reading log with expandable notes
├── _posts/                  # Markdown blog posts (YYYY-MM-DD-title.md)
├── _data/
│   └── books.yml            # Structured reading list and reflections
├── _layouts/
│   └── post.html            # Article reading layout
├── project-pages/           # Dedicated project deep-dives
├── css/                     # Typography, layout, and utilities
├── js/                      # Minimal smooth scroll script
├── manage.py                # Terminal CLI management tool (Linux / Windows)
├── manage.bat               # Windows batch wrapper for manage.py
├── gui.py                   # Desktop App GUI (PyWebView & Flask)
├── gui.bat                  # One-click Windows GUI launcher (windowless)
├── gui_app/                 # GUI static assets and API server
├── package_app.py           # Standalone executable compiler (PyInstaller)
├── create_shortcut.ps1      # Desktop shortcut generator
├── requirements.txt         # Python project dependencies
├── build.py                 # Native Python static builder (zero Ruby dependency)
└── build.rb                 # Ruby static builder (Liquid + Kramdown)
```

## Management App GUI

A dedicated desktop management application powered by Windows WebView2 and Python:

```bash
# 1. Open from Windows Desktop:
Double-click "Portfolio Manager" on your Desktop

# 2. Or run via batch file in repo:
gui.bat

# 3. Or using Python:
python gui.py               # Native desktop window
python gui.py --browser     # Open in default web browser
python manage.py gui        # Via CLI manager

# 4. Compile standalone .exe:
python package_app.py       # Compiles into dist/PortfolioManager/
```

**Features in GUI**:
- **Blog Manager**: Split-pane live Markdown editor, YAML frontmatter manager, quick Neovim / VS Code launcher.
- **Reading Log Manager**: Add/edit books, status toggles, ratings, personal reflections and quotes.
- **Site Preview**: One-click local HTTP server toggle (`http://localhost:8080`) with embedded live preview iframe.
- **Git & Deploy**: Working tree inspector, custom commit message, and one-click commit & push to GitHub Pages.

## Management CLI (`manage.py` / `manage.bat`)

A terminal CLI tool to manage content, preview locally, and deploy:

```bash
# Interactive menu:
./manage.py                  # Linux / macOS
manage.bat                   # Windows (or: python manage.py)

# Quick commands:
python manage.py gui         # Launch the desktop Management GUI
python manage.py post        # Create a new blog post (write first, title later)
python manage.py book        # Add a new book to the reading log
python manage.py preview     # Build and start local preview server (http://localhost:8080)
python manage.py build       # Build static site into _site/ (via build.py or build.rb)
python manage.py push        # Quick git commit & push
```

## License

CC0 1.0 Universal.
