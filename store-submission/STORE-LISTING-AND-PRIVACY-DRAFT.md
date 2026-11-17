# Chrome Web Store submission draft

Status: Draft for developer review. Confirm final package behavior, screenshots, and all Dashboard privacy declarations before submission.

## Store listing

**Name**  
ArcChrome Tweaks

**Short description**  
Bring an Arc-inspired sidebar, command bar, tab organization, and workspace controls to Chrome.

**Detailed description**  
Moving from Arc to Chrome? ArcChrome Tweaks brings familiar browsing patterns to Chrome: a left-side tab sidebar, searchable downloads, command bar, searchable tabs, tab grouping, URL actions, page framing, and a custom new-tab workspace. Keyboard shortcuts help you move through these controls. Some features vary by platform and cannot run on Chrome-restricted pages.

The extension reads tab titles and URLs to display, search, navigate, and organize tabs. It reads download names and status locally to display and search downloads, and opens or reveals files only when requested. Its content scripts add the sidebar, command bar, and visual page styling on eligible websites. The reviewed source does not send browsing history, download records, or page contents to a developer-operated backend. Google’s favicon service receives a site URL or domain when an icon is requested. Preferences use Chrome Storage Sync and local storage. See the privacy policy for details.

Some pages managed by Chrome, such as Chrome Web Store pages and internal chrome:// pages, do not allow content-script features. Tab organization and shortcut behavior may vary by platform.

**Category suggestion**  
Productivity

**Language**  
English

**Support contact**  
gaurav.sathe16@gmail.com

**Homepage / support URL**  
https://geekblooded.github.io/ArcChrome-Tweaks/

**Privacy policy URL**
https://geekblooded.github.io/ArcChrome-Tweaks/privacy.html

## Privacy policy draft

Public policy: https://geekblooded.github.io/ArcChrome-Tweaks/privacy.html

### ArcChrome Tweaks Privacy Policy

ArcChrome Tweaks provides browser interface, tab navigation, and tab organization features in Google Chrome.

**Information accessed and processed**

- **Browsing activity (tab URLs and titles):** The extension accesses open-tab URLs and titles to display and search tabs, switch between tabs, organize tabs into groups, and provide navigation controls. The current page URL and title may be used when you invoke copy or navigation features.
- **Extension inventory:** The extension uses Chrome's extension-management API to display installed extension information and icons in its interface.
- **Downloads:** The extension reads download names, dates, status and progress to display and search them locally, and can open a completed download or reveal it in the file manager at the user's request. Download records are not sent to the developer.
- **Preferences:** The extension stores your feature and appearance settings using Chrome Storage Sync and Chrome local storage. Some icon data is cached locally.

**How information is used and shared**

Tab and page information is processed by the extension to provide its user-facing features. The reviewed source contains no transmission of browsing data to a developer-operated server. To display favicons, the extension makes requests to Google's favicon service using the relevant site URL or domain; Google receives those request values and handles them under its own policies. Chrome Sync may store synchronized settings according to your Google account settings and Google's policies.

**Data sale and advertising**

The developer does not sell browsing data, use it for advertising, or transfer it to data brokers, based on the current implementation review.

**Data retention and deletion**

Settings and cached icon data remain in Chrome storage until removed by the extension, cleared in Chrome, or removed when the extension is uninstalled. Chrome Sync data is managed through your Google account and Chrome settings.

**Security**

The extension relies on Chrome's extension storage and permission model. Keep Chrome up to date and install the extension only from the official Chrome Web Store listing.

**Changes and contact**

The developer may update this policy when the extension's behavior changes. For privacy questions, contact: **gaurav.sathe16@gmail.com**.

**Effective date:** [date of publication]

## Data use disclosure worksheet (developer dashboard)

Use this as a starting point; answer the dashboard's current questions directly and consistently with the final build.

