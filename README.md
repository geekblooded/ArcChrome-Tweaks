# ArcChrome-Tweaks (`v1.1.0`)

**Dia & Arc Browser Experience for Official Google Chrome** — engineered for corporate IT / MDM environments where third-party browsers (Arc, Dia, Zen, Brave, Vivaldi) and binary patching are blocked.

Inspired by [`JaceThings/DiaTweaks`](https://github.com/JaceThings/DiaTweaks) and validated via binary reverse-engineering (`REA`) of `DiaPatches.dylib` (`v1.1.0`) and `Google Chrome.app` (`v157.0.8103.79`).

---

## 🔒 Why No Binary Patching? (REA Evidence Summary)

- **`Dia.app` + `DiaPatches.dylib`:** `DiaTweaks` injects `DiaPatches.dylib` via `LC_LOAD_WEAK_DYLIB` and locally re-signs `Dia.app` with `hardened_runtime: false` (`authorities: ["DiaPatches Local Signing"]`). Its constructor `_DPInit` hooks 37 AppKit `NSView` / `CALayer` classes in `__DATA,__dppatches`.
- **Official `Google Chrome.app`:** Signed by `Developer ID Application: Google LLC (EQHXZ8M8AV)` with `hardened_runtime: true`, `flags: 0x12a00(kill,restrict,library-validation,runtime)`, and enterprise device-trust entitlements (`EQHXZ8M8AV.com.google.Chrome.devicetrust`). Modifying Chrome's binary invalidates Okta/SSO Device Trust and triggers CrowdStrike Falcon / Hexnode UEM alerts.
- **Our Solution (`ArcChrome-Tweaks v1.1.0`):** Reconstructs `DiaPatches.dylib`'s features cleanly inside an MV3 Chrome Extension + Chrome's native windowing modes.

---

## ✨ Features Built (`v1.1.0` — `DiaPatches.dylib` Parity)

1. **Hiding the Top URL Bar (Both Windowed & Full-Screen Modes):**
   - **Windowed mode:** The sidebar and bezel appear inside normal Chrome windows. Chrome’s native toolbar remains visible.
   - **Full-Screen Mode — Native Immersive Toolbar Hide (`⌃⌘F` + `⇧⌘F`):** Collapses Chrome's top bar natively in macOS Full Screen while keeping native Vertical Tabs.
   - **Top-Edge Hover URL Pill (`_DPRevealToolbarOnHoverEntry`):** Hovering the top center edge in Full-Screen mode peeks a floating Dia URL & navigation bar.
2. **In-Page Collapsible & Pinnable Dia Vertical Sidebar (`DPSidebar`):**
   - Slides out smoothly when hovering the **left edge (`<= 10px`)** of the viewport, or pins open via **`⌘S`**.
   - Displays **Pinned Tabs** (`_DPHidePinnedTabBorderEntry` supported), **Clickable URL Pill + 1-click Copy**, **Tidy Tabs (`✨`) & Domain Group (`📁`)** buttons, and all **Open Tabs & Colored Tab Groups**.
3. **Dia New Tab Override (`⌘T` — `_DPOpenOverBlank`):**
   - Overrides `chrome://newtab` so pressing `⌘T` opens the Dia Workspace canvas with the **Floating Dia Command Bar automatically focused** and ready to type!
4. **Floating Dia Command Bar (`⌘K` / `⌘⇧L` — `DPCommandBarOverlay`):**
   - **Blur Page Behind (`_DPCommandBarBlurEntry`)** + adjustable Blur Radius slider (`0px–32px`).
   - **Darken Page Behind (`_DPCommandBarDarkenEntry`)** + adjustable Darkness slider (`0%–85%`).
   - **Position (`_DPCommandBarPositions`):** `Like Spotlight` vs `Center of Window`.
   - **Remember What You Typed (`_DPCommandBarKeepTextEntry`):** Restores and selects your query when reopened after pressing `Escape`.
   - **Compact Command Bar (`_DPCompactCommandBarEntry`)** & **Close Tabs from Tab Switcher (`_DPCloseFromTabSwitcherEntry` via `⌘W` or `×`)**.
5. **Smart Tab Organization (`_DPTidyTabsEntry` & `_DPGroupTabsEntry`):**
   - **Tidy Tabs (`⌥⌘T`):** Automatically classifies and groups loose open tabs by subject (`dev & code`, `work & docs`, `ai & research`, `shopping`, `media`, `email`, `social & feeds`, or domain) using Chrome's native `chrome.tabs.group` + `chrome.tabGroups` APIs.
   - **Group Tabs by Domain (`⌥⌘G`):** Clusters open tabs by website domain with colored group badges.
6. **Viewport Bezel, Corners & Liquid Glass (`_DPEdgeToEdgeEntry`, `_DPSquareSidebarCornersEntry`, `_DPWindowMaterialEntry`):**
   - Outer Edge Padding (`0px–24px`), Inner Corner Radius (`0px–28px`), **Edge-to-Edge Toggle (`⌥⌘E`)**, **Square Corners Next to Sidebar**, and **Liquid Glass** material preset.
7. **Copy URL Toast (`_DPCopyToastEntry`):**
   - Press **`⌘⇧C`** to copy the current URL (`✓ Copied current URL` floating toast) or **`⌘⇧⌥C`** to copy as Markdown (`[Title](URL)` — `✓ Copied URL as Markdown`).
8. **Dia Keyboard Shortcuts Hook (`diaShortcutsEnabled`):**
   - Master toggle that hooks Dia / Arc keyboard shortcuts across all pages for features built in this version.

---

## ⌨️ Active Dia Keyboard Shortcuts (`v1.1.0`)

| Shortcut | Action | `DiaPatches.dylib` Equivalent |
| :--- | :--- | :--- |
| **`⌘K`** | Toggle Floating Dia Command Bar | `_DPCommandBarEntry` |
| **`⌘⇧L`** (or **`⌘L`**) | Open Dia Command Bar with current URL selected | `_DPCommandBarEntry` |
| **`⌘T`** | Open Dia New Tab with Command Bar focused | `_DPOpenOverBlank` |
| **`⌘⇧C`** | Copy Current URL + Show Dia Toast | `_DPCopyToastEntry` |
| **`⌘⇧⌥C`** | Copy Current URL as Markdown `[Title](URL)` + Toast | `_DPCopyURLMarkdown` |
| **`⌘S`** | Pin / Unpin In-Page Dia Vertical Tab Sidebar | `DPSidebar` |
| **`⌘⇧D`** | Toggle Chrome Full Screen | `_DPHideToolbarEntry` |
| **`⌥⌘T`** | Tidy Tabs — Smart Group Open Tabs by Subject | `_DPTidyTabsEntry` |
| **`⌥⌘G`** | Group Open Tabs by Domain | `_DPGroupTabsEntry` |
| **`⌥⌘E`** | Toggle Edge-to-Edge Web Pages (`0px` vs Padded Bezel) | `_DPEdgeToEdgeEntry` |
| **`⌃Tab`** | Open Quick Tab Switcher in Command Bar | `_DPOpenSwitcher` |
| **`⌘W`** (inside Command Bar) | Close Highlighted Tab from Switcher | `_DPCloseFromTabSwitcherEntry` |

---

## 🚀 Installation & Reload

1. Open `chrome://extensions` in Official Google Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repository folder (or click the **↻ Reload** icon on the `ArcChrome-Tweaks` card if already loaded).
4. Optional user-space macOS defaults:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
