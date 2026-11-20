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

  const $ = (id) => document.getElementById(id);

  // DOM Elements - Theme / Nav
  const htmlRoot = document.documentElement;
  const btnThemeToggle = $("btn-theme-toggle");
  const btnQuickBuild = $("btn-quick-build");
  const tabs = document.querySelectorAll(".nav-tab");
  const tabPanels = document.querySelectorAll(".tab-panel");

  // DOM Elements - Blog
  const postSearch = $("post-search");
  const btnNewPost = $("btn-new-post");
  const postsList = $("posts-list");
  const btnDeletePost = $("btn-delete-post");
  const btnSavePost = $("btn-save-post");
  const postTitle = $("post-title");
  const postDate = $("post-date");
  const postDesc = $("post-desc");
  const postTags = $("post-tags");
  const postMarkdown = $("post-markdown");
  const postPreviewRender = $("post-preview-render");
  const vimModeDisplay = $("vim-mode-display");

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
      CodeMirror.Vim.defineEx("write", "w", () => savePost());
      CodeMirror.Vim.defineEx("wq", "wq", () => savePost());
      CodeMirror.commands.save = () => savePost();
    }

    // Sync Vim mode to corner indicator
    cmEditor.on("vim-mode-change", (e) => {
      const mode = (e.mode || "normal").toLowerCase();
      vimModeDisplay.textContent = mode.toUpperCase();
      vimModeDisplay.className = "vim-status-indicator";
      if (mode === "insert") vimModeDisplay.classList.add("mode-insert");
      else if (mode === "visual") vimModeDisplay.classList.add("mode-visual");
    });

    cmEditor.on("change", () => triggerPreviewUpdate(false));
  } else if (vimModeDisplay) {
    vimModeDisplay.style.display = "none";
  }

  // DOM Elements - Books
  const bookSearch = $("book-search");
  const bookStatusButtons = document.querySelectorAll("#book-status-control .seg-btn");
  const btnAddBook = $("btn-add-book");
  const booksGrid = $("books-grid");

  // DOM Elements - Book Modal
  const bookModal = $("book-modal");
  const modalBookTitle = $("modal-book-title");
  const bookEditIndex = $("book-edit-index");
  const modalBookName = $("modal-book-name");
  const modalBookAuthor = $("modal-book-author");
  const modalBookGenre = $("modal-book-genre");
  const modalBookStatus = $("modal-book-status");
  const modalBookRating = $("modal-book-rating");
  const modalBookYear = $("modal-book-year");
  const modalBookNotes = $("modal-book-notes");
  const modalBookQuote = $("modal-book-quote");
  const btnCancelBook = $("btn-cancel-book");
  const btnCloseBookModal = $("btn-close-book-modal");
  const btnSaveBookSubmit = $("btn-save-book-submit");
  const btnDeleteBook = $("btn-delete-book");

  // DOM Elements - Deploy (Preview + Git)
  const btnToggleServer = $("btn-toggle-server");
  const btnOpenBrowser = $("btn-open-browser");
  const previewIframe = $("preview-iframe");
  const previewPlaceholder = $("preview-placeholder");
  const btnStartPreviewDirect = $("btn-start-preview-direct");
  const btnRefreshFrame = $("btn-refresh-frame");
  const gitDirtyBadge = $("git-dirty-badge");
  const gitChangesList = $("git-changes-list");
  const gitCommitMsg = $("git-commit-msg");
  const btnDoPush = $("btn-do-push");
  const errorBox = $("error-box");
  const errorText = $("error-text");
  const btnCloseError = $("btn-close-error");

  // Toast
  const toast = $("toast");
  let toastTimer = null;
  function showToast(message, duration = 2400) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
  }

  // Error box (Deploy tab) - only visible when something fails
  function showError(text) {
    errorText.textContent = text;
    errorBox.style.display = "block";
  }
  function clearError() {
    errorText.textContent = "";
    errorBox.style.display = "none";
  }
  btnCloseError.addEventListener("click", clearError);

  // ================= THEME TOGGLE =================
  const savedTheme = localStorage.getItem("astryx-theme") || "light";
  htmlRoot.setAttribute("data-theme", savedTheme);

  btnThemeToggle.addEventListener("click", () => {
    const currentTheme = htmlRoot.getAttribute("data-theme") || "light";
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    htmlRoot.setAttribute("data-theme", nextTheme);
    localStorage.setItem("astryx-theme", nextTheme);
  });

  // ================= TAB NAVIGATION =================
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.tab;
      if (tab.classList.contains("active")) return;

      tabs.forEach(t => t.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPanel = $(targetId);
      if (targetPanel) targetPanel.classList.add("active");

      if (targetId === "tab-blog" && cmEditor) {
        setTimeout(() => cmEditor.refresh(), 50);
      }
      if (targetId === "tab-deploy") {
        fetchGitStatus();
      }
    });
  });

  // ================= SYSTEM STATUS (Selective diff to prevent flicker) =================
  async function fetchStatus() {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();

      const currentHash = `${data.preview_running}_${data.preview_port}`;
      if (currentHash === lastStatusHash) return;
      lastStatusHash = currentHash;

      previewRunning = data.preview_running;
      previewPort = data.preview_port;

      if (data.preview_running) {
        btnToggleServer.textContent = "Stop server";
        btnToggleServer.className = "btn btn-xs btn-danger";
        btnOpenBrowser.style.display = "inline-flex";
        previewPlaceholder.style.display = "none";
        if (previewIframe.src === "about:blank" || !previewIframe.src) {
          previewIframe.src = data.preview_url;
        }
      } else {
        btnToggleServer.textContent = "Start server";
        btnToggleServer.className = "btn btn-xs btn-primary";
        btnOpenBrowser.style.display = "none";
        previewPlaceholder.style.display = "flex";
      }
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
      postsList.innerHTML = `<div class="loading-state">No posts</div>`;
      return;
    }

    postsList.innerHTML = filtered.map(p => {
      const isActive = currentPost && currentPost.filename === p.filename;
      return `
        <div class="post-item ${isActive ? "active" : ""}" data-filename="${p.filename}">
          <div class="post-item-title">${escapeHtml(p.title)}</div>
          <div class="post-item-date">${escapeHtml(p.date)}</div>
        </div>
      `;
    }).join("");

    postsList.querySelectorAll(".post-item").forEach(item => {
      item.addEventListener("click", () => {
        const target = posts.find(p => p.filename === item.dataset.filename);
        if (target) selectPost(target);
      });
    });
  }

  function setEditorContent(content) {
    if (cmEditor) {
      cmEditor.setValue(content);
      cmEditor.clearHistory();
    } else {
      postMarkdown.value = content;
    }
  }

  function selectPost(post) {
    currentPost = post;
    btnDeletePost.style.display = "inline-flex";

    postTitle.value = post.title || "";
    postDate.value = post.date || "";
    postDesc.value = post.description || "";
    postTags.value = Array.isArray(post.tags) ? post.tags.join(", ") : (post.tags || "");
    setEditorContent(post.content || "");

    triggerPreviewUpdate(true);
    renderPostsList();
  }

  function createNewPost() {
    currentPost = null;
    btnDeletePost.style.display = "none";

    postTitle.value = "";
    postDate.value = new Date().toISOString().split("T")[0];
    postDesc.value = "";
    postTags.value = "";
    setEditorContent("# Hello World\n\nStart writing your thoughts here...\n");

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
      showToast("Title is required");
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
    btnSavePost.textContent = "Saving…";

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast("Saved");
        currentPost = data;
        await loadPosts();
        selectPost(data);
      } else {
        showToast("Error: " + (data.error || "Failed to save"));
      }
    } catch (e) {
      showToast("Network error");
    } finally {
      btnSavePost.disabled = false;
      btnSavePost.textContent = "Save";
    }
  }

  btnSavePost.addEventListener("click", savePost);

  btnDeletePost.addEventListener("click", async () => {
    if (!currentPost) return;
    if (!confirm(`Delete '${currentPost.title}'?`)) return;

    try {
      const res = await fetch(`/api/posts/${currentPost.filename}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Deleted");
        currentPost = null;
        await loadPosts();
        createNewPost();
      }
    } catch (e) {
      showToast("Failed to delete");
    }
  });

  // ================= BOOKS (READING LOG) =================
  async function loadBooks() {
    try {
      const res = await fetch("/api/books");
      books = await res.json();
      renderBooks();
    } catch (e) {
      booksGrid.innerHTML = `<div class="loading-state">Failed to load books</div>`;
    }
  }

  function renderBooks() {
    const q = (bookSearch.value || "").toLowerCase().trim();

    const filtered = books.map((b, idx) => ({ ...b, originalIndex: idx })).filter(b => {
      const matchQuery = b.title.toLowerCase().includes(q) ||
                         (b.author && b.author.toLowerCase().includes(q)) ||
                         (b.genre && b.genre.toLowerCase().includes(q));
      const matchStatus = currentBookFilter === "ALL" || b.status === currentBookFilter;
      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      booksGrid.innerHTML = `<div class="loading-state">No books</div>`;
      return;
    }

    booksGrid.innerHTML = filtered.map(b => {
      const isReading = b.status === "Reading";
      const statusBadge = isReading
        ? `<span class="book-badge reading">reading</span>`
        : `<span class="book-badge read">${escapeHtml(b.rating || "read")}</span>`;
      const meta = [b.author || "Unknown", b.genre, b.year_read]
        .filter(Boolean).map(v => escapeHtml(String(v))).join(" · ");

      return `
        <div class="book-card" data-index="${b.originalIndex}">
          <div class="book-card-top">
            <span class="book-card-title">${escapeHtml(b.title)}</span>
            ${statusBadge}
          </div>
          <div class="book-card-author">${meta}</div>
          ${b.quote ? `<div class="book-card-quote">“${escapeHtml(b.quote)}”</div>` : ""}
          ${b.notes ? `<div class="book-card-notes">${escapeHtml(b.notes)}</div>` : ""}
        </div>
      `;
    }).join("");

    booksGrid.querySelectorAll(".book-card").forEach(card => {
      card.addEventListener("click", () => openBookModal(parseInt(card.dataset.index, 10)));
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
    const b = index !== null ? books[index] : null;
    modalBookTitle.textContent = b ? "Edit Book" : "Add Book";
    bookEditIndex.value = b ? index : "";
    modalBookName.value = b ? (b.title || "") : "";
    modalBookAuthor.value = b ? (b.author || "") : "";
    modalBookGenre.value = b ? (b.genre || "") : "";
    modalBookStatus.value = b ? (b.status || "Read") : "Reading";
    modalBookRating.value = b ? (b.rating || "") : "";
    modalBookYear.value = (b && b.year_read) || new Date().getFullYear();
    modalBookNotes.value = b ? (b.notes || "") : "";
    modalBookQuote.value = b ? (b.quote || "") : "";
    btnDeleteBook.style.display = b ? "inline-flex" : "none";
    bookModal.classList.add("open");
    modalBookName.focus();
  }

  function closeBookModal() {
    bookModal.classList.remove("open");
  }

  btnAddBook.addEventListener("click", () => openBookModal(null));
  btnCancelBook.addEventListener("click", closeBookModal);
  btnCloseBookModal.addEventListener("click", closeBookModal);

  btnDeleteBook.addEventListener("click", async () => {
    if (bookEditIndex.value === "") return;
    const deleted = await deleteBook(parseInt(bookEditIndex.value, 10));
    if (deleted) closeBookModal();
  });

  btnSaveBookSubmit.addEventListener("click", async () => {
    const title = modalBookName.value.trim();
    if (!title) {
      showToast("Title is required");
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
        showToast("Saved");
        closeBookModal();
        await loadBooks();
      }
    } catch (e) {
      showToast("Failed to save book");
    }
  });

  async function deleteBook(index) {
    const target = books[index];
    if (!target) return false;
    if (!confirm(`Remove '${target.title}'?`)) return false;

    try {
      const res = await fetch(`/api/books/${index}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast("Removed");
        await loadBooks();
        return true;
      }
    } catch (e) {
      showToast("Failed to delete book");
    }
    return false;
  }

  // ================= BUILD & PREVIEW =================
  async function triggerBuild() {
    btnQuickBuild.disabled = true;
    try {
      const res = await fetch("/api/build", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("Built");
        refreshFrame();
      } else {
        showError("Build failed:\n" + (data.error || "Unknown error"));
        showToast("Build failed — see Deploy tab");
      }
    } catch (e) {
      showError("Network error running build.");
      showToast("Build failed — see Deploy tab");
    } finally {
      btnQuickBuild.disabled = false;
    }
  }

  btnQuickBuild.addEventListener("click", triggerBuild);

  async function toggleServer() {
    try {
      const res = await fetch("/api/preview/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ port: previewPort })
      });
      await res.json();
      await fetchStatus();
    } catch (e) {
      showError("Failed to toggle preview server.");
    }
  }

  btnToggleServer.addEventListener("click", toggleServer);
  btnStartPreviewDirect.addEventListener("click", toggleServer);

  function refreshFrame() {
    if (previewRunning && previewIframe) {
      previewIframe.src = `http://localhost:${previewPort}?t=${Date.now()}`;
    }
  }
  btnRefreshFrame.addEventListener("click", refreshFrame);

  btnOpenBrowser.addEventListener("click", () => {
    window.open(`http://localhost:${previewPort}`, "_blank");
  });

  // ================= GIT =================
  async function fetchGitStatus() {
    try {
      const res = await fetch("/api/git/status");
      const data = await res.json();

      gitDirtyBadge.className = data.clean ? "badge-clean" : "badge-dirty";
      gitDirtyBadge.textContent = data.clean ? "Clean" : "Modified";

      if (data.clean) {
        gitChangesList.innerHTML = `<p class="text-muted">No changes.</p>`;
      } else {
        gitChangesList.innerHTML = data.changes.map(c => `
          <div class="change-item">${escapeHtml(c)}</div>
        `).join("");
      }
    } catch (e) {
      showError("Failed to fetch git status.");
    }
  }

  async function pushToGit() {
    const msg = gitCommitMsg.value.trim() || "docs: update content";
    btnDoPush.disabled = true;
    btnDoPush.textContent = "Pushing…";
    clearError();

    try {
      const res = await fetch("/api/git/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Pushed");
        gitCommitMsg.value = "";
        await fetchGitStatus();
      } else {
        showError(data.error || "Push failed");
        showToast("Push failed");
      }
    } catch (e) {
      showError("Network error executing git push.");
    } finally {
      btnDoPush.disabled = false;
      btnDoPush.textContent = "Commit & Push";
    }
  }

  btnDoPush.addEventListener("click", pushToGit);

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
