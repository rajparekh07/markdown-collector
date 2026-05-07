# Privacy Policy for Markdown Collector

Effective date: May 7, 2026

Markdown Collector is a Chrome extension that lets users capture webpages as Markdown, save selected pages in a local workspace, edit and reorder saved content, and export the workspace as Markdown, PDF, or ZIP files.

## Data Collection

Markdown Collector does not collect, sell, share, or transmit personal information.

The extension does not send captured webpage content, browsing history, saved workspace data, settings, or exported files to any external server controlled by the developer.

## Data Stored Locally

Markdown Collector stores the following data locally in the user's browser using Chrome extension storage:

- Captured page titles, URLs, timestamps, snippets, and Markdown content
- Workspace order and saved page metadata
- Extension settings and theme preference

This data remains on the user's device unless the user manually copies or exports it.

## Permissions

Markdown Collector requests the following Chrome permissions:

- `activeTab`: used only after the user initiates capture, so the extension can read the current tab and convert the selected page content into Markdown.
- `scripting`: used to run capture logic on the active tab after user action.
- `storage`: used to save the local workspace, captured Markdown pages, and extension settings in the browser.
- `downloads`: used when the user exports Markdown files or ZIP archives.

## Remote Code

Markdown Collector does not use remote code. All JavaScript and helper libraries are bundled with the extension package and run locally. The extension does not load code from CDNs or external servers.

## Network Requests

Markdown Collector is designed to work offline. It does not make network requests to transmit user data.

## User Control

Users can remove captured pages from the workspace, clear the workspace, or uninstall the extension to remove locally stored extension data from Chrome.

## Changes to This Policy

This privacy policy may be updated when the extension's behavior or permissions change. Updates will be published in this repository.

## Contact

For privacy questions about Markdown Collector, contact the publisher using the contact email listed on the Chrome Web Store listing.
