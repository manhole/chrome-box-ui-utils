# CLAUDE.md

## Project Overview

Chrome extension (Manifest V3) that displays the full folder path on Box web app and lets users copy it to the clipboard. Box compresses deep breadcrumbs, hiding intermediate folders.

## Development

No build step. Load the repo directory directly in `chrome://extensions` (Developer mode → "Load unpacked").

After code changes, click the reload button on the extension card in `chrome://extensions`, then reload the Box tab.

## Architecture

Single content script injected on `https://*.box.com/*` pages.

### Path Extraction (`content.js`)

Three-step scraping of the breadcrumb element returned by `findBreadcrumb()` (`nav.Breadcrumb`; the pre-2026-11 class `.ItemListBreadcrumb` is still accepted):

1. Overflow dropdown — Programmatically clicks the overflow button (`[class*="BreadcrumbOverflow-menuButton"]`, which matches both the current and the old class name) to reveal hidden parent folders, scrapes them, then closes the dropdown. The menu is looked up by the button's `aria-controls` id first. Links pointing to `/folder/0` (root "All Files") are excluded. Box renders the menu items as a portal only while the dropdown is open, so static DOM parsing alone cannot retrieve them. To prevent the dropdown from flashing on screen, a temporary `visibility: hidden` style is injected before clicking and removed after scraping.
2. Visible `<ol>` items — Reads `<li>` elements from the breadcrumb list, deduplicating against overflow results. The `aria-hidden` copy of the list that Box keeps for width measurement is skipped.
3. Current folder fallback — If the current folder name (from page heading or `document.title`) is missing from the scraped path, it is appended.

Each scraped part is `{ name, href }`; `href` comes from the breadcrumb anchor and is `null` when none exists (typically the current folder).

### Rendering (`content.js`)

`renderBar()` builds the bar's DOM from the parts. Intermediate folders whose `href` matches `/folder/<id>` are rendered as plain `<a>` links (full page navigation, not SPA routing — Box's router cannot be invoked from the content script). The current folder (last segment) and any segment without a usable href are plain `<span>`s. The copy button always copies the plain-text `A > B > C` string stored in `bar.dataset.path`, independent of how segments are rendered.

### Change Detection

- `MutationObserver` on the breadcrumb element — reacts to breadcrumb DOM changes (debounced 150ms).
- `setInterval` (200ms) — lightweight URL polling to detect SPA navigation and re-attach the observer when Box replaces the breadcrumb element.
- If a folder page has no breadcrumb element for 5 seconds, `console.warn` is emitted once per URL (`Box UI Utils: breadcrumb not found. ...`). Seeing this usually means Box changed its DOM again.

### Box DOM (verified 2026-11-12)

Observed on `app.box.com/folder/<id>` (5 levels deep, Japanese UI). Compare against this when the extension breaks again. Box renamed `ItemListBreadcrumb*` to `Breadcrumb*` some time between 2026-09 and 2026-11.

```
div.ActionBar.action-bar                      (flex row)
  div.ActionBar-title.action-bar-title        (the bar is inserted here, after nav)
    nav.Breadcrumb.Breadcrumb--isResponsiveWeb   aria-label is localized
      div.Breadcrumb-content
        div.bdl-DropdownMenu-target
          button.BreadcrumbOverflow-menuButton   aria-haspopup, aria-controls="menu1"
        ol.Breadcrumb-list[data-testid="item-list-breadcrumb-list"]
          li.Breadcrumb-listItem > a.Breadcrumb-link[href="/folder/<id>"]
          li.Breadcrumb-listItem.is-last
            div.Breadcrumb-currentItem > div > h1.Breadcrumb-currentItemTitle.page-title
      ol.Breadcrumb-list.is-measurer[aria-hidden="true"]   hidden copy for width measurement

(portal under body, only while the dropdown is open)
div.dropdown-menu-element > div.bdl-DropdownMenu-element
  ul.aria-menu[role="menu"]
    li[role="none"] > a.menu-item[role="menuitem"][href="/folder/<id>"]   first item is /folder/0
```

`[data-testid="classification-badge"]` could not be re-checked (no classified folder available).

### Conventions

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- `CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/). When bumping `version` in `manifest.json`, move the `Unreleased` entries into a new dated version section.
- CSS selectors targeting Box DOM may break on Box UI updates.
