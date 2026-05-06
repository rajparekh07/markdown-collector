# Markdown Collector - Chrome Extension Spec

## Product Summary

A Chrome extension that converts webpages to Markdown AND collects them into a workspace. Better than the original "Webpage to Markdown" extension in every way: modern UI, workspace collection, PDF export, batch export.

## Core Features

### 1. Convert Page to Markdown
- Click extension icon → popup with "Capture Page" button
- Extracts main content using smart selectors (main, article, .content, .post, .entry, [role="main"], #content, .main)
- Falls back to entire body minus nav/footer/ads if no main content found
- Uses Turndown.js for HTML→Markdown conversion
- Shows converted markdown in a preview panel within the popup
- Can copy to clipboard
- Frontmatter option (title, url, date)

### 2. Workspace / Collection (THE KEY NEW FEATURE)
- Each captured page is saved as a "card" in a workspace panel
- Workspace shows all collected pages with: page title, URL, timestamp, preview snippet
- Cards can be:
  - Clicked to view full markdown
  - Removed individually (X button)
  - Reordered via drag-and-drop
  - Clicked "Edit" to modify page title
- Workspace persists across browser sessions (chrome.storage.local)
- Shows page count badge on extension icon
- Workspace panel has tabs: "Pages" (list of all collected) | "Combine" (export options)

### 3. Export Options

**Per-page:**
- Copy markdown to clipboard
- Download as .md file
- Download as PDF (individual page)

**Batch (from Combine tab):**
- "Export All as Single File" → all pages combined into one .md (separated by `---` horizontal rules with page titles as H1 headers)
- "Export All as Separate Files" → downloads a .zip containing individual .md files
- "Export All as Single PDF" → all pages combined into one PDF with page breaks between
- Select/deselect which pages to include in batch export

### 4. PDF Export
- Individual page: convert markdown → styled HTML → print to PDF
- Combined: all selected pages merged into one HTML → print to PDF
- PDFs should have:
  - Clean, readable typography (system font stack)
  - Page title as H1
  - Source URL at bottom
  - Page breaks between articles (for combined)
  - Proper margins

### 5. Better UI/UX

**Popup dimensions:** 480px wide × 600px tall (bigger than original)

**Design:**
- Dark theme by default with light theme toggle
- Modern, clean interface — think Linear/Stripe/VS Code aesthetic
- Smooth transitions and micro-interactions
- Toast notifications for actions (copied, saved, exported)
- Loading spinners during conversion
- Empty states with helpful illustrations/emojis
- Keyboard shortcuts (Ctrl+Enter to capture)

**Layout:**
```
┌─────────────────────────────────┐
│ 🔽 Markdown Collector    [🌙] [⚙]│  ← Header with title, theme toggle, settings
├─────────────────────────────────┤
│ [Capture Page]  [+ Add Custom]  │  ← Action buttons
├─────────────────────────────────┤
│ ▸ 📄 Page Title 1         [✕]  │  ← Workspace page cards
│   example.com/path              │
│   2 mins ago · 4.2KB            │
│ ▸ 📄 Page Title 2         [✕]  │
│   another.com/article           │
│   5 mins ago · 8.1KB            │
│ ▸ 📄 Page Title 3         [✕]  │
│   ...                           │
├─────────────────────────────────┤
│ Pages: 3  |  Total: 18.5KB     │  ← Status bar
├─────────────────────────────────┤
│ [📋 Copy All] [📥 Export .md]   │  ← Batch actions
│ [📕 Export PDF] [📦 Export ZIP] │
└─────────────────────────────────┘
```

**Detail view (when clicking a page card):**
- Full markdown preview with syntax highlighting
- Edit button to modify markdown before export
- Individual export buttons
- Back button to return to workspace

### 6. Settings Panel
- Frontmatter toggle (include YAML frontmatter with title, URL, date)
- Heading style (atx `#` vs setext `===`)
- Bullet list marker (`-`, `*`, `+`)
- Code block style (fenced ``` `` vs indented)
- Default export format
- Clear workspace button (with confirmation)

## Technical Requirements

### Manifest V3
- Permissions: activeTab, scripting, storage, downloads
- No external network requests — fully offline
- Content Security Policy: script-src 'self'; object-src 'self'
- Icons: 16, 48, 128px sizes (generate clean SVG-based icons)

### Files Structure
```
markdown-collector/
├── manifest.json
├── popup.html
├── popup.js          (main extension logic)
├── popup.css         (all styling)
├── turndown.js       (bundled Turndown library)
├── jszip.min.js      (for ZIP export - use JSZip)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Key Libraries
- Turndown.js for HTML→Markdown conversion (bundled, no CDN)
- JSZip for creating ZIP files (bundled, no CDN)
- No other dependencies. Everything offline.

### Storage
- chrome.storage.local for workspace persistence
- Each page stored as: { id, title, url, markdown, timestamp, html }
- Maximum 50 pages (show warning if exceeded)

### Drag and Drop
- Use native HTML5 drag and drop API (no library needed)
- Visual feedback during drag (opacity change, drop indicator line)

### Badge
- chrome.action.setBadgeText to show page count on extension icon
- chrome.action.setBadgeBackgroundColor for styling

## Quality Requirements

1. **Pixel-perfect UI** — no jank, proper spacing, consistent design tokens
2. **Error handling** — handle: restricted pages (chrome://, edge://), empty pages, iframe access denied, storage full
3. **Performance** — popup loads instantly, conversion under 2s for typical pages
4. **Accessibility** — proper ARIA labels, keyboard navigation, sufficient color contrast
5. **Clean code** — well-organized, commented, no dead code
6. **Valid manifest** — no warnings on chrome://extensions load

## Comparison to Original

| Feature | Original | Markdown Collector |
|---------|----------|-------------------|
| Convert to MD | ✅ | ✅ |
| UI/UX | Basic, cramped | Modern, spacious, dark theme |
| Workspace | ❌ | ✅ Collection with reorder |
| Batch export | ❌ | ✅ Single file, separate, ZIP |
| PDF export | ❌ | ✅ Individual + combined |
| Badge count | ❌ | ✅ Shows page count |
| Drag reorder | ❌ | ✅ |
| Edit pages | ❌ | ✅ Edit title and markdown |
| Keyboard shortcuts | ❌ | ✅ Ctrl+Enter to capture |
| Settings | Basic (4 options) | Same + clear workspace |

## Implementation Order
1. manifest.json + icons + basic popup structure
2. Page capture and Turndown conversion
3. Workspace storage (chrome.storage.local)
4. Popup UI with page cards
5. Individual export (MD, PDF, clipboard)
6. Batch export (single MD, combined PDF, ZIP)
7. Drag and drop reorder
8. Edit mode
9. Settings panel
10. Badge count
11. Polish (animations, empty states, error handling)
