/**
 * DiaChrome-Tweaks — Background Service Worker (Manifest V3)
 *
 * Powers:
 * 1. Default settings initialization & migration (`DiaPatches.dylib` parity)
 * 2. Dynamic injection into already-open HTTP(S) tabs on install/reload
 * 3. Keyboard command shortcuts (`Cmd+K`, `Cmd+Shift+L`, `Cmd+Shift+C`, `Cmd+Shift+D`)
 * 4. Open-tab querying, switching, closing (`_DPCloseFromTabSwitcherEntry`), pinning, & reopening
 * 5. Smart Tab Grouping: `Group Tabs by Domain` (`_DPGroupTabsEntry`) & `Tidy Tabs` (`_DPTidyTabsEntry`)
 * 6. Full-screen & Frameless Dia Window (`type: 'popup'`) management
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  activationMode: 'always', // 'always' | 'fullscreen'
  edgeToEdge: false,        // _DPEdgeToEdgeEntry
  bezelSize: 10,
  cornerRadius: 12,
  squareSidebarCorners: false, // _DPSquareSidebarCornersEntry
  frameColor: '#ebecf7',
  framePreset: 'arc-lavender', // 'arc-lavender' | 'frost' | 'warm-sand' | 'mint-sage' | 'rose-quartz' | 'sky-breeze' | 'obsidian' | 'glass' | 'arc-navy' | 'warm-clay' | 'midnight-purple' | 'forest-night' | 'custom'
  insetContent: false,
  showInnerBorder: true,
  commandBarEnabled: true,
  openNewTabInCommandBar: true, // _DPOpenOverBlank
  commandBarPosition: 'spotlight', // 'spotlight' | 'center' (_DPCommandBarPositions)
  commandBarBlur: true,     // _DPCommandBarBlurEntry
  commandBarBlurRadius: 18,
  commandBarDarken: true,   // _DPCommandBarDarkenEntry
  commandBarDarkness: 48,
  commandBarKeepText: true, // _DPCommandBarKeepTextEntry
  compactCommandBar: false, // _DPCompactCommandBarEntry
  copyURLToast: true,       // _DPCopyToastEntry
  revealToolbarOnHover: true, // _DPRevealToolbarOnHoverEntry
  sidebarMode: 'always',    // 'auto' | 'always' | 'pinned' | 'off'
  hidePinnedTabBorder: false, // _DPHidePinnedTabBorderEntry
  diaShortcutsEnabled: true, // Hook Dia/Arc keyboard shortcuts
  uiTheme: 'light',
  userChangedTheme: false,
  searchEngine: 'google'
};

const TAB_GROUP_COLORS = ['blue', 'purple', 'cyan', 'green', 'yellow', 'orange', 'pink', 'red', 'grey'];

function isInjectableUrl(url) {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

async function ensureTabInjected(tabId, url) {
  if (!tabId || !isInjectableUrl(url)) return false;
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['styles/dia-frame.css']
    });
  } catch {
    // CSS already injected or restricted page
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/fullscreen-frame.js', 'content/command-palette.js']
    });
    return true;
  } catch {
    return false;
  }
}

async function injectIntoAllOpenTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && isInjectableUrl(tab.url)) {
        await ensureTabInjected(tab.id, tab.url);
      }
    }
  } catch {
    // Ignore errors during startup enumeration
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  try {
    const existing = await chrome.storage.sync.get(['uiTheme', 'userChangedTheme', 'framePreset', 'frameColor']);
    const nextSettings = { ...DEFAULT_SETTINGS };
    if (existing && existing.userChangedTheme && existing.uiTheme) {
      nextSettings.uiTheme = existing.uiTheme;
      nextSettings.userChangedTheme = true;
      if (existing.framePreset) nextSettings.framePreset = existing.framePreset;
      if (existing.frameColor) nextSettings.frameColor = existing.frameColor;
    }
    await chrome.storage.sync.set(nextSettings);
    await chrome.storage.local.set(nextSettings);
  } catch (err) {
    console.error('[DiaChrome-Tweaks] Failed to initialize settings:', err);
  }

  await injectIntoAllOpenTabs();
});

async function sendToTabWithInjectionFallback(tab, payload) {
  if (!tab || !tab.id) return false;
  try {
    await chrome.tabs.sendMessage(tab.id, payload);
    return true;
  } catch {
    if (isInjectableUrl(tab.url)) {
      const injected = await ensureTabInjected(tab.id, tab.url);
      if (injected) {
        try {
          await chrome.tabs.sendMessage(tab.id, payload);
          return true;
        } catch {
          return false;
        }
      }
    }
    return false;
  }
}

async function toggleFramelessWindow(sourceTab) {
  try {
    let tab = sourceTab;
    if (!tab || !tab.id) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    }
    const win = tab && tab.windowId
      ? await chrome.windows.get(tab.windowId)
      : await chrome.windows.getCurrent();

    // A popup window is Chrome's extension-level way to remove the tab strip and omnibox.
    if (win.type === 'popup' && tab && tab.id) {
      const allWindows = await chrome.windows.getAll({});
      let normalWin = allWindows.find((w) => w.type === 'normal' && w.id !== win.id);
      if (!normalWin) {
        normalWin = await chrome.windows.create({ tabId: tab.id, type: 'normal', focused: true });
        await chrome.windows.remove(win.id);
        framelessTabPool = framelessTabPool.filter((entry) => entry.windowId !== win.id);
        activeFramelessVirtualId = null;
        notifyWindowMode(tab.id, normalWin.id);
        return { ok: true, mode: 'normal', windowId: normalWin.id };
      }
      if (normalWin) {
        await chrome.tabs.move(tab.id, { windowId: normalWin.id, index: -1 });
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.remove(win.id);
        await chrome.windows.update(normalWin.id, { focused: true });
        framelessTabPool = framelessTabPool.filter((entry) => entry.windowId !== win.id);
        activeFramelessVirtualId = null;
        notifyWindowMode(tab.id, normalWin.id);
        return { ok: true, mode: 'normal' };
      }
    }

    if (win.type !== 'popup' && tab?.id) {
      const popup = await chrome.windows.create({ tabId: tab.id, type: 'popup', focused: true });
      notifyWindowMode(tab.id, popup.id);
      return { ok: true, mode: 'frameless', windowId: popup.id };
    }

    return { ok: false, mode: win.type === 'popup' ? 'frameless' : 'normal' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function notifyWindowMode(tabId, windowId) {
  try {
    const win = await chrome.windows.get(windowId);
    await chrome.tabs.sendMessage(tabId, {
      type: 'DIA_WINDOW_STATE_CHANGED',
      isFullscreen: win.state === 'fullscreen',
      isFrameless: win.type === 'popup',
      windowState: win.state,
      windowType: win.type
    });
  } catch {
    // The new document may not have installed its content script yet.
  }
}

// Extract clean domain label for _DPGroupTabsEntry
function extractDomainLabel(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    let host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) {
      const sld = parts[parts.length - 2];
      if (sld.length > 2 || parts.length === 2) {
        return sld.charAt(0).toUpperCase() + sld.slice(1);
      }
    }
    return host;
  } catch {
    return 'Other';
  }
}

// Smart intent & project folder classifier for "Tidy up"
const INTENT_STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'are', 'was',
  'new', 'tab', 'page', 'home', 'google', 'search', 'web', 'app', 'com', 'org', 'net',
  'how', 'what', 'why', 'when', 'where', 'best', 'free', 'online', 'official', 'site',
  'login', 'sign', 'dashboard', 'welcome', 'untitled', 'index', 'http', 'https', 'www'
]);

function extractSignificantKeywords(tab) {
  const raw = `${tab.title || ''} ${ extractDomainLabel(tab.url || '') }`
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase();
  const words = raw.split(/\s+/).filter((w) => w.length >= 3 && !INTENT_STOPWORDS.has(w) && !/^\d+$/.test(w));
  return [...new Set(words)];
}

function classifyTabIntentProject(tab, sharedProjectKeywordMap) {
  // 1. Check if tab belongs to a multi-tab shared project/topic cluster inferred from open tab titles
  if (sharedProjectKeywordMap) {
    const words = extractSignificantKeywords(tab);
    for (const [kw, projectTitle] of sharedProjectKeywordMap.entries()) {
      if (words.includes(kw)) {
        return projectTitle;
      }
    }
  }

  const title = (tab.title || '').toLowerCase();
  const url = (tab.url || '').toLowerCase();
  const combined = `${title} ${url}`;

  if (/figma\.com|dribbble\.com|behance\.net|iconly|hugeicons|mobbin|framer\.com|canva\.com|font|typography|design|ui|ux|prototype|color/.test(combined)) {
    return 'Design & UI';
  }
  if (/github\.com|gitlab\.com|stackoverflow\.com|localhost|127\.0\.0\.1|vercel\.com|netlify\.com|npmjs\.com|developer\.chrome\.com|mdn|docs\.|api|code|pull request|issue|repo|terminal/.test(combined)) {
    return 'Engineering & Dev';
  }
  if (/chatgpt\.com|claude\.ai|gemini\.google|perplexity\.ai|huggingface\.co|openai\.com|anthropic|arxiv\.org|scholar\.google|research|llm|model/.test(combined)) {
    return 'AI & Research';
  }
  if (/docs\.google\.com|sheets\.google|slides\.google|notion\.so|linear\.app|jira|atlassian|confluence|slack\.com|miro\.com|calendar\.google|trello|asana|roadmap|sprint/.test(combined)) {
    return 'Workspace & Docs';
  }
  if (/youtube\.com|netflix\.com|spotify\.com|twitch\.tv|vimeo\.com|soundcloud\.com|music|video|podcast/.test(combined)) {
    return 'Media & Watch';
  }
  if (/amazon\.|flipkart\.|ebay\.|nike\.|adidas\.|shop|cart|checkout|price|buy|store|product/.test(combined)) {
    return 'Shopping';
  }
  if (/mail\.google\.com|outlook\.|proton\.me|inbox|message/.test(combined)) {
    return 'Communications';
  }
  if (/twitter\.com|x\.com|reddit\.com|linkedin\.com|news\.ycombinator\.com|threads\.net|instagram\.com|medium\.com|substack\.com/.test(combined)) {
    return 'Social & Reading';
  }
  const domain = extractDomainLabel(tab.url);
  return domain && domain !== 'Other' ? `${domain} Space` : 'General Explore';
}

function buildSharedProjectMap(tabs) {
  const freq = new Map();
  for (const tab of tabs) {
    const words = extractSignificantKeywords(tab);
    for (const w of words) {
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  // Pick top specific keywords shared by at least 2 tabs (up to 3 dynamic project clusters)
  const candidates = [...freq.entries()]
    .filter(([w, count]) => count >= 2 && w.length >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const projectMap = new Map();
  for (const [kw] of candidates) {
    const formatted = kw.charAt(0).toUpperCase() + kw.slice(1);
    projectMap.set(kw, `${formatted} Project`);
  }
  return projectMap;
}

async function groupTabsByDomain(windowId) {
  try {
    const tabs = await chrome.tabs.query(windowId ? { windowId } : { currentWindow: true });
    const unpinned = tabs.filter((t) => !t.pinned && t.id && isInjectableUrl(t.url));
    if (unpinned.length === 0) {
      return { ok: true, groupsCreated: 0, tabsGrouped: 0, message: 'No loose web tabs to group.' };
    }

    const byDomain = new Map();
    for (const tab of unpinned) {
      const label = extractDomainLabel(tab.url);
      if (!byDomain.has(label)) byDomain.set(label, []);
      byDomain.get(label).push(tab.id);
    }

    let groupsCreated = 0;
    let tabsGrouped = 0;
    let colorIdx = 0;

    for (const [domainLabel, tabIds] of byDomain.entries()) {
      if (tabIds.length < 1) continue;
      // Group domains with 2+ tabs, or all domains if fewer than 4 total domains
      if (tabIds.length >= 2 || byDomain.size <= 4) {
        const groupId = await chrome.tabs.group({ tabIds });
        if (chrome.tabGroups && typeof chrome.tabGroups.update === 'function') {
          await chrome.tabGroups.update(groupId, {
            title: domainLabel,
            color: TAB_GROUP_COLORS[colorIdx % TAB_GROUP_COLORS.length]
          });
        }
        colorIdx++;
        groupsCreated++;
        tabsGrouped += tabIds.length;
      }
    }

    const message =
      groupsCreated > 0
        ? `Grouped ${tabsGrouped} tab${tabsGrouped === 1 ? '' : 's'} into ${groupsCreated} domain group${groupsCreated === 1 ? '' : 's'}`
        : 'No multi-tab domains found to group.';
    return { ok: true, groupsCreated, tabsGrouped, message };
  } catch (err) {
    return { ok: false, error: String(err), message: 'Could not group tabs in this window.' };
  }
}

const customTabFolderAssignment = new Map();

// Multi-tab workspace pool for Frameless Popup Windows (so opening a New Tab inside a frameless window adds a new tab in the Sidebar instead of overwriting the existing tab or spawning a new window)
let framelessTabPool = [];
let activeFramelessVirtualId = null;
let nextFramelessVirtualId = 900001;
const popupChildTabs = new Map();
const popupChildTabsInFlight = new Set();

// Convert fresh one-tab normal windows while the Arc experience is enabled.
// A short settling window lets Chrome finish creating the initial tab and avoids
// disrupting restored windows that contain multiple tabs.
const pendingNewWindowIds = new Set();
const processingNewWindowIds = new Set();

async function frameNewWindow(windowId) {
  if (!pendingNewWindowIds.has(windowId) || processingNewWindowIds.has(windowId)) return;
  processingNewWindowIds.add(windowId);

  try {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const { enabled = true } = await chrome.storage.sync.get({ enabled: true });
    if (!enabled) return;

    const win = await chrome.windows.get(windowId);
    if (win.type !== 'normal') return;

    const tabs = await chrome.tabs.query({ windowId });
    if (tabs.length !== 1) return;

    const tab = tabs[0];
    if (tab.openerTabId && isInjectableUrl(tab.pendingUrl || tab.url)) {
      try {
        const opener = await chrome.tabs.get(tab.openerTabId);
        const openerWindow = await chrome.windows.get(opener.windowId);
        if (openerWindow.type === 'popup') return;
      } catch {
        // Continue with the ordinary new-window handoff if its opener disappeared.
      }
    }
    const isNewTabPage = /^chrome:\/\/newtab(?:\/|$)/i.test(tab.url || '');
    if (isNewTabPage) {
      await chrome.windows.create({
        url: chrome.runtime.getURL('newtab/newtab.html'),
        type: 'popup',
        focused: true
      });
      await chrome.windows.remove(windowId);
    } else if (tab.id) {
      const popup = await chrome.windows.create({ tabId: tab.id, type: 'popup', focused: true });
      try {
        await chrome.windows.remove(windowId);
      } catch {
        // Chrome may close an empty source window automatically.
      }
      notifyWindowMode(tab.id, popup.id);
    }

    await broadcastTabsUpdated();
  } catch {
    // The window may have been closed or changed while Chrome was creating it.
  } finally {
    pendingNewWindowIds.delete(windowId);
    processingNewWindowIds.delete(windowId);
  }
}

chrome.windows.onCreated.addListener((win) => {
  if (win.type !== 'normal' || typeof win.id !== 'number') return;
  pendingNewWindowIds.add(win.id);
  frameNewWindow(win.id);
});

chrome.tabs.onCreated.addListener((tab) => {
  if (pendingNewWindowIds.has(tab.windowId)) {
    frameNewWindow(tab.windowId);
  }
  if (tab.openerTabId && typeof tab.id === 'number') {
    popupChildTabs.set(tab.id, tab.openerTabId);
    adoptPopupChildTab(tab.id);
    setTimeout(() => adoptPopupChildTab(tab.id), 100);
  }
});

function getFaviconFallback(url) {
  if (!url || !/^https?:\/\//i.test(url)) return '';
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
}

function syncPopupTabIntoPool(popupTab) {
  if (!popupTab || !popupTab.id) return;
  if (framelessTabPool.length === 0) {
    const id = nextFramelessVirtualId++;
    framelessTabPool.push({
      id,
      windowId: popupTab.windowId,
      title: popupTab.title || extractDomainLabel(popupTab.url) || 'New Tab',
      url: popupTab.url || '',
      favIconUrl: popupTab.favIconUrl || getFaviconFallback(popupTab.url),
      pinned: Boolean(popupTab.pinned),
      audible: Boolean(popupTab.audible),
      groupId: -1,
      groupTitle: null,
      groupColor: null,
      isVirtual: true
    });
    activeFramelessVirtualId = id;
    return;
  }

  let activeEntry = framelessTabPool.find((e) => e.id === activeFramelessVirtualId);
  if (!activeEntry) {
    activeEntry = framelessTabPool[framelessTabPool.length - 1];
    activeFramelessVirtualId = activeEntry.id;
  }

  if (popupTab.url) {
    activeEntry.url = popupTab.url;
  }
  if (popupTab.title) {
    activeEntry.title = popupTab.title;
  }
  if (popupTab.favIconUrl) {
    activeEntry.favIconUrl = popupTab.favIconUrl;
  } else if (popupTab.url) {
    activeEntry.favIconUrl = getFaviconFallback(popupTab.url);
  }
  activeEntry.windowId = popupTab.windowId;
}

async function adoptPopupChildTab(childTabId) {
  const openerTabId = popupChildTabs.get(childTabId);
  if (!openerTabId || popupChildTabsInFlight.has(childTabId)) return;
  popupChildTabsInFlight.add(childTabId);

  try {
    const [childTab, openerTab] = await Promise.all([
      chrome.tabs.get(childTabId),
      chrome.tabs.get(openerTabId)
    ]);
    const url = childTab.pendingUrl || childTab.url || '';
    if (!isInjectableUrl(url)) return;

    const openerWindow = await chrome.windows.get(openerTab.windowId);
    if (openerWindow.type !== 'popup') {
      popupChildTabs.delete(childTabId);
      return;
    }

    syncPopupTabIntoPool(openerTab);
    const virtualId = nextFramelessVirtualId++;
    framelessTabPool.push({
      id: virtualId,
      windowId: openerWindow.id,
      title: childTab.title || extractDomainLabel(url) || 'New Tab',
      url,
      favIconUrl: childTab.favIconUrl || getFaviconFallback(url),
      pinned: false,
      audible: false,
      groupId: -1,
      groupTitle: null,
      groupColor: null,
      isVirtual: true
    });
    activeFramelessVirtualId = virtualId;

    await chrome.tabs.update(openerTab.id, { url, active: true });
    await chrome.windows.update(openerWindow.id, { focused: true });
    try {
      await chrome.tabs.remove(childTabId);
    } catch {
      // Chrome may already have closed the transient child tab.
    }
    notifyWindowMode(openerTab.id, openerWindow.id);
    await broadcastTabsUpdated();
    popupChildTabs.delete(childTabId);
  } catch {
    // Keep a pending entry until the URL arrives through tabs.onUpdated.
  } finally {
    popupChildTabsInFlight.delete(childTabId);
  }
}

async function tidyTabsBySubject(windowId) {
  try {
    const allTabs = await getEnrichedOpenTabs();
    const unpinned = allTabs.filter((t) => !t.pinned && t.id);
    if (unpinned.length === 0) {
      return { ok: true, groupsCreated: 0, tabsGrouped: 0, message: 'There are no loose tabs to tidy.' };
    }

    const sharedProjectMap = buildSharedProjectMap(unpinned);
    const bySubject = new Map();
    for (const tab of unpinned) {
      const subject = classifyTabIntentProject(tab, sharedProjectMap);
      if (!bySubject.has(subject)) bySubject.set(subject, []);
      bySubject.get(subject).push(tab.id);
    }

    let groupsCreated = 0;
    let tabsGrouped = 0;
    let colorIdx = 0;

    for (const [subject, tabIds] of bySubject.entries()) {
      if (tabIds.length === 0) continue;
      const color = TAB_GROUP_COLORS[colorIdx % TAB_GROUP_COLORS.length];
      colorIdx++;

      // Store smart folder assignment for both real tabs and frameless virtual tabs
      for (const tid of tabIds) {
        customTabFolderAssignment.set(tid, { title: subject, color });
        const vEntry = framelessTabPool.find((e) => e.id === tid);
        if (vEntry) {
          vEntry.groupTitle = subject;
          vEntry.groupColor = color;
        }
      }

      const realTabIds = tabIds.filter((tid) => tid < 900000);
      if (realTabIds.length > 0) {
        try {
          const groupId = await chrome.tabs.group({ tabIds: realTabIds });
          if (chrome.tabGroups && typeof chrome.tabGroups.update === 'function') {
            await chrome.tabGroups.update(groupId, {
              title: subject,
              color
            });
          }
        } catch {
          // Fallback to customTabFolderAssignment if window type does not support native tabGroups
        }
      }

      groupsCreated++;
      tabsGrouped += tabIds.length;
    }

    const message =
      groupsCreated > 0
        ? `Organized ${tabsGrouped} tab${tabsGrouped === 1 ? '' : 's'} into ${groupsCreated} smart folder${groupsCreated === 1 ? '' : 's'}`
        : 'No tabs clearly belonged together.';
    return { ok: true, groupsCreated, tabsGrouped, message };
  } catch (err) {
    return { ok: false, error: String(err), message: 'Could not tidy tabs in this window.' };
  }
}

async function getEnrichedOpenTabs() {
  const tabs = await chrome.tabs.query({});
  const windows = await chrome.windows.getAll({});
  const popupWinIds = new Set(windows.filter((w) => w.type === 'popup').map((w) => w.id));

  const groupMap = new Map();
  if (chrome.tabGroups && typeof chrome.tabGroups.query === 'function') {
    try {
      const groups = await chrome.tabGroups.query({});
      for (const g of groups) {
        groupMap.set(g.id, { title: g.title || 'Folder', color: g.color || 'grey', collapsed: g.collapsed });
      }
    } catch {
      // Ignore tabGroups errors if unsupported in popup windows
    }
  }

  const enriched = [];

  for (const t of tabs) {
    if (popupWinIds.has(t.windowId)) {
      syncPopupTabIntoPool(t);
      continue;
    }
    const groupInfo =
      t.groupId && t.groupId > -1
        ? groupMap.get(t.groupId)
        : customTabFolderAssignment.get(t.id) || null;
    enriched.push({
      id: t.id,
      windowId: t.windowId,
      title: t.title || 'Untitled',
      url: t.url || '',
      favIconUrl: t.favIconUrl || getFaviconFallback(t.url),
      active: Boolean(t.active) && popupWinIds.size === 0,
      pinned: Boolean(t.pinned),
      audible: Boolean(t.audible),
      groupId: t.groupId ?? -1,
      groupTitle: groupInfo ? groupInfo.title : null,
      groupColor: groupInfo ? groupInfo.color : null
    });
  }

  if (popupWinIds.size > 0 && framelessTabPool.length > 0) {
    for (const v of framelessTabPool) {
      const customGroup = customTabFolderAssignment.get(v.id);
      enriched.push({
        id: v.id,
        windowId: v.windowId,
        title: v.title || extractDomainLabel(v.url) || 'Untitled',
        url: v.url || '',
        favIconUrl: v.favIconUrl || getFaviconFallback(v.url),
        active: v.id === activeFramelessVirtualId,
        pinned: Boolean(v.pinned),
        audible: false,
        groupId: -1,
        groupTitle: v.groupTitle || (customGroup ? customGroup.title : null),
        groupColor: v.groupColor || (customGroup ? customGroup.color : null),
        isVirtual: true
      });
    }
  }

  return enriched;
}

function buildExtensionBadgeDataUrl(name, id) {
  const palette = ['#5e5ce6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
  let hash = 0;
  const seed = id || name || 'ext';
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const bg = palette[hash % palette.length];
  const clean = (name || 'E').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const initials = clean.slice(0, 2) || 'EX';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${bg}"/><text x="16" y="20.5" text-anchor="middle" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="13" font-weight="700">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const realExtIconMemoryCache = new Map();
const KNOWN_EXTENSION_ICONS = {
  degmhkcaeoamggineifpdgneflgajiog:
    'data:image/png;base64,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',
  ghbmnnjooekpmoecnnnilnnbdlolhkhi:
    'data:image/png;base64,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',
  gmloihcgbhbonllenincdakeijmikcne:
    'data:image/png;base64,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',
  hkgfoiooedgoejojocmhlaklaeopbecg:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAA3NCSVQICAjb4U/gAAAAP1BMVEVHcEz///////8AAAD////////////////////////BwcGCgoLKysrGxsa2trbU1NRDQ0NlZWWamprMzMxHcEwZSsnNAAAAFXRSTlMABf//3YVAVOmK/////////////wAgUrRDAAAAs0lEQVRYhe2X2Q6DIBBF8SLKUsHl//+1irFPpHGYNrXtnCde7glLMrkoJVyE3rUg07r+yBt6esfseQfEUZMZI+Dy/oGJHt+YgO0UFnNdXusZVqkGqM1rDTSqw1AvGNCtV+DzOt1IpBzy6yUcAuoTiuDKAssWnJ0M7xNwj3CavxHEUCASBKE0hoIIRCCCLxQkXyARBE/4RcEykFgeAnbNYxdNdtXll21O3Tev+XDwvzzCp7kD788qqx2w2hwAAAAASUVORK5CYII='
};

async function fetchUrlAsDataUri(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const blob = await resp.blob();
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${blob.type || 'image/png'};base64,${btoa(binary)}`;
}

async function resolveExtensionIconDataUrl(ext) {
  if (!ext || !ext.id) return buildExtensionBadgeDataUrl('Ext', 'ext');

  if (realExtIconMemoryCache.has(ext.id)) {
    return realExtIconMemoryCache.get(ext.id);
  }

  // 1. Self extension icon
  if (ext.id === chrome.runtime.id) {
    try {
      const dataUri = await fetchUrlAsDataUri(chrome.runtime.getURL('icons/icon-48.png'));
      realExtIconMemoryCache.set(ext.id, dataUri);
      return dataUri;
    } catch {
      // Fall through
    }
  }

  // 2. Known official developer extension icons (DesignOS, Google Docs Offline, QR Code Reader, Picture-in-Picture, etc.)
  if (KNOWN_EXTENSION_ICONS[ext.id]) {
    realExtIconMemoryCache.set(ext.id, KNOWN_EXTENSION_ICONS[ext.id]);
    return KNOWN_EXTENSION_ICONS[ext.id];
  }
  if (/designos/i.test(ext.name || '')) {
    const icon = KNOWN_EXTENSION_ICONS.degmhkcaeoamggineifpdgneflgajiog;
    realExtIconMemoryCache.set(ext.id, icon);
    return icon;
  }

  // 3. Check persistent storage cache
  try {
    const cacheKey = `extIcon_${ext.id}`;
    const stored = await chrome.storage.local.get(cacheKey);
    if (stored && stored[cacheKey]) {
      realExtIconMemoryCache.set(ext.id, stored[cacheKey]);
      return stored[cacheKey];
    }
  } catch {
    // Ignore storage read error
  }

  // 4. Fallback to high-res developer domain icon if homepageUrl exists (non-restricted HTTPS origin)
  if (
    ext.homepageUrl &&
    /^https?:\/\//i.test(ext.homepageUrl) &&
    !/chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(ext.homepageUrl)
  ) {
    try {
      const favUrl = `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(ext.homepageUrl)}`;
      const dataUri = await fetchUrlAsDataUri(favUrl);
      realExtIconMemoryCache.set(ext.id, dataUri);
      await chrome.storage.local.set({ [`extIcon_${ext.id}`]: dataUri });
      return dataUri;
    } catch {
      // Fall through
    }
  }

  return buildExtensionBadgeDataUrl(ext.shortName || ext.name, ext.id);
}

async function getInstalledExtensionsList() {
  if (!chrome.management || typeof chrome.management.getAll !== 'function') {
    return [];
  }
  try {
    const all = await chrome.management.getAll();
    const enabledExts = all.filter((item) => item.enabled && item.type === 'extension');
    const result = [];
    for (const ext of enabledExts.slice(0, 8)) {
      const iconDataUrl = await resolveExtensionIconDataUrl(ext);
      result.push({
        id: ext.id,
        name: ext.shortName || ext.name,
        fullName: ext.name,
        optionsUrl: ext.optionsUrl || '',
        isSelf: ext.id === chrome.runtime.id,
        iconDataUrl
      });
    }
    return result;
  } catch {
    return [];
  }
}

// Listen for global keyboard shortcuts defined in manifest.json
chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) return;

    if (command === 'toggle-frameless-window') {
      await toggleFramelessWindow(activeTab);
      return;
    }

    if (command === 'copy-current-url') {
      await sendToTabWithInjectionFallback(activeTab, {
        type: 'DIA_COPY_CURRENT_URL',
        format: 'url'
      });
      return;
    }

    const mode = command === 'open-url-bar' ? 'url' : 'command';
    const delivered = await sendToTabWithInjectionFallback(activeTab, {
      type: 'DIA_TOGGLE_COMMAND_BAR',
      mode
    });

    if (!delivered) {
      await chrome.tabs.create({ url: 'chrome://newtab' });
    }
  } catch (err) {
    console.error('[DiaChrome-Tweaks] Command error:', err);
  }
});

// Broadcast window fullscreen state changes to active tab
chrome.windows.onBoundsChanged.addListener(async (win) => {
  try {
    const isFullscreen = win.state === 'fullscreen';
    const isFrameless = win.type === 'popup';
    const tabs = await chrome.tabs.query({ active: true, windowId: win.id });
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'DIA_WINDOW_STATE_CHANGED',
            isFullscreen,
            isFrameless,
            windowState: win.state,
            windowType: win.type
          });
        } catch {
          // Restricted page
        }
      }
    }
  } catch {
    // Ignore transient window lookup errors
  }
});

// Broadcast tab list updates so the in-page Dia Vertical Sidebar updates live
async function broadcastTabsUpdated() {
  try {
    const enriched = await getEnrichedOpenTabs();
    const activeTabs = await chrome.tabs.query({ active: true });
    for (const tab of activeTabs) {
      if (tab.id && isInjectableUrl(tab.url)) {
        try {
          const win = await chrome.windows.get(tab.windowId);
          const effectiveActiveId =
            win.type === 'popup' && activeFramelessVirtualId ? activeFramelessVirtualId : tab.id;
          await chrome.tabs.sendMessage(tab.id, {
            type: 'DIA_TABS_UPDATED',
            tabs: enriched,
            activeTabId: effectiveActiveId
          });
        } catch {
          // Ignore tabs without content script
        }
      }
    }
  } catch {
    // Ignore transient broadcast errors
  }
}

chrome.tabs.onCreated.addListener(() => { broadcastTabsUpdated(); });
chrome.tabs.onRemoved.addListener((tabId) => {
  popupChildTabs.delete(tabId);
  broadcastTabsUpdated();
});
chrome.tabs.onActivated.addListener(() => { broadcastTabsUpdated(); });
chrome.tabs.onMoved.addListener(() => { broadcastTabsUpdated(); });
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (popupChildTabs.has(tabId) && (changeInfo.url || changeInfo.status === 'complete')) {
    adoptPopupChildTab(tabId);
  }
  if (changeInfo.title || changeInfo.status === 'complete' || changeInfo.pinned !== undefined || changeInfo.favIconUrl) {
    broadcastTabsUpdated();
  }
});

// Message router for content scripts, New Tab override, and popup UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'DIA_ACTIVATE_ARC') {
    (async () => {
      try {
        await chrome.storage.sync.set({ enabled: true });
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab) {
          if (!activeTab.url || !isInjectableUrl(activeTab.url)) {
            await chrome.tabs.update(activeTab.id, { url: 'https://www.google.com' });
          } else {
            await ensureTabInjected(activeTab.id, activeTab.url);
          }
          const activeWindow = await chrome.windows.get(activeTab.windowId);
          if (activeWindow.type !== 'popup') {
            await toggleFramelessWindow(activeTab);
          }
        }
        await broadcastTabsUpdated();
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_DEACTIVATE_ARC') {
    (async () => {
      try {
        await chrome.storage.sync.set({ enabled: false });
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
          const activeWindow = await chrome.windows.get(activeTab.windowId);
          if (activeWindow.type === 'popup') {
            await toggleFramelessWindow(activeTab);
          }
        }
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_GET_WINDOW_STATE') {
    (async () => {
      try {
        const windowId = sender.tab?.windowId;
        const win = windowId
          ? await chrome.windows.get(windowId)
          : await chrome.windows.getCurrent();
        if (win.type === 'popup' && sender.tab) {
          syncPopupTabIntoPool(sender.tab);
        }
        sendResponse({
          isFullscreen: win.state === 'fullscreen',
          isFrameless: win.type === 'popup',
          windowState: win.state,
          windowType: win.type,
          activeTabId:
            win.type === 'popup' && activeFramelessVirtualId
              ? activeFramelessVirtualId
              : sender.tab?.id ?? null
        });
      } catch {
        sendResponse({ isFullscreen: false, isFrameless: false, windowState: 'normal', windowType: 'normal' });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_GET_OPEN_TABS') {
    (async () => {
      try {
        const tabs = await getEnrichedOpenTabs();
        let effectiveActiveId = sender.tab?.id ?? null;
        if (sender.tab?.windowId) {
          const win = await chrome.windows.get(sender.tab.windowId);
          if (win.type === 'popup' && activeFramelessVirtualId) {
            effectiveActiveId = activeFramelessVirtualId;
          }
        }
        sendResponse({ tabs, activeTabId: effectiveActiveId });
      } catch (err) {
        sendResponse({ tabs: [], error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_SWITCH_TAB') {
    (async () => {
      try {
        const { tabId, windowId } = message;
        if (!tabId) {
          sendResponse({ ok: false });
          return;
        }
        // Check if caller is inside a Frameless Popup Window (type === 'popup')
        if (sender.tab && sender.tab.windowId) {
          const callerWin = await chrome.windows.get(sender.tab.windowId);
          if (callerWin.type === 'popup') {
            syncPopupTabIntoPool(sender.tab);
            const virtualTarget = framelessTabPool.find((v) => v.id === tabId);
            if (virtualTarget) {
              activeFramelessVirtualId = virtualTarget.id;
              await chrome.tabs.update(sender.tab.id, { url: virtualTarget.url });
              await broadcastTabsUpdated();
              sendResponse({ ok: true, navigatedInFrameless: true });
              return;
            }
            if (sender.tab.id !== tabId) {
              const targetTab = await chrome.tabs.get(tabId);
              if (targetTab && targetTab.url) {
                const newId = nextFramelessVirtualId++;
                framelessTabPool.push({
                  id: newId,
                  windowId: sender.tab.windowId,
                  title: targetTab.title || extractDomainLabel(targetTab.url) || 'Tab',
                  url: targetTab.url,
                  favIconUrl: targetTab.favIconUrl || getFaviconFallback(targetTab.url),
                  pinned: Boolean(targetTab.pinned),
                  audible: false,
                  groupId: -1,
                  groupTitle: null,
                  groupColor: null,
                  isVirtual: true
                });
                activeFramelessVirtualId = newId;
                await chrome.tabs.update(sender.tab.id, { url: targetTab.url });
                await broadcastTabsUpdated();
                sendResponse({ ok: true, navigatedInFrameless: true });
                return;
              }
            }
          }
        }

        if (sender.tab?.windowId) {
          const virtualTarget = framelessTabPool.find((entry) => entry.id === tabId);
          if (virtualTarget) {
            await chrome.tabs.update(sender.tab.id, { url: virtualTarget.url, active: true });
          } else {
            const targetTab = await chrome.tabs.get(tabId);
            if (targetTab.windowId !== sender.tab.windowId) {
              await chrome.tabs.move(targetTab.id, { windowId: sender.tab.windowId, index: -1 });
            }
            await chrome.tabs.update(targetTab.id, { active: true });
          }
          await chrome.windows.update(sender.tab.windowId, { focused: true });
          sendResponse({ ok: true, navigatedInCurrentWindow: true });
          return;
        }

        await chrome.tabs.update(tabId, { active: true });
        if (windowId) {
          await chrome.windows.update(windowId, { focused: true });
        }
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_CLOSE_TAB') {
    (async () => {
      try {
        const targetId = message.tabId || sender.tab?.id;
        const vIdx = framelessTabPool.findIndex((v) => v.id === targetId);
        if (vIdx !== -1) {
          const wasActive = framelessTabPool[vIdx].id === activeFramelessVirtualId;
          framelessTabPool.splice(vIdx, 1);
          if (wasActive && framelessTabPool.length > 0 && sender.tab?.id) {
            const nextEntry = framelessTabPool[Math.max(0, vIdx - 1)];
            activeFramelessVirtualId = nextEntry.id;
            await chrome.tabs.update(sender.tab.id, { url: nextEntry.url });
          } else if (framelessTabPool.length === 0 && sender.tab?.id) {
            await chrome.tabs.remove(sender.tab.id);
          }
          const tabs = await getEnrichedOpenTabs();
          sendResponse({ ok: true, tabs, activeTabId: activeFramelessVirtualId });
          await broadcastTabsUpdated();
          return;
        }
        if (targetId) {
          await chrome.tabs.remove(targetId);
        }
        const tabs = await getEnrichedOpenTabs();
        sendResponse({ ok: true, tabs });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_TOGGLE_PIN_TAB') {
    (async () => {
      try {
        if (sender.tab?.windowId) {
          const callerWin = await chrome.windows.get(sender.tab.windowId);
          if (callerWin.type === 'popup') {
            syncPopupTabIntoPool(sender.tab);
            const activeEntry = framelessTabPool.find((v) => v.id === activeFramelessVirtualId);
            if (activeEntry) {
              activeEntry.pinned = !activeEntry.pinned;
              await broadcastTabsUpdated();
              sendResponse({ ok: true, pinned: activeEntry.pinned });
              return;
            }
          }
        }
        const targetId = message.tabId || sender.tab?.id;
        if (!targetId) {
          sendResponse({ ok: false });
          return;
        }
        const tab = await chrome.tabs.get(targetId);
        const updated = await chrome.tabs.update(targetId, { pinned: !tab.pinned });
        sendResponse({ ok: true, pinned: updated.pinned });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_REOPEN_CLOSED_TAB') {
    (async () => {
      try {
        if (chrome.sessions && typeof chrome.sessions.restore === 'function') {
          await chrome.sessions.restore();
          sendResponse({ ok: true });
        } else {
          sendResponse({ ok: false, error: 'Sessions API unavailable' });
        }
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_GROUP_TABS_BY_DOMAIN') {
    (async () => {
      const result = await groupTabsByDomain(sender.tab?.windowId || message.windowId);
      await broadcastTabsUpdated();
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === 'DIA_TIDY_TABS') {
    (async () => {
      const result = await tidyTabsBySubject(sender.tab?.windowId || message.windowId);
      await broadcastTabsUpdated();
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === 'DIA_NAVIGATE') {
    (async () => {
      try {
        const { url, newTab } = message;
        if (!url) {
          sendResponse({ ok: false });
          return;
        }
        // If caller opens a New Tab (+ New Tab / ⌘T / ⌘K)
        if (newTab) {
          if (sender.tab?.windowId) {
            const callerWin = await chrome.windows.get(sender.tab.windowId);
            if (callerWin.type === 'popup') {
              // Preserve the existing tab in framelessTabPool and add a brand-new tab entry in the Sidebar!
              syncPopupTabIntoPool(sender.tab);
              const newId = nextFramelessVirtualId++;
              framelessTabPool.push({
                id: newId,
                windowId: sender.tab.windowId,
                title: extractDomainLabel(url) || 'New Tab',
                url,
                favIconUrl: getFaviconFallback(url),
                pinned: false,
                audible: false,
                groupId: -1,
                groupTitle: null,
                groupColor: null,
                isVirtual: true
              });
              activeFramelessVirtualId = newId;
              await chrome.tabs.update(sender.tab.id, { url });
              await broadcastTabsUpdated();
              sendResponse({ ok: true, activeTabId: newId });
              return;
            }
            // Normal / Fullscreen window: create a new tab in the exact same window
            await chrome.tabs.create({ windowId: callerWin.id, url, active: true });
            sendResponse({ ok: true });
            return;
          }
          await chrome.tabs.create({ url, active: true });
        } else if (sender.tab?.id) {
          if (sender.tab.windowId) {
            const callerWin = await chrome.windows.get(sender.tab.windowId);
            if (callerWin.type === 'popup') {
              syncPopupTabIntoPool(sender.tab);
              const activeEntry = framelessTabPool.find((v) => v.id === activeFramelessVirtualId);
              if (activeEntry) {
                activeEntry.url = url;
                activeEntry.title = extractDomainLabel(url) || activeEntry.title;
                activeEntry.favIconUrl = getFaviconFallback(url);
              }
            }
          }
          await chrome.tabs.update(sender.tab.id, { url });
        } else {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab?.id) {
            await chrome.tabs.update(activeTab.id, { url });
          } else {
            await chrome.tabs.create({ url });
          }
        }
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_TOGGLE_FULLSCREEN') {
    (async () => {
      try {
        const windowId = sender.tab?.windowId;
        const win = windowId
          ? await chrome.windows.get(windowId)
          : await chrome.windows.getCurrent();
        const nextState = win.state === 'fullscreen' ? 'normal' : 'fullscreen';
        await chrome.windows.update(win.id, { state: nextState });
        sendResponse({ ok: true, state: nextState });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_TOGGLE_FRAMELESS_WINDOW') {
    (async () => {
      const result = await toggleFramelessWindow(sender.tab);
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === 'DIA_ENSURE_ACTIVE_TAB_INJECTED') {
    (async () => {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab || !activeTab.id) {
          sendResponse({ ok: false, restricted: true });
          return;
        }
        if (!isInjectableUrl(activeTab.url)) {
          sendResponse({ ok: false, restricted: true, url: activeTab.url });
          return;
        }
        const ok = await ensureTabInjected(activeTab.id, activeTab.url);
        sendResponse({ ok, restricted: !ok, url: activeTab.url });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_OPEN_DOWNLOADS') {
    (async () => {
      try {
        const downloadsUrl = 'chrome://downloads/';
        if (sender.tab?.windowId) {
          const callerWin = await chrome.windows.get(sender.tab.windowId);
          if (callerWin.type === 'popup') {
            syncPopupTabIntoPool(sender.tab);
            const newId = nextFramelessVirtualId++;
            framelessTabPool.push({
              id: newId,
              windowId: sender.tab.windowId,
              title: 'Downloads',
              url: downloadsUrl,
              favIconUrl: '',
              pinned: false,
              audible: false,
              groupId: -1,
              groupTitle: null,
              groupColor: null,
              isVirtual: true
            });
            activeFramelessVirtualId = newId;
            await chrome.tabs.update(sender.tab.id, { url: downloadsUrl });
            await broadcastTabsUpdated();
            sendResponse({ ok: true, activeTabId: newId });
            return;
          }
          await chrome.tabs.create({ windowId: callerWin.id, url: downloadsUrl, active: true });
          sendResponse({ ok: true });
          return;
        }
        const currentWin = await chrome.windows.getCurrent();
        if (currentWin && currentWin.type === 'normal') {
          await chrome.tabs.create({ windowId: currentWin.id, url: downloadsUrl, active: true });
        } else {
          await chrome.tabs.create({ url: downloadsUrl, active: true });
        }
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_OPEN_SHORTCUTS_SETTINGS') {
    (async () => {
      try {
        const targetUrl = 'chrome://extensions/shortcuts';
        if (sender.tab?.windowId) {
          const callerWin = await chrome.windows.get(sender.tab.windowId);
          if (callerWin.type === 'popup') {
            syncPopupTabIntoPool(sender.tab);
            const newId = nextFramelessVirtualId++;
            framelessTabPool.push({
              id: newId,
              windowId: sender.tab.windowId,
              title: 'Keyboard Shortcuts',
              url: targetUrl,
              favIconUrl: '',
              pinned: false,
              audible: false,
              groupId: -1,
              groupTitle: null,
              groupColor: null,
              isVirtual: true
            });
            activeFramelessVirtualId = newId;
            await chrome.tabs.update(sender.tab.id, { url: targetUrl });
            await broadcastTabsUpdated();
            sendResponse({ ok: true });
            return;
          }
          await chrome.tabs.create({ windowId: callerWin.id, url: targetUrl, active: true });
          sendResponse({ ok: true });
          return;
        }
        await chrome.tabs.create({ url: targetUrl, active: true });
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_GET_INSTALLED_EXTENSIONS') {
    (async () => {
      try {
        const extensions = await getInstalledExtensionsList();
        sendResponse({ ok: true, extensions });
      } catch (err) {
        sendResponse({ ok: false, extensions: [], error: String(err) });
      }
    })();
    return true;
  }

  if (message.type === 'DIA_OPEN_EXTENSION') {
    (async () => {
      if (!message.isSelf) {
        sendResponse({
          ok: false,
          unsupported: true,
          message: 'Use the extension’s native Chrome toolbar icon to open its popup.'
        });
        return;
      }

      try {
        if (typeof chrome.action?.openPopup !== 'function') {
          throw new Error('Chrome action popup API is unavailable');
        }
        const options = sender.tab?.windowId ? { windowId: sender.tab.windowId } : undefined;
        await chrome.action.openPopup(options);
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({
          ok: false,
          unsupported: true,
          error: String(err),
          message: 'Open DiaChrome-Tweaks from its native Chrome toolbar icon.'
        });
      }
    })();
    return true;
  }

  return false;
});
