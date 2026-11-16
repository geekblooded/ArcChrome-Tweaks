# Chrome Web Store submission draft

Status: Draft for developer review. Do not submit until the developer account owner confirms the privacy policy URL and completes the Chrome Web Store Data use disclosures.

## Store listing

**Name**  
DiaChrome Tweaks

**Short description**  
Add a Dia and Arc inspired command bar, tab sidebar, workspace styling, and keyboard shortcuts to Chrome.

**Detailed description**  
DiaChrome Tweaks adds configurable browsing controls to Google Chrome, including an in-page command bar, a tab sidebar, tab search and organization, URL copy actions, and optional page framing. It also includes a custom new-tab workspace and keyboard shortcuts. Features depend on Chrome version, operating system, and the permissions you grant.

The extension reads open-tab titles and URLs to show, search, switch, and organize tabs. Page controls use the current page title and URL for navigation and copy actions. Settings are stored using Chrome Storage Sync and local storage. The extension requests Google favicon images for site and extension icons; Google receives the URL or domain used to request each icon. The extension does not send browsing data to a developer-operated server, based on the current source review.

Some pages managed by Chrome, such as Chrome Web Store pages and internal chrome:// pages, do not allow content-script features. Tab organization and shortcut behavior may vary by platform.

**Category suggestion**  
Productivity

**Language**  
English

**Support contact**  
Developer to provide.

**Homepage / support URL**  
Developer to provide.

## Privacy policy draft

This draft must be published at a public URL controlled by the developer and reviewed for accuracy before submission.

### DiaChrome Tweaks Privacy Policy

DiaChrome Tweaks provides browser interface, tab navigation, and tab organization features in Google Chrome.

**Information accessed and processed**

- **Browsing activity (tab URLs and titles):** The extension accesses open-tab URLs and titles to display and search tabs, switch between tabs, organize tabs into groups, and provide navigation controls. The current page URL and title may be used when you invoke copy or navigation features.
- **Extension inventory:** The extension uses Chrome's extension-management API to display installed extension information and icons in its interface.
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

The developer may update this policy when the extension's behavior changes. For privacy questions, contact: **[developer contact email]**.

**Effective date:** [date of publication]

## Data use disclosure worksheet (developer dashboard)

Use this as a starting point; answer the dashboard's current questions directly and consistently with the final build.

- **Personally identifiable information:** No collection identified in the source review.
- **Health, financial, authentication, personal communications, location, web history, or user activity:** The extension accesses browsing activity in the form of tab URLs and titles. These are processed for the tab and navigation features described above. They are not sent to a developer-operated backend in the reviewed code.
- **Website content:** The content scripts run on web pages. Page title and URL are used for in-page controls and copy actions. The reviewed code does not transmit page contents to a developer-operated backend.
- **Data transfers:** Requests to Google's favicon service may include site URLs/domains. Chrome Sync handles synchronized preferences.
- **Sale / advertising / creditworthiness or lending:** No, based on the reviewed implementation.
- **Limited use certification:** The developer must confirm the final data handling complies with Chrome Web Store User Data policy before certifying.

## Permissions rationale

- `storage`: persist preferences and local icon cache.
- `tabs`: display/search/switch/rearrange tabs and create or update tabs/windows.
- `tabGroups`: create and manage groups for organization features.
- `sessions`: restore recently closed tabs/windows.
- `scripting`: inject extension UI into eligible tabs when enabled or needed.
- `management`: display installed extensions and their icons in extension UI.
- `<all_urls>` host access: run the in-page sidebar, command bar, and viewport styling on eligible sites. Chrome-restricted pages remain unavailable.

Review whether all permissions and `<all_urls>` access remain necessary in the release build; reducing access can improve user trust and store review.

## Submission notes

- Upload `di achrome-tweaks-1.1.0.zip` (actual filename uses no embedded space) from this folder.
- Provide final support contact, homepage/support URL, and public privacy policy URL.
- Add store screenshots and a promotional tile using the final listing assets.
- Complete the developer dashboard's current privacy, remote-code, and permission declarations against the exact uploaded ZIP.
- The current manifest is version `1.1.0`; Chrome Web Store updates require a version higher than any version already uploaded to the listing.
