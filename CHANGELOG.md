# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-05

### Added

- Intermediate folders in the path bar are now links to the corresponding Box folder, so parents hidden in Box's overflow menu can be opened directly. The current folder (last segment) stays plain text, and the copy button still copies the plain-text path.

## [0.1.0] - 2026-04-10

### Added

- Initial release: shows the full folder path below Box's breadcrumb, including folders hidden in the overflow menu, with a one-click copy button.

### Fixed

- Hide the overflow dropdown while scraping so it no longer flashes on screen.
- Exclude classification badge text (e.g. "Confidential") from the scraped path.