- **Personally identifiable information:** No collection identified in the source review.
- **Health, financial, authentication, personal communications, location, web history, or user activity:** The extension accesses browsing activity in the form of tab URLs and titles. These are processed for the tab and navigation features described above. They are not sent to a developer-operated backend in the reviewed code.
- **Website content:** The content scripts run on web pages. Page title and URL are used for in-page controls and copy actions. The reviewed code does not transmit page contents to a developer-operated backend.
- **Data transfers:** Requests to Google's favicon service may include site URLs/domains. Chrome Sync handles synchronized preferences.
- **Sale / advertising / creditworthiness or lending:** No, based on the reviewed implementation.
- **Limited use certification:** The developer must confirm the final data handling complies with Chrome Web Store User Data policy before certifying.

## Dashboard answer draft

### Single purpose

ArcChrome Tweaks adapts Chrome’s navigation interface for people familiar with Arc by adding a left-side tab sidebar, command bar, searchable tab switcher, tab organization, and a configurable new-tab workspace.

### Permission justifications

- **`storage`:** Save user-selected interface preferences and cache icons used by the extension UI.
- **`tabs`:** Read tab titles and URLs to display, search, switch, group, pin, move, create, update, and close tabs as requested through extension controls.
- **`tabGroups`:** Create and manage tab groups for the tab organization features.
- **`sessions`:** Restore recently closed tabs or windows when the user invokes restore.
- **`webNavigation`:** Detect eligible navigation failures for the recovery screen.
- **`downloads`:** Display and search download history and reveal a selected completed file.
- **`downloads.open`:** Open a selected completed download in response to a user action.
- **`scripting`:** Add or refresh the extension's sidebar, command bar, and page styling on eligible open tabs when needed.
- **`management`:** Display the user's installed extensions and related icons in the extension interface.
- **Host access `<all_urls>`:** Run the sidebar, command bar, keyboard interactions, and optional page framing on eligible websites. Chrome internal pages and other restricted pages are excluded by browser limitations.

### User data declarations (review against dashboard's actual choices)

- Browsing activity: **tab URLs and titles**, used for visible tab display, search, navigation, and organization features.
- Website content: **page title and current URL** used by visible controls and URL copy/navigation actions; content scripts apply UI and styling. The reviewed source does not collect or transmit page text or form content.
- Extension inventory: installed extension names/details/icons are read for the extension UI.
- User settings: saved to Chrome Sync and local extension storage.
- Third-party transmission: site URL/domain may be sent to Google's favicon service to return a favicon; extension-icon requests may go to the relevant extension homepage. No developer-operated analytics or browsing-data backend was found in the reviewed source.
- Sale, advertising, creditworthiness, or data brokerage: **No**, based on current implementation review.
- Certification: only check the Limited Use certification after the developer has verified the uploaded build, privacy policy, and dashboard answers.

These are drafting aids, not preselected dashboard answers. The account owner must check every dashboard field against the exact build and current Chrome Web Store questions.

## Permissions rationale

- `storage`: persist preferences and local icon cache.
- `tabs`: display/search/switch/rearrange tabs and create or update tabs/windows.
- `tabGroups`: create and manage groups for organization features.
- `sessions`: restore recently closed tabs/windows.
- `webNavigation`: detect eligible navigation failures for the recovery screen.
- `downloads`: show and search download records and reveal files on request.
- `downloads.open`: open a completed download on request.
- `scripting`: inject extension UI into eligible tabs when enabled or needed.
- `management`: display installed extensions and their icons in extension UI.
- `<all_urls>` host access: run the in-page sidebar, command bar, and viewport styling on eligible sites. Chrome-restricted pages remain unavailable.

Review whether all permissions and `<all_urls>` access remain necessary in the release build; reducing access can improve user trust and store review.

## Submission notes

- Upload `arcchrome-tweaks-1.1.0.zip` from this folder.
- Provide final support contact, homepage/support URL, and public privacy policy URL.
- Add store screenshots and a promotional tile using the final listing assets.
- Complete the developer dashboard's current privacy, remote-code, and permission declarations against the exact uploaded ZIP.
- The current manifest is version `1.1.0`; Chrome Web Store updates require a version higher than any version already uploaded to the listing.
