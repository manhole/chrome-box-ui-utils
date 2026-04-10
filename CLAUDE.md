# CLAUDE.md

## Project Overview

Chrome extension (Manifest V3) that displays the full folder path on Box web app and lets users copy it to the clipboard. Box compresses deep breadcrumbs, hiding intermediate folders.

## Development

No build step. Load the repo directory directly in `chrome://extensions` (Developer mode → "Load unpacked").

After code changes, click the reload button on the extension card in `chrome://extensions`, then reload the Box tab.

## Architecture

Single content script injected on `https://*.box.com/*` pages.

### Path Extraction (`content.js`)

Three-step scraping of `.ItemListBreadcrumb`:

1. Overflow dropdown — Programmatically clicks `.ItemListBreadcrumbOverflow-menuButton` to reveal hidden parent folders, scrapes them, then closes the dropdown. Links pointing to `/folder/0` (root "All Files") are excluded.
2. Visible `<ol>` items — Reads `<li>` elements from the breadcrumb list, deduplicating against overflow results.
3. Current folder fallback — If the current folder name (from page heading or `document.title`) is missing from the scraped path, it is appended.

### Change Detection

- `MutationObserver` on `.ItemListBreadcrumb` element — reacts to breadcrumb DOM changes (debounced 150ms).
- `setInterval` (200ms) — lightweight URL polling to detect SPA navigation and re-attach the observer when Box replaces the breadcrumb element.

### Conventions

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- CSS selectors targeting Box DOM may break on Box UI updates.
