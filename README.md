# Arcflow

Arcflow brings Arc-inspired tab navigation and workspace controls to Google Chrome. It is an independent Chrome extension and is not affiliated with Arc or Google.

## Features

- Left-side tab sidebar with tab search, pinned tabs, Chrome groups, nested folders, and drag-and-drop organization.
- Command bar for searching tabs, opening a URL, and running browser actions.
- Download and installed-extension panels.
- Optional page framing and appearance controls.
- Keyboard shortcuts for command bar, tab navigation, URL actions, organization, and sidebar controls.

Arcflow does not replace Chrome's New Tab page. Some Chrome-controlled pages restrict extension features.

## Install for development

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this project directory.
4. Pin Arcflow from Chrome's Extensions menu if you want quick access.

## Permissions

The extension uses Chrome's `storage`, `tabs`, `tabGroups`, `sessions`, `webNavigation`, `downloads`, `downloads.open`, `scripting`, and `management` APIs. It requests access across websites so its sidebar, command bar, shortcuts, and optional styling can work on eligible pages. Chrome internal pages and other restricted pages remain unavailable.

Tab titles and URLs are processed locally for navigation and organization features. Download metadata and installed-extension information are displayed in their respective panels. Preferences can be stored through Chrome Sync. Search terms are sent to the selected search provider only when submitted by the user. See the [privacy policy](https://geekblooded.github.io/Arcflow/privacy.html).

## Release package

The current Chrome Web Store release package and listing/disclosure draft are in `store-submission/`.
