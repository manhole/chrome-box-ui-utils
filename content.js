(() => {
  const SEPARATOR = " > ";
  let currentUrl = "";
  let bar = null;
  let breadcrumbObserver = null;
  let currentBreadcrumbEl = null;

  function getFolderId() {
    const m = location.pathname.match(/\/folder\/(\d+)/);
    return m ? m[1] : null;
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function debounce(ms, fn) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  async function scrapeFullBreadcrumb() {
    const container = document.querySelector(".ItemListBreadcrumb");
    if (!container) return null;

    const parts = [];
    const seenTexts = new Set();

    // Step 1: Get hidden parent folders from the overflow dropdown
    // The menu items are rendered as a portal only while the dropdown is
    // open, so we click the button, scrape, then close.
    const overflowBtn = container.querySelector(
      ".ItemListBreadcrumbOverflow-menuButton",
    );
    if (overflowBtn) {
      // Hide the dropdown so the user doesn't see it flash open
      const hideStyle = document.createElement("style");
      hideStyle.textContent =
        '[role="menu"], [class*="DropdownMenu-content"], [class*="accessible-menu"] ' +
        "{ visibility: hidden !important; }";
      document.head.appendChild(hideStyle);

      try {
        overflowBtn.click();
        await sleep(300);

        const menu = document.querySelector(
          '[role="menu"], [class*="accessible-menu"], [class*="DropdownMenu-content"]',
        );
        if (menu) {
          const menuItems = menu.querySelectorAll("a, [role='menuitem']");
          for (const item of menuItems) {
            const href = item.closest("a")?.getAttribute("href") || "";
            if (/\/folder\/0\b/.test(href)) continue;
            const text = item.textContent.trim();
            if (text && !seenTexts.has(text)) {
              seenTexts.add(text);
              parts.push(text);
            }
          }
        }

        overflowBtn.click();
        await sleep(100);
      } finally {
        hideStyle.remove();
      }
    }

    // Step 2: Get visible breadcrumb items from the ordered list
    const list = container.querySelector("ol");
    if (list) {
      const listItems = list.querySelectorAll("li");

      for (const li of listItems) {
        // Skip root folder link (/folder/0)
        const link = li.querySelector("a[href]");
        if (link && /\/folder\/0\b/.test(link.getAttribute("href"))) continue;

        // Try child element first, fall back to li's own text
        const el = li.querySelector("a, span, button");
        const text = (el ? el.textContent : li.textContent).trim();
        if (!text || seenTexts.has(text)) continue;
        if (/^[.…>\/|]+$/.test(text)) continue;
        seenTexts.add(text);
        parts.push(text);
      }
    }

    // Step 3: Ensure the current folder name is included
    const currentName = getCurrentFolderName();
    if (currentName && parts[parts.length - 1] !== currentName) {
      parts.push(currentName);
    }

    return parts.length > 0 ? parts : null;
  }

  function getCurrentFolderName() {
    const heading = document.querySelector(
      "h1, [class*='HeaderTitle'], [class*='ItemListHeader'] [class*='name']",
    );
    if (heading) {
      const text = heading.textContent.trim();
      if (text) return text;
    }
    const m = document.title.match(/^(.+?)\s*[-–—]\s/);
    return m ? m[1].trim() : null;
  }

  // --- Observer-based breadcrumb tracking ---

  const onBreadcrumbMutation = debounce(150, () => {
    if (!getFolderId()) {
      removeBar();
      return;
    }
    scrapeFullBreadcrumb().then((path) => {
      if (!path) return;
      const currentName = getCurrentFolderName();
      const lastPart = path[path.length - 1];
      if (!currentName || lastPart === currentName) {
        renderBar(path);
      }
    });
  });

  function setupObserver() {
    const container = document.querySelector(".ItemListBreadcrumb");

    if (!container) {
      // Breadcrumb not in DOM yet — teardown and wait for next poll
      teardownObserver();
      removeBar();
      return;
    }

    // Already observing this exact element
    if (container === currentBreadcrumbEl) return;

    // New or replaced element — (re)setup observer
    teardownObserver();
    currentBreadcrumbEl = container;
    breadcrumbObserver = new MutationObserver(onBreadcrumbMutation);
    breadcrumbObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial scrape
    onBreadcrumbMutation();
  }

  function teardownObserver() {
    if (breadcrumbObserver) {
      breadcrumbObserver.disconnect();
      breadcrumbObserver = null;
    }
    currentBreadcrumbEl = null;
  }

  function checkUrl() {
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      if (!getFolderId()) {
        teardownObserver();
        removeBar();
        return;
      }
    }
    // Ensure observer is attached (handles initial load + element replacement)
    if (getFolderId()) {
      setupObserver();
    }
  }

  // --- UI ---

  function createBar() {
    const el = document.createElement("div");
    el.id = "box-path-copier-bar";

    const text = document.createElement("span");
    text.className = "box-path-copier-text";

    const btn = document.createElement("button");
    btn.className = "box-path-copier-btn";
    btn.title = "Copy path";
    // Two overlapping icons toggled via CSS:
    // icon-copy: two overlapping rectangles (clipboard copy symbol)
    // icon-done: checkmark shown after successful copy
    btn.innerHTML =
      '<svg class="icon-copy" width="18" height="18" viewBox="0 0 16 16" fill="none">' +
      '<rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" stroke-width="1.5"/>' +
      "</svg>" +
      '<svg class="icon-done" width="18" height="18" viewBox="0 0 16 16" fill="none">' +
      '<path d="M3 8l4 4 6-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      "</svg>";

    btn.addEventListener("click", copyPath);

    el.appendChild(text);
    el.appendChild(btn);
    return el;
  }

  function renderBar(pathParts) {
    const breadcrumb = document.querySelector(".ItemListBreadcrumb");
    if (!breadcrumb) return;

    // Re-create if the bar was removed by Box's re-render
    if (!bar || !bar.isConnected) {
      bar?.remove();
      bar = createBar();
      breadcrumb.parentElement.insertBefore(bar, breadcrumb.nextSibling);
    }

    const pathStr = pathParts.join(SEPARATOR);
    const textEl = bar.querySelector(".box-path-copier-text");
    textEl.textContent = pathStr;
    bar.dataset.path = pathStr;
  }

  function removeBar() {
    if (bar) {
      bar.remove();
      bar = null;
    }
  }

  async function copyPath() {
    const pathStr = bar?.dataset.path;
    if (!pathStr) return;

    try {
      await navigator.clipboard.writeText(pathStr);
      const btn = bar.querySelector(".box-path-copier-btn");
      btn.classList.add("is-copied");
      setTimeout(() => btn.classList.remove("is-copied"), 1500);
    } catch (e) {
      console.error("Box UI Utils: copy failed:", e);
    }
  }

  // --- Bootstrap ---

  function start() {
    checkUrl();
    // Lightweight poll: URL change detection + observer setup
    setInterval(checkUrl, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
