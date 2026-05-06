# Markdown Collector

Markdown Collector is a Manifest V3 Chrome extension that captures the active tab as Markdown and saves pages into a persistent local workspace.

## Features

- Smart page extraction from `main`, `article`, content containers, or a cleaned body fallback.
- Local HTML-to-Markdown conversion through the bundled `TurndownService` API.
- Workspace cards with title, URL, timestamp, size, snippet, remove, edit, and native drag reorder.
- Persistent storage with `chrome.storage.local` and a 50-page workspace limit.
- Extension badge showing the current page count.
- Per-page copy, Markdown download, and print-to-PDF export.
- Batch copy, combined Markdown export, combined print-to-PDF export, and ZIP export.
- Dark/light theme, Markdown settings, clear-workspace confirmation, toasts, and `Ctrl+Enter` capture.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked".
4. Select this `markdown-collector` directory.

The extension is fully offline. It does not use CDNs or make network requests.

## Files

- `manifest.json` - Chrome extension manifest.
- `popup.html` - Popup structure.
- `popup.css` - UI styling and themes.
- `popup.js` - Capture, workspace, storage, editing, export, and badge logic.
- `turndown.js` - Bundled Markdown conversion helper exposing `window.TurndownService`.
- `jszip.min.js` - Bundled ZIP helper exposing `window.JSZip`.
- `icons/` - PNG extension icons.

## PDF Export

PDF export opens a printable HTML document and invokes Chrome's print dialog. Choose "Save to PDF" in the print dialog for the final PDF file.
