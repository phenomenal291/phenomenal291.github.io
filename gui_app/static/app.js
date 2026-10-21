// ==========================================================================
// PORTFOLIO MANAGER - FRONTEND CONTROLLER (app.js)
// Astryx Neutral Minimalist Theme & Anti-Flicker Architecture
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Global State
  let posts = [];
  let books = [];
  let currentPost = null;
  let previewRunning = false;
  let previewPort = 8080;
  let currentBookFilter = "ALL";
  let lastStatusHash = "";

  // DOM Elements - Theme
  const htmlRoot = document.documentElement;
  const btnThemeToggle = document.getElementById("btn-theme-toggle");

  // DOM Elements - Tabs
  const tabs = document.querySelectorAll(".nav-tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // DOM Elements - Status & Header
  const statusBuild = document.getElementById("status-build");
  const statusPreview = document.getElementById("status-preview");
  const statusGit = document.getElementById("status-git");
  const btnQuickBuild = document.getElementById("btn-quick-build");
  const btnQuickPreview = document.getElementById("btn-quick-preview");
  const btnQuickPush = document.getElementById("btn-quick-push");
  const countPosts = document.getElementById("count-posts");
  const countBooks = document.getElementById("count-books");

  // DOM Elements - Blog
  const postSearch = document.getElementById("post-search");
  const btnNewPost = document.getElementById("btn-new-post");
  const postsList = document.getElementById("posts-list");
  const editorModeLabel = document.getElementById("editor-mode-label");
  const currentFilenameDisplay = document.getElementById("current-filename");
  const btnCopyMarkdown = document.getElementById("btn-copy-markdown");
  const btnDeletePost = document.getElementById("btn-delete-post");
  const btnSavePost = document.getElementById("btn-save-post");
  const postTitle = document.getElementById("post-title");
  const postDate = document.getElementById("post-date");
  const postDesc = document.getElementById("post-desc");
  const postTags = document.getElementById("post-tags");
  const postMarkdown = document.getElementById("post-markdown");
  const postPreviewRender = document.getElementById("post-preview-render");
  const paneEditor = document.getElementById("pane-editor");
  const panePreview = document.getElementById("pane-preview");
  const vimModeDisplay = document.getElementById("vim-mode-display");

  // CodeMirror Vim Instance
  let cmEditor = null;
  if (window.CodeMirror && postMarkdown) {
    cmEditor = CodeMirror.fromTextArea(postMarkdown, {
      lineNumbers: true,
      mode: "markdown",
      keyMap: "vim",
      lineWrapping: true,
      tabSize: 2,
      indentUnit: 2,
      showCursorWhenSelecting: true
    });

    // Define Vim Ex-commands for saving
    if (CodeMirror.Vim) {
      CodeMirror.Vim.defineEx("write", "w", () => {
        savePost();
      });
      CodeMirror.Vim.defineEx("wq", "wq", () => {
        savePost();
      });
      CodeMirror.commands.save = () => {
        savePost();
      };
    }

    // Sync Vim mode to header indicator
    cmEditor.on("vim-mode-change", (e) => {
      const mode = (e.mode || "normal").toLowerCase();
      if (vimModeDisplay) {
        vimModeDisplay.textContent = mode.toUpperCase();
        vimModeDisplay.className = "vim-status-indicator";
        if (mode === "insert") {
          vimModeDisplay.classList.add("mode-insert");
        } else if (mode === "visual") {
          vimModeDisplay.classList.add("mode-visual");
        }
      }
    });

    // Real-time preview on editor change
    cmEditor.on("change", () => {
      triggerPreviewUpdate(false);
    });
  }

  // DOM Elements - Books
  const statReading = document.getElementById("stat-reading");
  const statFinished = document.getElementById("stat-finished");
  const bookSearch = document.getElementById("book-search");
  const bookStatusButtons = document.querySelectorAll("#book-status-control .seg-btn");
  const btnAddBook = document.getElementById("btn-add-book");
  const booksGrid = document.getElementById("books-grid");

  // DOM Elements - Book Modal
  const bookModal = document.getElementById("book-modal");
  const modalBookTitle = document.getElementById("modal-book-title");
  const bookEditIndex = document.getElementById("book-edit-index");
  const modalBookName = document.getElementById("modal-book-name");
  const modalBookAuthor = document.getElementById("modal-book-author");
  const modalBookGenre = document.getElementById("modal-book-genre");
  const modalBookStatus = document.getElementById("modal-book-status");
  const modalBookRating = document.getElementById("modal-book-rating");
  const modalBookYear = document.getElementById("modal-book-year");
  const modalBookNotes = document.getElementById("modal-book-notes");
  const modalBookQuote = document.getElementById("modal-book-quote");
  const btnCancelBook = document.getElementById("btn-cancel-book");
  const btnCloseBookModal = document.getElementById("btn-close-book-modal");
  const btnSaveBookSubmit = document.getElementById("btn-save-book-submit");

  // DOM Elements - Preview & Build
  const previewServerStatus = document.getElementById("preview-server-status");
  const previewUrlDisplay = document.getElementById("preview-url-display");
  const btnToggleServer = document.getElementById("btn-toggle-server");
  const btnOpenBrowser = document.getElementById("btn-open-browser");
  const btnRunBuild = document.getElementById("btn-run-build");
  const previewIframe = document.getElementById("preview-iframe");
  const previewPlaceholder = document.getElementById("preview-placeholder");
  const btnStartPreviewDirect = document.getElementById("btn-start-preview-direct");
  const btnRefreshFrame = document.getElementById("btn-refresh-frame");
  const frameAddress = document.getElementById("frame-address");
  const buildConsole = document.getElementById("build-console");

  // DOM Elements - Git
  const gitDirtyBadge = document.getElementById("git-dirty-badge");
  const gitChangesList = document.getElementById("git-changes-list");
  const gitCommitMsg = document.getElementById("git-commit-msg");
  const btnDoPush = document.getElementById("btn-do-push");
  const gitRecentCommits = document.getElementById("git-recent-commits");
  const gitConsole = document.getElementById("git-console");

  // Toast
  const toast = document.getElementById("toast");
  let toastTimer = null;
  function showToast(message, duration = 2800) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
  }

  // ================= THEME TOGGLE =================
  const savedTheme = localStorage.getItem("astryx-theme") || "light";
  htmlRoot.setAttribute("data-theme", savedTheme);

  btnThemeToggle.addEventListener("click", () => {
    const currentTheme = htmlRoot.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    htmlRoot.setAttribute("data-theme", nextTheme);
    localStorage.setItem("astryx-theme", nextTheme);
    showToast(`Theme switched to Astryx ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)}`);
  });

  // ================= TAB NAVIGATION =================
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.tab;
      if (tab.classList.contains("active")) return;

      tabs.forEach(t => t.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");

      if (targetId === "tab-blog" && cmEditor) {
        setTimeout(() => cmEditor.refresh(), 50);
      }
      if (targetId === "tab-git") {
        fetchGitStatus();
      }
    });
  });

  // ================= SYSTEM STATUS (Selective diff to prevent flicker) =================
  async function fetchStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();

      // Simple hash to avoid touching DOM if nothing changed
      const currentHash = `${data.preview_running}_${data.preview_port}_${data.posts_count}_${data.books_count}_${data.git_branch}_${data.git_clean}`;
      if (currentHash === lastStatusHash) return;
      lastStatusHash = currentHash;

      previewRunning = data.preview_running;
      previewPort = data.preview_port;

      if (data.preview_running) {
        statusPreview.className = "status-badge running";
        statusPreview.innerHTML = `<span class="dot"></span> preview: :${data.preview_port}`;
        previewServerStatus.className = "server-status-pill running";
        previewServerStatus.textContent = "Running";
        btnToggleServer.textContent = "Stop Server";
        btnToggleServer.className = "btn btn-sm btn-danger";
        btnOpenBrowser.style.display = "inline-flex";
        previewPlaceholder.style.display = "none";
        if (previewIframe.src === "about:blank" || !previewIframe.src) {
          previewIframe.src = data.preview_url;
        }
      } else {
        statusPreview.className = "status-badge stopped";
        statusPreview.innerHTML = `<span class="dot"></span> preview: stopped`;
        previewServerStatus.className = "server-status-pill stopped";
        previewServerStatus.textContent = "Stopped";
        btnToggleServer.textContent = "Start Preview Server";
        btnToggleServer.className = "btn btn-sm btn-primary";
        btnOpenBrowser.style.display = "none";
        previewPlaceholder.style.display = "flex";
      }

      statusGit.innerHTML = `<span class="dot"></span> git: ${data.git_branch}${data.git_clean ? "" : "*"}`;
      countPosts.textContent = data.posts_count;
      countBooks.textContent = data.books_count;
    } catch (e) {
      console.warn("Status fetch error", e);
    }
  }

  // ================= BLOG POSTS =================
  async function loadPosts() {
    try {
      const res = await fetch("/api/posts");
      posts = await res.json();
      renderPostsList();
      if (!currentPost && posts.length > 0) {
        selectPost(posts[0]);
      }
    } catch (e) {
      postsList.innerHTML = `<div class="loading-state">Failed to load posts</div>`;
    }
  }

  function renderPostsList() {
    const q = (postSearch.value || "").toLowerCase().trim();
    const filtered = posts.filter(p => {
      return p.title.toLowerCase().includes(q) ||
             (p.description && p.description.toLowerCase().includes(q)) ||
             p.filename.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      postsList.innerHTML = `<div class="loading-state">No matching posts</div>`;
      return;
    }

    postsList.innerHTML = filtered.map(p => {
      const isActive = currentPost && currentPost.filename === p.filename;
      return `
        <div class="post-item ${isActive ? "active" : ""}" data-filename="${p.filename}">
          <div class="post-item-date">${escapeHtml(p.date)} · ${p.word_count || 0}w</div>
          <div class="post-item-title">${escapeHtml(p.title)}</div>
          <div class="post-item-desc">${escapeHtml(p.description || "No description")}</div>
        </div>
      `;
    }).join("");

    postsList.querySelectorAll(".post-item").forEach(item => {
      item.addEventListener("click", () => {
        const fn = item.dataset.filename;
        const target = posts.find(p => p.filename === fn);
        if (target) selectPost(target);
      });
    });
  }

  function selectPost(post) {
    currentPost = post;
    editorModeLabel.textContent = "EDITING";
    currentFilenameDisplay.textContent = post.filename;
    btnDeletePost.style.display = "inline-flex";

    postTitle.value = post.title || "";
    postDate.value = post.date || "";
    postDesc.value = post.description || "";
    postTags.value = Array.isArray(post.tags) ? post.tags.join(", ") : (post.tags || "");

    const content = post.content || "";
    if (cmEditor) {
      cmEditor.setValue(content);
      cmEditor.clearHistory();
    } else {
      postMarkdown.value = content;
    }

    triggerPreviewUpdate(true);
    renderPostsList();
  }

  function createNewPost() {
    currentPost = null;
    editorModeLabel.textContent = "NEW POST";
    currentFilenameDisplay.textContent = "untitled.md (draft)";
    btnDeletePost.style.display = "none";

    const today = new Date().toISOString().split("T")[0];
    postTitle.value = "";
    postDate.value = today;
    postDesc.value = "";
    postTags.value = "";
    const defaultContent = "# Hello World\n\nStart writing your thoughts here...\n";

    if (cmEditor) {
      cmEditor.setValue(defaultContent);
      cmEditor.clearHistory();
    } else {
      postMarkdown.value = defaultContent;
    }

    triggerPreviewUpdate(true);
    renderPostsList();
    postTitle.focus();
  }

  // Anti-Flicker Debounced Markdown Preview with scroll retention
  let previewDebounceTimer = null;
  function triggerPreviewUpdate(immediate = false) {
    if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
    if (immediate) {
      renderMarkdownPreview();
    } else {
      previewDebounceTimer = setTimeout(() => {
        requestAnimationFrame(renderMarkdownPreview);
      }, 70);
    }
  }

  function renderMarkdownPreview() {
    const raw = cmEditor ? cmEditor.getValue() : postMarkdown.value;
    const previousScroll = postPreviewRender.scrollTop;
    if (window.marked) {
      postPreviewRender.innerHTML = marked.parse(raw);
    } else {
      postPreviewRender.textContent = raw;
    }
    postPreviewRender.scrollTop = previousScroll;
  }

  postMarkdown.addEventListener("input", () => triggerPreviewUpdate(false));
  postSearch.addEventListener("input", renderPostsList);
  btnNewPost.addEventListener("click", createNewPost);

  // Copy Markdown Action
  btnCopyMarkdown.addEventListener("click", async () => {
    const text = cmEditor ? cmEditor.getValue() : postMarkdown.value;
    if (!text) {
      showToast("⚠️ Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("✓ Markdown copied to clipboard!");
    } catch (e) {
      if (cmEditor) {
        cmEditor.execCommand("selectAll");
      } else {
        postMarkdown.select();
      }
      document.execCommand("copy");
      showToast("✓ Markdown copied!");
    }
  });

  // Keyboard shortcut Ctrl+S
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      savePost();
    }
  });

  async function savePost() {
    const title = postTitle.value.trim();
    if (!title) {
      showToast("⚠️ Title is required!");
      postTitle.focus();
      return;
    }

    const payload = {
      filename: currentPost ? currentPost.filename : null,
      title: title,
      date: postDate.value || new Date().toISOString().split("T")[0],
      description: postDesc.value.trim(),
      tags: postTags.value.split(",").map(t => t.trim()).filter(Boolean),
      content: cmEditor ? cmEditor.getValue() : postMarkdown.value
    };

    btnSavePost.disabled = true;
    btnSavePost.textContent = "Saving...";

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Post saved & site rebuilt!");
        currentPost = data;
        await loadPosts();
        selectPost(data);
        fetchStatus();
      } else {
        showToast("❌ Error: " + (data.error || "Failed to save"));
      }
    } catch (e) {
      showToast("❌ Network error saving post");
    } finally {
      btnSavePost.disabled = false;
      btnSavePost.textContent = "💾 Save & Build";
    }
  }

  btnSavePost.addEventListener("click", savePost);

  btnDeletePost.addEventListener("click", async () => {
    if (!currentPost) return;
    if (!confirm(`Are you sure you want to delete '${currentPost.title}' (${currentPost.filename})?`)) return;

    try {
      const res = await fetch(`/api/posts/${currentPost.filename}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Deleted post");
        currentPost = null;
        await loadPosts();
        createNewPost();
        fetchStatus();
      }
    } catch (e) {
      showToast("❌ Failed to delete post");
    }
  });



  // ================= BOOKS (READING LOG) =================
  async function loadBooks() {
    try {
      const res = await fetch("/api/books");
      books = await res.json();
      renderBooks();
    } catch (e) {
      booksGrid.innerHTML = `<div class="loading-state">Failed to load reading log</div>`;
    }
  }

  function renderBooks() {
    const q = (bookSearch.value || "").toLowerCase().trim();

    let readingCount = 0;
    let finishedCount = 0;

    books.forEach(b => {
      if (b.status === "Reading") readingCount++;
      else finishedCount++;
    });

    statReading.textContent = readingCount;
    statFinished.textContent = finishedCount;

    const filtered = books.map((b, idx) => ({ ...b, originalIndex: idx })).filter(b => {
      const matchQuery = b.title.toLowerCase().includes(q) ||
                         (b.author && b.author.toLowerCase().includes(q)) ||
                         (b.genre && b.genre.toLowerCase().includes(q));
      const matchStatus = currentBookFilter === "ALL" || b.status === currentBookFilter;
      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      booksGrid.innerHTML = `<div class="loading-state">No books match filter</div>`;
      return;
    }

    booksGrid.innerHTML = filtered.map(b => {
      const isReading = b.status === "Reading";
      const statusBadge = isReading
        ? `<span class="book-badge reading">[reading]</span>`
        : `<span class="book-badge read">[${escapeHtml(b.rating || "read")}]</span>`;

      return `
        <div class="book-card">
          <div>
            <div class="book-card-top">
              <span class="book-card-title">${escapeHtml(b.title)}</span>
              ${statusBadge}
            </div>
            <div class="book-card-author">by ${escapeHtml(b.author || "Unknown")} ${b.genre ? `· ${escapeHtml(b.genre)}` : ""}</div>
            ${b.quote ? `<div class="book-card-quote">“${escapeHtml(b.quote)}”</div>` : ""}
            ${b.notes ? `<div class="book-card-notes">${escapeHtml(b.notes)}</div>` : ""}
          </div>
          <div class="book-card-footer">
            <span class="book-meta">${b.year_read ? `Year: ${b.year_read}` : ""}</span>
            <div class="book-actions">
              <button class="btn btn-xs btn-secondary btn-edit-book" data-index="${b.originalIndex}">Edit</button>
              <button class="btn btn-xs btn-danger btn-del-book" data-index="${b.originalIndex}">✕</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    booksGrid.querySelectorAll(".btn-edit-book").forEach(btn => {
      btn.addEventListener("click", () => openBookModal(parseInt(btn.dataset.index, 10)));
    });

    booksGrid.querySelectorAll(".btn-del-book").forEach(btn => {
      btn.addEventListener("click", () => deleteBook(parseInt(btn.dataset.index, 10)));
    });
  }

  bookSearch.addEventListener("input", renderBooks);

  bookStatusButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      bookStatusButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentBookFilter = btn.dataset.status;
      renderBooks();
    });
  });

  function openBookModal(index = null) {
    if (index !== null && books[index]) {
      const b = books[index];
      modalBookTitle.textContent = "Edit Book";
      bookEditIndex.value = index;
      modalBookName.value = b.title || "";
      modalBookAuthor.value = b.author || "";
      modalBookGenre.value = b.genre || "";
      modalBookStatus.value = b.status || "Read";
      modalBookRating.value = b.rating || "";
      modalBookYear.value = b.year_read || new Date().getFullYear();
      modalBookNotes.value = b.notes || "";
      modalBookQuote.value = b.quote || "";
    } else {
      modalBookTitle.textContent = "Log New Book";
      bookEditIndex.value = "";
      modalBookName.value = "";
      modalBookAuthor.value = "";
      modalBookGenre.value = "";
      modalBookStatus.value = "Reading";
      modalBookRating.value = "";
      modalBookYear.value = new Date().getFullYear();
      modalBookNotes.value = "";
      modalBookQuote.value = "";
    }
    bookModal.classList.add("open");
    modalBookName.focus();
  }

  function closeBookModal() {
    bookModal.classList.remove("open");
  }

  btnAddBook.addEventListener("click", () => openBookModal(null));
  btnCancelBook.addEventListener("click", closeBookModal);
  btnCloseBookModal.addEventListener("click", closeBookModal);

  btnSaveBookSubmit.addEventListener("click", async () => {
    const title = modalBookName.value.trim();
    if (!title) {
      showToast("⚠️ Title is required");
      modalBookName.focus();
      return;
    }
    const editIdx = bookEditIndex.value !== "" ? parseInt(bookEditIndex.value, 10) : null;
    const payload = {
      index: editIdx,
      title: title,
      author: modalBookAuthor.value.trim(),
      genre: modalBookGenre.value.trim(),
      status: modalBookStatus.value,
      rating: modalBookRating.value.trim(),
      year_read: modalBookYear.value ? parseInt(modalBookYear.value, 10) : new Date().getFullYear(),
      notes: modalBookNotes.value.trim(),
      quote: modalBookQuote.value.trim()
    };

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Reading log updated & rebuilt!");
        closeBookModal();
        await loadBooks();
        fetchStatus();
      }
    } catch (e) {
      showToast("❌ Failed to save book");
    }
  });

  async function deleteBook(index) {
    const target = books[index];
    if (!target) return;
    if (!confirm(`Remove '${target.title}' from reading log?`)) return;

    try {
      const res = await fetch(`/api/books/${index}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("✓ Removed book");
        await loadBooks();
        fetchStatus();
      }
    } catch (e) {
      showToast("❌ Failed to delete book");
    }
  }

  // ================= BUILD & PREVIEW =================
  async function triggerBuild() {
    buildConsole.textContent = "Running build.py ...\n";
    try {
      const res = await fetch("/api/build", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        buildConsole.textContent += "[✓] " + data.message + "\n";
        showToast("✓ Site built successfully!");
        refreshFrame();
        fetchStatus();
      } else {
        buildConsole.textContent += "[!] Error: " + data.error + "\n";
        showToast("❌ Build failed!");
      }
    } catch (e) {
      buildConsole.textContent += "[!] Network error running build.\n";
    }
  }

  btnRunBuild.addEventListener("click", triggerBuild);
  btnQuickBuild.addEventListener("click", triggerBuild);

  async function toggleServer() {
    try {
      const res = await fetch("/api/preview/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: previewPort })
      });
      const data = await res.json();
      buildConsole.textContent += `[i] ${data.message}\n`;
      await fetchStatus();
      if (data.running) {
        showToast("✓ Preview server started!");
      } else {
        showToast("Preview server stopped");
      }
    } catch (e) {
      showToast("❌ Failed to toggle preview server");
    }
  }

  btnToggleServer.addEventListener("click", toggleServer);
  btnStartPreviewDirect.addEventListener("click", toggleServer);
  btnQuickPreview.addEventListener("click", async () => {
    const previewTab = document.querySelector('.nav-tab[data-tab="tab-preview"]');
    if (previewTab) previewTab.click();
    if (!previewRunning) {
      await toggleServer();
    }
  });

  function refreshFrame() {
    if (previewRunning && previewIframe) {
      previewIframe.src = `http://localhost:${previewPort}?t=${Date.now()}`;
    }
  }
  btnRefreshFrame.addEventListener("click", refreshFrame);

  btnOpenBrowser.addEventListener("click", () => {
    window.open(`http://localhost:${previewPort}`, "_blank");
  });

  // ================= GIT & DEPLOY =================
  async function fetchGitStatus() {
    try {
      const res = await fetch("/api/git/status");
      const data = await res.json();

      gitDirtyBadge.className = data.clean ? "badge-clean" : "badge-dirty";
      gitDirtyBadge.textContent = data.clean ? "Clean" : "Modified";

      if (data.clean) {
        gitChangesList.innerHTML = `<p class="text-muted">Working tree clean. No uncommitted changes.</p>`;
      } else {
        gitChangesList.innerHTML = data.changes.map(c => `
          <div class="change-item">${escapeHtml(c)}</div>
        `).join("");
      }

      if (data.recent_commits && data.recent_commits.length > 0) {
        gitRecentCommits.innerHTML = data.recent_commits.map(c => `
          <li>${escapeHtml(c)}</li>
        `).join("");
      } else {
        gitRecentCommits.innerHTML = `<li>No commits found</li>`;
      }
    } catch (e) {
      gitConsole.textContent = "Failed to fetch git status.";
    }
  }

  async function pushToGit() {
    const msg = gitCommitMsg.value.trim() || "docs: update content";
    btnDoPush.disabled = true;
    btnDoPush.textContent = "Committing & Pushing...";
    gitConsole.textContent = `[*] git add .\n[*] git commit -m "${msg}"\n[*] git push origin main ...\n`;

    try {
      const res = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data.success) {
        gitConsole.textContent += `\n[✓] ${data.message}\n${data.commit_output || ""}\n${data.push_output || ""}`;
        showToast("🚀 Pushed to GitHub Pages!");
        gitCommitMsg.value = "";
        await fetchGitStatus();
        fetchStatus();
      } else {
        gitConsole.textContent += `\n[!] Git Error:\n${data.error || "Failed"}`;
        showToast("❌ Git push failed!");
      }
    } catch (e) {
      gitConsole.textContent += "\n[!] Network error executing git push.";
    } finally {
      btnDoPush.disabled = false;
      btnDoPush.textContent = "🚀 Commit & Push to GitHub Pages";
    }
  }

  btnDoPush.addEventListener("click", pushToGit);
  btnQuickPush.addEventListener("click", () => {
    const gitTab = document.querySelector('.nav-tab[data-tab="tab-git"]');
    if (gitTab) gitTab.click();
  });

  // Utility: HTML escaping
  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
  }

  // Initialize
  fetchStatus();
  loadPosts();
  loadBooks();
  setInterval(fetchStatus, 8000);
});
