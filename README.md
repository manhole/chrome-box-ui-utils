# Box UI Utils

[日本語](README.ja.md)

A Chrome extension that displays and copies the full folder path on [Box](https://www.box.com/).

## Motivation

Box's breadcrumb hides intermediate folders behind an overflow menu when the folder hierarchy gets deep, so you can't see the full path at a glance — or copy it to share with someone.

## Solution

Box UI Utils scrapes the full breadcrumb — including folders hidden in the overflow menu — and displays it in a floating bar at the bottom of the page. One click copies the path to your clipboard.

## Installation

1. Clone or download this repository
2. Open `chrome://extensions` in Chrome
3. Enable Developer mode (top right)
4. Click "Load unpacked" and select the repository directory

## Usage

Navigate to any folder page on Box (`https://app.box.com/folder/...`). A floating bar appears at the bottom of the page showing the full path:

```
ProjectA > Design > 2024 > Q4 > Final Review
```

Click the clipboard icon to copy the path.

## How It Works

- A content script is injected on `https://*.box.com/*` pages
- The breadcrumb element (`.ItemListBreadcrumb`) is monitored via `MutationObserver`
- Hidden parent folders are retrieved by programmatically expanding the overflow dropdown
- The root folder ("All Files" / equivalent in other languages) is excluded by checking for `/folder/0`
- The current folder name is obtained from the page heading as a fallback

## Limitations

- The extension relies on Box's current DOM structure (class names like `ItemListBreadcrumb`). Box UI updates may break the scraping.
- The overflow dropdown is briefly opened and closed to read hidden folders, which may cause a visual flash on initial load.
- Only folder views are supported (`/folder/{id}` URLs).

## License

MIT
