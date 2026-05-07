(() => {
  "use strict";

  const MAX_PAGES = 50;
  const STORAGE_KEYS = {
    pages: "markdownCollector.pages",
    settings: "markdownCollector.settings"
  };
  const DEFAULT_SETTINGS = {
    frontmatter: true,
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    defaultExport: "markdown",
    theme: "dark"
  };
  const RESTRICTED_SCHEMES = [
    "chrome://",
    "edge://",
    "about:",
    "view-source:",
    "devtools://",
    "chrome-extension://"
  ];

  const state = {
    pages: [],
    settings: { ...DEFAULT_SETTINGS },
    view: "workspace",
    activePanel: "pages",
    currentPageId: null,
    selectedIds: new Set(),
    editMode: false,
    draggingId: null
  };

  const $ = (selector) => document.querySelector(selector);
  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();
    await loadState();
    render();
    syncBadge();
  }

  function cacheElements() {
    Object.assign(elements, {
      app: $("#app"),
      headerSubline: $("#headerSubline"),
      themeToggle: $("#themeToggle"),
      themeIcon: $("#themeIcon"),
      settingsButton: $("#settingsButton"),
      captureButton: $("#captureButton"),
      captureLabel: $("#captureLabel"),
      addCustomButton: $("#addCustomButton"),
      workspaceView: $("#workspaceView"),
      pagesTab: $("#pagesTab"),
      combineTab: $("#combineTab"),
      pagesPanel: $("#pagesPanel"),
      combinePanel: $("#combinePanel"),
      emptyState: $("#emptyState"),
      pageList: $("#pageList"),
      combineEmptyState: $("#combineEmptyState"),
      combineSummary: $("#combineSummary"),
      combineList: $("#combineList"),
      selectAllButton: $("#selectAllButton"),
      selectNoneButton: $("#selectNoneButton"),
      copyAllButton: $("#copyAllButton"),
      exportAllMdButton: $("#exportAllMdButton"),
      exportAllPdfButton: $("#exportAllPdfButton"),
      exportZipButton: $("#exportZipButton"),
      detailView: $("#detailView"),
      backButton: $("#backButton"),
      editButton: $("#editButton"),
      saveEditButton: $("#saveEditButton"),
      cancelEditButton: $("#cancelEditButton"),
      detailTitle: $("#detailTitle"),
      detailTitleField: $("#detailTitleField"),
      detailTitleInput: $("#detailTitleInput"),
      detailUrl: $("#detailUrl"),
      detailStats: $("#detailStats"),
      markdownPreview: $("#markdownPreview"),
      markdownEditor: $("#markdownEditor"),
      copyPageButton: $("#copyPageButton"),
      downloadPageButton: $("#downloadPageButton"),
      pdfPageButton: $("#pdfPageButton"),
      settingsView: $("#settingsView"),
      settingsBackButton: $("#settingsBackButton"),
      frontmatterToggle: $("#frontmatterToggle"),
      headingStyleSelect: $("#headingStyleSelect"),
      bulletMarkerSelect: $("#bulletMarkerSelect"),
      codeBlockStyleSelect: $("#codeBlockStyleSelect"),
      defaultExportSelect: $("#defaultExportSelect"),
      clearWorkspaceButton: $("#clearWorkspaceButton"),
      statusText: $("#statusText"),
      limitText: $("#limitText"),
      toastHost: $("#toastHost"),
      confirmOverlay: $("#confirmOverlay"),
      cancelClearButton: $("#cancelClearButton"),
      confirmClearButton: $("#confirmClearButton")
    });
  }

  function bindEvents() {
    window.addEventListener("unhandledrejection", (event) => {
      event.preventDefault();
      toast(event.reason && event.reason.message ? event.reason.message : "Action failed", "error");
    });

    elements.captureButton.addEventListener("click", captureCurrentPage);
    elements.addCustomButton.addEventListener("click", addCustomPage);
    elements.themeToggle.addEventListener("click", toggleTheme);
    elements.settingsButton.addEventListener("click", openSettings);
    elements.settingsBackButton.addEventListener("click", backToWorkspace);
    elements.pagesTab.addEventListener("click", () => switchPanel("pages"));
    elements.combineTab.addEventListener("click", () => switchPanel("combine"));
    elements.backButton.addEventListener("click", backToWorkspace);
    elements.editButton.addEventListener("click", startEdit);
    elements.saveEditButton.addEventListener("click", saveEdit);
    elements.cancelEditButton.addEventListener("click", cancelEdit);
    elements.copyPageButton.addEventListener("click", copyCurrentPage);
    elements.downloadPageButton.addEventListener("click", downloadCurrentPage);
    elements.pdfPageButton.addEventListener("click", exportCurrentPagePdf);
    elements.selectAllButton.addEventListener("click", selectAllPages);
    elements.selectNoneButton.addEventListener("click", selectNoPages);
    elements.copyAllButton.addEventListener("click", copySelectedPages);
    elements.exportAllMdButton.addEventListener("click", exportSelectedMarkdown);
    elements.exportAllPdfButton.addEventListener("click", exportSelectedPdf);
    elements.exportZipButton.addEventListener("click", exportSelectedZip);
    elements.clearWorkspaceButton.addEventListener("click", () => elements.confirmOverlay.classList.remove("hidden"));
    elements.cancelClearButton.addEventListener("click", () => elements.confirmOverlay.classList.add("hidden"));
    elements.confirmClearButton.addEventListener("click", clearWorkspace);

    elements.frontmatterToggle.addEventListener("change", updateSettingsFromForm);
    elements.headingStyleSelect.addEventListener("change", updateSettingsFromForm);
    elements.bulletMarkerSelect.addEventListener("change", updateSettingsFromForm);
    elements.codeBlockStyleSelect.addEventListener("change", updateSettingsFromForm);
    elements.defaultExportSelect.addEventListener("change", updateSettingsFromForm);

    document.addEventListener("keydown", handleKeyboard);
  }

  async function loadState() {
    const stored = await storageGet([STORAGE_KEYS.pages, STORAGE_KEYS.settings]);
    const pages = Array.isArray(stored[STORAGE_KEYS.pages]) ? stored[STORAGE_KEYS.pages] : [];
    state.pages = pages.filter(isValidPage).slice(0, MAX_PAGES);
    state.settings = { ...DEFAULT_SETTINGS, ...(stored[STORAGE_KEYS.settings] || {}) };
    state.selectedIds = new Set(state.pages.map((page) => page.id));
  }

  function render() {
    document.documentElement.dataset.theme = state.settings.theme;
    elements.workspaceView.classList.toggle("hidden", state.view !== "workspace");
    elements.detailView.classList.toggle("hidden", state.view !== "detail");
    elements.settingsView.classList.toggle("hidden", state.view !== "settings");
    elements.themeIcon.textContent = state.settings.theme === "dark" ? "☾" : "☀";
    elements.headerSubline.textContent = state.view === "workspace" ? `${state.pages.length} page${state.pages.length === 1 ? "" : "s"} collected` : "Local workspace";
    renderTabs();
    renderPages();
    renderCombine();
    renderDetail();
    renderSettings();
    renderStatus();
  }

  function renderTabs() {
    const isPages = state.activePanel === "pages";
    elements.pagesTab.classList.toggle("is-active", isPages);
    elements.combineTab.classList.toggle("is-active", !isPages);
    elements.pagesTab.setAttribute("aria-selected", String(isPages));
    elements.combineTab.setAttribute("aria-selected", String(!isPages));
    elements.pagesPanel.classList.toggle("hidden", !isPages);
    elements.combinePanel.classList.toggle("hidden", isPages);
  }

  function renderPages() {
    elements.pageList.textContent = "";
    elements.emptyState.classList.toggle("hidden", state.pages.length > 0);

    for (const page of state.pages) {
      const item = document.createElement("li");
      item.className = "page-card";
      item.draggable = true;
      item.tabIndex = 0;
      item.dataset.id = page.id;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Open ${page.title}`);

      const icon = document.createElement("span");
      icon.className = "card-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "M";

      const body = document.createElement("div");
      body.className = "card-body";

      const title = document.createElement("p");
      title.className = "card-title";
      const titleText = document.createElement("span");
      titleText.textContent = page.title || "Untitled page";
      title.append(titleText);

      const url = document.createElement("p");
      url.className = "card-url";
      url.textContent = displayUrl(page.url);

      const meta = document.createElement("p");
      meta.className = "card-meta";
      meta.textContent = `${relativeTime(page.timestamp)} · ${formatBytes(byteLength(page.markdown))}`;

      const preview = document.createElement("p");
      preview.className = "card-preview";
      preview.textContent = snippet(page.markdown);

      body.append(title, url, meta, preview);

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const edit = document.createElement("button");
      edit.className = "card-action";
      edit.type = "button";
      edit.title = "Edit page";
      edit.setAttribute("aria-label", `Edit ${page.title}`);
      edit.textContent = "✎";
      edit.addEventListener("click", (event) => {
        event.stopPropagation();
        openDetail(page.id, true);
      });

      const remove = document.createElement("button");
      remove.className = "card-action remove";
      remove.type = "button";
      remove.title = "Remove page";
      remove.setAttribute("aria-label", `Remove ${page.title}`);
      remove.textContent = "×";
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        removePage(page.id);
      });

      actions.append(edit, remove);
      item.append(icon, body, actions);

      item.addEventListener("click", () => openDetail(page.id, false));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetail(page.id, false);
        }
      });
      item.addEventListener("dragstart", handleDragStart);
      item.addEventListener("dragover", handleDragOver);
      item.addEventListener("dragleave", clearDropMarkers);
      item.addEventListener("drop", handleDrop);
      item.addEventListener("dragend", handleDragEnd);

      elements.pageList.append(item);
    }
  }

  function renderCombine() {
    const selectedCount = getSelectedPages().length;
    elements.combineSummary.textContent = `${selectedCount} selected`;
    elements.combineList.textContent = "";
    elements.combineEmptyState.classList.toggle("hidden", state.pages.length > 0);

    for (const page of state.pages) {
      const item = document.createElement("li");
      item.className = "combine-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state.selectedIds.has(page.id);
      checkbox.setAttribute("aria-label", `Include ${page.title}`);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.selectedIds.add(page.id);
        } else {
          state.selectedIds.delete(page.id);
        }
        renderCombine();
      });

      const title = document.createElement("div");
      title.className = "combine-title";
      title.textContent = page.title || "Untitled page";

      const size = document.createElement("div");
      size.className = "combine-size";
      size.textContent = formatBytes(byteLength(page.markdown));

      item.append(checkbox, title, size);
      elements.combineList.append(item);
    }

    const hasSelection = selectedCount > 0;
    elements.copyAllButton.disabled = !hasSelection;
    elements.exportAllMdButton.disabled = !hasSelection;
    elements.exportAllPdfButton.disabled = !hasSelection;
    elements.exportZipButton.disabled = !hasSelection;
    elements.selectAllButton.disabled = state.pages.length === 0 || selectedCount === state.pages.length;
    elements.selectNoneButton.disabled = selectedCount === 0;
  }

  function renderDetail() {
    const page = currentPage();
    if (!page || state.view !== "detail") {
      return;
    }

    elements.detailTitle.textContent = page.title || "Untitled page";
    elements.detailTitle.classList.toggle("hidden", state.editMode);
    elements.detailTitleField.classList.toggle("hidden", !state.editMode);
    elements.detailUrl.textContent = page.url || "Custom page";
    elements.detailUrl.href = page.url || "#";
    elements.detailUrl.classList.toggle("hidden", state.editMode);
    elements.detailStats.textContent = `${relativeTime(page.timestamp)} · ${formatBytes(byteLength(page.markdown))}`;
    elements.markdownPreview.classList.toggle("hidden", state.editMode);
    elements.markdownEditor.classList.toggle("hidden", !state.editMode);
    elements.editButton.classList.toggle("hidden", state.editMode);
    elements.saveEditButton.classList.toggle("hidden", !state.editMode);
    elements.cancelEditButton.classList.toggle("hidden", !state.editMode);
    elements.copyPageButton.disabled = state.editMode;
    elements.downloadPageButton.disabled = state.editMode;
    elements.pdfPageButton.disabled = state.editMode;

    if (state.editMode) {
      elements.detailTitleInput.value = page.title || "";
      elements.markdownEditor.value = page.markdown || "";
    } else {
      elements.markdownPreview.innerHTML = `<code>${highlightMarkdown(page.markdown || "")}</code>`;
    }
  }

  function renderSettings() {
    elements.frontmatterToggle.checked = Boolean(state.settings.frontmatter);
    elements.headingStyleSelect.value = state.settings.headingStyle;
    elements.bulletMarkerSelect.value = state.settings.bulletListMarker;
    elements.codeBlockStyleSelect.value = state.settings.codeBlockStyle;
    elements.defaultExportSelect.value = state.settings.defaultExport;
  }

  function renderStatus() {
    const total = state.pages.reduce((sum, page) => sum + byteLength(page.markdown), 0);
    elements.statusText.textContent = `Pages: ${state.pages.length} | Total: ${formatBytes(total)}`;
    elements.limitText.textContent = `${MAX_PAGES - state.pages.length} slots left`;
  }

  async function captureCurrentPage() {
    if (state.pages.length >= MAX_PAGES) {
      toast(`Workspace limit reached (${MAX_PAGES} pages). Remove a page before capturing.`, "error");
      return;
    }

    if (!chromeAvailable("tabs") || !chromeAvailable("scripting")) {
      toast("Page capture requires the Chrome extension runtime.", "error");
      return;
    }

    setLoading(true);
    try {
      const [tab] = await chromeTabsQuery({ active: true, currentWindow: true });
      if (!tab || !tab.id || !tab.url) {
        throw new Error("No active tab is available.");
      }
      if (isRestrictedUrl(tab.url)) {
        throw new Error("Chrome blocks extensions from capturing this page.");
      }

      const result = await chromeExecuteScript({
        target: { tabId: tab.id },
        func: extractPageContent
      });
      const data = result && result[0] ? result[0].result : null;
      if (!data || !data.html || !data.text || data.text.trim().length < 12) {
        throw new Error("No readable page content was found.");
      }

      const service = new TurndownService({
        headingStyle: state.settings.headingStyle,
        bulletListMarker: state.settings.bulletListMarker,
        codeBlockStyle: state.settings.codeBlockStyle
      });
      let markdown = normalizeMarkdown(service.turndown(data.html));
      if (!markdown) {
        throw new Error("The page converted to empty Markdown.");
      }

      const title = data.title || tab.title || "Untitled page";
      const url = data.url || tab.url;
      const capturedAt = new Date();
      if (state.settings.frontmatter) {
        markdown = addFrontmatter(markdown, title, url, capturedAt);
      }

      const page = {
        id: createId(),
        title,
        url,
        markdown,
        timestamp: capturedAt.getTime(),
        html: data.html
      };

      state.pages.push(page);
      state.selectedIds.add(page.id);
      state.activePanel = "pages";
      await savePages();
      render();
      syncBadge();
      toast("Page captured");
    } catch (error) {
      toast(error.message || "Unable to capture page.", "error");
    } finally {
      setLoading(false);
    }
  }

  function extractPageContent() {
    const candidates = ["main", "article", ".content", ".post", ".entry", "[role='main']", "#content", ".main"];
    const removals = [
      "script",
      "style",
      "noscript",
      "template",
      "nav",
      "footer",
      "aside",
      "form",
      "iframe",
      "[hidden]",
      "[aria-hidden='true']",
      "[role='banner']",
      "[role='navigation']",
      "[role='contentinfo']",
      ".nav",
      ".navbar",
      ".menu",
      ".sidebar",
      ".ad",
      ".ads",
      ".advertisement",
      ".cookie",
      ".popup",
      ".modal",
      ".footer",
      ".header",
      ".related",
      ".share",
      ".social"
    ];

    function textLength(element) {
      return ((element.innerText || element.textContent || "").replace(/\s+/g, " ").trim()).length;
    }

    function cleanClone(element) {
      const clone = element.cloneNode(true);
      clone.querySelectorAll(removals.join(",")).forEach((node) => node.remove());
      clone.querySelectorAll("a[href]").forEach((anchor) => {
        try {
          anchor.setAttribute("href", new URL(anchor.getAttribute("href"), location.href).href);
        } catch (error) {
          anchor.removeAttribute("href");
        }
      });
      clone.querySelectorAll("img[src]").forEach((image) => {
        try {
          image.setAttribute("src", new URL(image.getAttribute("src"), location.href).href);
        } catch (error) {
          image.removeAttribute("src");
        }
      });
      return clone;
    }

    let best = null;
    let bestLength = 0;
    for (const selector of candidates) {
      document.querySelectorAll(selector).forEach((element) => {
        const length = textLength(element);
        if (length > bestLength) {
          best = element;
          bestLength = length;
        }
      });
    }

    const source = best && bestLength >= 120 ? best : document.body || document.documentElement;
    const clean = cleanClone(source);
    const titleElement = document.querySelector("meta[property='og:title'], meta[name='twitter:title']");
    const title = titleElement && titleElement.content ? titleElement.content : document.title;
    const text = (clean.innerText || clean.textContent || "").replace(/\s+/g, " ").trim();

    return {
      title: title ? title.trim() : "Untitled page",
      url: location.href,
      html: clean.innerHTML,
      text
    };
  }

  async function addCustomPage() {
    if (state.pages.length >= MAX_PAGES) {
      toast(`Workspace limit reached (${MAX_PAGES} pages).`, "error");
      return;
    }

    const page = {
      id: createId(),
      title: "Untitled note",
      url: "",
      markdown: "# Untitled note\n\n",
      timestamp: Date.now(),
      html: ""
    };
    state.pages.push(page);
    state.selectedIds.add(page.id);
    await savePages();
    syncBadge();
    openDetail(page.id, true);
    toast("Custom page added");
  }

  function openDetail(pageId, edit) {
    state.currentPageId = pageId;
    state.editMode = Boolean(edit);
    state.view = "detail";
    render();
    if (state.editMode) {
      elements.detailTitleInput.focus();
      elements.detailTitleInput.select();
    }
  }

  function backToWorkspace() {
    state.view = "workspace";
    state.editMode = false;
    state.currentPageId = null;
    render();
  }

  function openSettings() {
    state.view = "settings";
    state.editMode = false;
    render();
  }

  function switchPanel(panel) {
    state.activePanel = panel;
    render();
  }

  function startEdit() {
    state.editMode = true;
    render();
    elements.markdownEditor.focus();
  }

  async function saveEdit() {
    const page = currentPage();
    if (!page) {
      return;
    }
    page.title = elements.detailTitleInput.value.trim() || "Untitled page";
    page.markdown = normalizeMarkdown(elements.markdownEditor.value);
    page.timestamp = Date.now();
    await savePages();
    state.editMode = false;
    render();
    toast("Page updated");
  }

  function cancelEdit() {
    state.editMode = false;
    render();
  }

  async function removePage(pageId) {
    const page = state.pages.find((entry) => entry.id === pageId);
    state.pages = state.pages.filter((entry) => entry.id !== pageId);
    state.selectedIds.delete(pageId);
    if (state.currentPageId === pageId) {
      backToWorkspace();
    }
    await savePages();
    render();
    syncBadge();
    toast(page ? `Removed ${page.title}` : "Page removed");
  }

  async function clearWorkspace() {
    state.pages = [];
    state.selectedIds.clear();
    state.currentPageId = null;
    state.view = "workspace";
    state.activePanel = "pages";
    elements.confirmOverlay.classList.add("hidden");
    await savePages();
    render();
    syncBadge();
    toast("Workspace cleared");
  }

  function selectAllPages() {
    state.selectedIds = new Set(state.pages.map((page) => page.id));
    renderCombine();
  }

  function selectNoPages() {
    state.selectedIds.clear();
    renderCombine();
  }

  async function copyCurrentPage() {
    const page = currentPage();
    if (!page) {
      return;
    }
    await copyText(page.markdown);
    toast("Markdown copied");
  }

  async function downloadCurrentPage() {
    const page = currentPage();
    if (!page) {
      return;
    }
    await downloadText(page.markdown, `${slugify(page.title)}.md`, "text/markdown;charset=utf-8");
    toast("Markdown download started");
  }

  function exportCurrentPagePdf() {
    const page = currentPage();
    if (!page) {
      return;
    }
    openPrintWindow(buildPrintHtml([page], false), page.title);
    toast("Print dialog opened");
  }

  async function copySelectedPages() {
    await copyText(combineMarkdown(getSelectedPages()));
    toast("Combined Markdown copied");
  }

  async function exportSelectedMarkdown() {
    const selected = getSelectedPages();
    await downloadText(combineMarkdown(selected), "markdown-collector.md", "text/markdown;charset=utf-8");
    toast("Combined file download started");
  }

  function exportSelectedPdf() {
    const selected = getSelectedPages();
    openPrintWindow(buildPrintHtml(selected, true), "Markdown Collector");
    toast("Print dialog opened");
  }

  async function exportSelectedZip() {
    const selected = getSelectedPages();
    const zip = new JSZip();
    const usedNames = new Map();
    for (const page of selected) {
      const baseName = slugify(page.title) || "page";
      const count = usedNames.get(baseName) || 0;
      usedNames.set(baseName, count + 1);
      const fileName = count === 0 ? `${baseName}.md` : `${baseName}-${count + 1}.md`;
      zip.file(fileName, page.markdown || "");
    }
    const blob = await zip.generateAsync({ type: "blob" });
    await downloadBlob(blob, "markdown-collector.zip");
    toast("ZIP download started");
  }

  function combineMarkdown(pages) {
    return pages
      .map((page) => {
        const title = page.title || "Untitled page";
        const body = removeLeadingDuplicateHeading(stripFrontmatter(page.markdown || ""), title);
        return `# ${title}\n\n${body.trim()}\n\nSource: ${page.url || "Custom page"}`;
      })
      .join("\n\n---\n\n");
  }

  function buildPrintHtml(pages, combined) {
    const title = combined ? "Markdown Collector Export" : pages[0]?.title || "Markdown Export";
    const articles = pages.map((page) => {
      const body = removeLeadingDuplicateHeading(stripFrontmatter(page.markdown || ""), page.title || "");
      return `
        <article class="article">
          <h1>${escapeHtml(page.title || "Untitled page")}</h1>
          <div class="content">${markdownToHtml(body)}</div>
          <footer>Source: ${escapeHtml(page.url || "Custom page")}</footer>
        </article>
      `;
    }).join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #1d2530;
      background: #fff;
      font: 14px/1.62 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .article { max-width: 760px; margin: 0 auto; padding: 0 0 26px; }
    .article + .article { break-before: page; padding-top: 0; }
    h1 { margin: 0 0 18px; font-size: 30px; line-height: 1.18; letter-spacing: 0; }
    h2 { margin-top: 28px; font-size: 22px; }
    h3 { margin-top: 22px; font-size: 18px; }
    p, ul, ol, blockquote, pre, table { margin: 0 0 14px; }
    a { color: #006b61; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
    code { padding: 1px 4px; border-radius: 4px; background: #eef2f5; font-size: 0.92em; }
    pre { overflow: auto; padding: 12px; border-radius: 8px; background: #f4f6f8; white-space: pre-wrap; }
    pre code { padding: 0; background: transparent; }
    .image-ref { display: inline-block; color: #687586; font-size: 0.92em; }
    blockquote { padding-left: 14px; border-left: 3px solid #c8d1db; color: #4f5d6c; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 7px 9px; border: 1px solid #d8e0e8; text-align: left; vertical-align: top; }
    footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #d8e0e8; color: #687586; font-size: 11px; word-break: break-word; }
    @media print { .article + .article { page-break-before: always; } }
  </style>
</head>
<body>${articles}</body>
</html>`;
  }

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let list = null;
    let inCode = false;
    let codeBuffer = [];
    let tableBuffer = [];

    const flushParagraph = () => {
      if (paragraph.length) {
        html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
        paragraph = [];
      }
    };
    const flushList = () => {
      if (list) {
        html.push(`<${list.type}>${list.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${list.type}>`);
        list = null;
      }
    };
    const flushTable = () => {
      if (tableBuffer.length) {
        html.push(renderTable(tableBuffer));
        tableBuffer = [];
      }
    };
    const flushCode = () => {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre>`);
        inCode = false;
        codeBuffer = [];
      }
    };

    for (const line of lines) {
      if (/^```/.test(line)) {
        if (inCode) {
          flushCode();
        } else {
          flushParagraph();
          flushList();
          flushTable();
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        codeBuffer.push(line);
        continue;
      }

      if (/^\s*$/.test(line)) {
        flushParagraph();
        flushList();
        flushTable();
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        flushTable();
        const level = heading[1].length;
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      if (/^---+$/.test(line.trim())) {
        flushParagraph();
        flushList();
        flushTable();
        html.push("<hr>");
        continue;
      }

      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        flushList();
        flushTable();
        html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
        continue;
      }

      const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
      const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        flushTable();
        const type = ordered ? "ol" : "ul";
        if (!list || list.type !== type) {
          flushList();
          list = { type, items: [] };
        }
        list.items.push((unordered || ordered)[1]);
        continue;
      }

      if (/^\|.*\|$/.test(line.trim())) {
        flushParagraph();
        flushList();
        tableBuffer.push(line);
        continue;
      }

      flushTable();
      paragraph.push(line.trim());
    }

    flushCode();
    flushParagraph();
    flushList();
    flushTable();
    return html.join("\n");
  }

  function renderTable(lines) {
    const rows = lines
      .filter((line) => !/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line))
      .map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));

    if (!rows.length) {
      return "";
    }

    const [header, ...body] = rows;
    return `<table><thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function inlineMarkdown(value) {
    let html = escapeHtml(value);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/_([^_]+)_/g, "<em>$1</em>");
    html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="image-ref">Image: $1 ($2)</span>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return html;
  }

  function openPrintWindow(html, title) {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast("Allow popups to export PDF.", "error");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = title || "Markdown Export";
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  async function downloadText(text, filename, type) {
    await downloadBlob(new Blob([text], { type }), filename);
  }

  async function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    try {
      if (chromeAvailable("downloads")) {
        await chromeDownload({ url, filename, saveAs: true });
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
      }
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  }

  async function updateSettingsFromForm() {
    state.settings = {
      ...state.settings,
      frontmatter: elements.frontmatterToggle.checked,
      headingStyle: elements.headingStyleSelect.value,
      bulletListMarker: elements.bulletMarkerSelect.value,
      codeBlockStyle: elements.codeBlockStyleSelect.value,
      defaultExport: elements.defaultExportSelect.value
    };
    await saveSettings();
    render();
    toast("Settings saved");
  }

  async function toggleTheme() {
    state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
    await saveSettings();
    render();
  }

  function handleKeyboard(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && state.view === "workspace") {
      event.preventDefault();
      captureCurrentPage();
    }
    if (event.key === "Escape") {
      if (!elements.confirmOverlay.classList.contains("hidden")) {
        elements.confirmOverlay.classList.add("hidden");
      } else if (state.view !== "workspace") {
        backToWorkspace();
      }
    }
  }

  function handleDragStart(event) {
    state.draggingId = event.currentTarget.dataset.id;
    event.currentTarget.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggingId);
  }

  function handleDragOver(event) {
    event.preventDefault();
    const item = event.currentTarget;
    if (!state.draggingId || state.draggingId === item.dataset.id) {
      return;
    }
    clearDropMarkers();
    const rect = item.getBoundingClientRect();
    item.classList.add(event.clientY < rect.top + rect.height / 2 ? "drop-before" : "drop-after");
  }

  async function handleDrop(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const draggedId = state.draggingId || event.dataTransfer.getData("text/plain");
    const targetId = target.dataset.id;
    if (!draggedId || !targetId || draggedId === targetId) {
      return;
    }
    const rect = target.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    reorderPages(draggedId, targetId, before);
    clearDropMarkers();
    await savePages();
    render();
    toast("Workspace reordered");
  }

  function handleDragEnd(event) {
    event.currentTarget.classList.remove("is-dragging");
    state.draggingId = null;
    clearDropMarkers();
  }

  function clearDropMarkers() {
    document.querySelectorAll(".drop-before, .drop-after").forEach((node) => {
      node.classList.remove("drop-before", "drop-after");
    });
  }

  function reorderPages(draggedId, targetId, before) {
    const draggedIndex = state.pages.findIndex((page) => page.id === draggedId);
    if (draggedIndex === -1) {
      return;
    }
    const [dragged] = state.pages.splice(draggedIndex, 1);
    const targetIndex = state.pages.findIndex((page) => page.id === targetId);
    if (targetIndex === -1) {
      state.pages.push(dragged);
      return;
    }
    state.pages.splice(before ? targetIndex : targetIndex + 1, 0, dragged);
  }

  async function savePages() {
    await storageSet({ [STORAGE_KEYS.pages]: state.pages });
  }

  async function saveSettings() {
    await storageSet({ [STORAGE_KEYS.settings]: state.settings });
  }

  async function syncBadge() {
    if (!chromeAvailable("action")) {
      return;
    }
    const count = String(state.pages.length || "");
    try {
      await chromeActionSetBadgeText({ text: count });
      await chromeActionSetBadgeBackgroundColor({ color: "#2eb8a9" });
    } catch (error) {
      // Badge support can be unavailable in non-extension test contexts.
    }
  }

  function storageGet(keys) {
    if (!chromeAvailable("storage")) {
      return Promise.resolve({});
    }
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (result) => {
        const error = chrome.runtime && chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(result || {});
        }
      });
    }).catch((error) => {
      toast(`Storage read failed: ${error.message}`, "error");
      return {};
    });
  }

  function storageSet(payload) {
    if (!chromeAvailable("storage")) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(payload, () => {
        const error = chrome.runtime && chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    }).catch((error) => {
      toast(`Storage save failed: ${error.message}`, "error");
      throw error;
    });
  }

  function chromeTabsQuery(queryInfo) {
    return new Promise((resolve, reject) => {
      chrome.tabs.query(queryInfo, (tabs) => {
        const error = chrome.runtime && chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(tabs || []);
        }
      });
    });
  }

  function chromeExecuteScript(options) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript(options, (results) => {
        const error = chrome.runtime && chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(results || []);
        }
      });
    });
  }

  function chromeDownload(options) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download(options, (downloadId) => {
        const error = chrome.runtime && chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve(downloadId);
        }
      });
    });
  }

  function chromeActionSetBadgeText(options) {
    return new Promise((resolve, reject) => {
      chrome.action.setBadgeText(options, () => {
        const error = chrome.runtime && chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    });
  }

  function chromeActionSetBadgeBackgroundColor(options) {
    return new Promise((resolve, reject) => {
      chrome.action.setBadgeBackgroundColor(options, () => {
        const error = chrome.runtime && chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    });
  }

  function chromeAvailable(namespace) {
    return typeof chrome !== "undefined" && chrome[namespace];
  }

  function currentPage() {
    return state.pages.find((page) => page.id === state.currentPageId);
  }

  function getSelectedPages() {
    return state.pages.filter((page) => state.selectedIds.has(page.id));
  }

  function setLoading(loading) {
    elements.captureButton.disabled = loading;
    elements.captureButton.classList.toggle("is-loading", loading);
    elements.captureLabel.textContent = loading ? "Capturing" : "Capture Page";
  }

  function toast(message, type = "success") {
    if (!elements.toastHost) {
      return;
    }
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.textContent = message;
    elements.toastHost.append(node);
    setTimeout(() => node.remove(), 2600);
  }

  function createId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function isValidPage(page) {
    return page && typeof page.id === "string" && typeof page.markdown === "string";
  }

  function isRestrictedUrl(url) {
    return RESTRICTED_SCHEMES.some((scheme) => String(url).startsWith(scheme));
  }

  function addFrontmatter(markdown, title, url, date) {
    const isoDate = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    return `---\ntitle: "${yamlEscape(title)}"\nurl: "${yamlEscape(url)}"\ndate: "${isoDate}"\n---\n\n${markdown.trim()}`;
  }

  function stripFrontmatter(markdown) {
    return markdown.replace(/^---\n[\s\S]*?\n---\n+/, "");
  }

  function removeLeadingDuplicateHeading(markdown, title) {
    const escapedTitle = escapeRegExp(title.trim());
    if (!escapedTitle) {
      return markdown;
    }
    const pattern = new RegExp(`^#\\s+${escapedTitle}\\s*\\n+`, "i");
    return markdown.replace(pattern, "");
  }

  function normalizeMarkdown(markdown) {
    return String(markdown || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function yamlEscape(value) {
    return String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  function slugify(value) {
    const slug = String(value || "page")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72);
    return slug || "page";
  }

  function displayUrl(url) {
    if (!url) {
      return "Custom page";
    }
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
    } catch (error) {
      return url;
    }
  }

  function snippet(markdown) {
    const clean = stripFrontmatter(markdown)
      .replace(/[#>*_`\-[\]()!]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return clean ? clean.slice(0, 116) : "No preview text";
  }

  function byteLength(value) {
    return new Blob([value || ""]).size;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  function relativeTime(timestamp) {
    const delta = Date.now() - Number(timestamp || Date.now());
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (delta < minute) {
      return "just now";
    }
    if (delta < hour) {
      const value = Math.floor(delta / minute);
      return `${value} min${value === 1 ? "" : "s"} ago`;
    }
    if (delta < day) {
      const value = Math.floor(delta / hour);
      return `${value} hr${value === 1 ? "" : "s"} ago`;
    }
    const value = Math.floor(delta / day);
    return `${value} day${value === 1 ? "" : "s"} ago`;
  }

  function highlightMarkdown(markdown) {
    return escapeHtml(markdown)
      .split("\n")
      .map((line) => {
        if (/^---$/.test(line) || /^[a-z]+: /.test(line)) {
          return `<span class="md-frontmatter">${line}</span>`;
        }
        if (/^#{1,6}\s/.test(line)) {
          return `<span class="md-heading">${line}</span>`;
        }
        if (/^```/.test(line)) {
          return `<span class="md-fence">${line}</span>`;
        }
        if (/^>\s?/.test(line)) {
          return `<span class="md-quote">${line}</span>`;
        }
        return line
          .replace(/(`[^`]+`)/g, '<span class="md-code">$1</span>')
          .replace(/(\[[^\]]+\]\([^)]+\))/g, '<span class="md-link">$1</span>');
      })
      .join("\n");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
})();
