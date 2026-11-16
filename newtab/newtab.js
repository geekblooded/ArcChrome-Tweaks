/**
 * ArcChrome-Tweaks — Dia New Tab Controller (_DPOpenOverBlank parity)
 */

const QUICK_LINKS = [
  { title: 'Google', url: 'https://www.google.com', icon: '🔍' },
  { title: 'GitHub', url: 'https://github.com', icon: '🐙' },
  { title: 'Gmail', url: 'https://mail.google.com', icon: '✉️' },
  { title: 'Google Docs', url: 'https://docs.google.com', icon: '📄' },
  { title: 'Calendar', url: 'https://calendar.google.com', icon: '📅' },
  { title: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' }
];

function updateClockGreeting() {
  const el = document.getElementById('ntClock');
  if (!el) return;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  el.textContent = timeStr;
}

function renderQuickLinks() {
  const grid = document.getElementById('ntQuickGrid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const item of QUICK_LINKS) {
    const a = document.createElement('a');
    a.className = 'dia-nt-quick-tile';
    a.href = item.url;
    const iconSpan = document.createElement('span');
    iconSpan.textContent = item.icon;
    const textSpan = document.createElement('span');
    textSpan.textContent = item.title;
    a.appendChild(iconSpan);
    a.appendChild(textSpan);
    grid.appendChild(a);
  }
}

async function renderOpenTabsDeck() {
  const grid = document.getElementById('ntTabsGrid');
  if (!grid) return;

  try {
    const res = await chrome.runtime.sendMessage({ type: 'DIA_GET_OPEN_TABS' });
    const tabs = (res?.tabs || []).filter((t) => !t.url.startsWith('chrome://newtab'));
    grid.innerHTML = '';

    for (const tab of tabs.slice(0, 16)) {
      const card = document.createElement('div');
      card.className = 'dia-nt-tab-card';
      card.title = `${tab.title}\n${tab.url}`;

      if (tab.favIconUrl && /^https?:\/\//i.test(tab.favIconUrl)) {
        const img = document.createElement('img');
        img.src = tab.favIconUrl;
        img.alt = '';
        img.onerror = () => { img.remove(); };
        card.appendChild(img);
      } else {
        const fallback = document.createElement('span');
        fallback.textContent = '🌐';
        card.appendChild(fallback);
      }

      const title = document.createElement('span');
      title.className = 'dia-nt-tab-card-title';
      title.textContent = tab.title || tab.url || 'Untitled';
      card.appendChild(title);

      if (tab.groupTitle) {
        const grp = document.createElement('span');
        grp.className = 'dia-nt-tab-card-group';
        grp.textContent = tab.groupTitle;
        card.appendChild(grp);
      }

      card.addEventListener('click', async () => {
        await chrome.runtime.sendMessage({
          type: 'DIA_SWITCH_TAB',
          tabId: tab.id,
          windowId: tab.windowId
        });
      });

      grid.appendChild(card);
    }
  } catch {
    // Ignore errors
  }
}

function triggerCommandBar() {
  window.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
      cancelable: true
    })
  );
}

async function initNewTab() {
  updateClockGreeting();
  setInterval(updateClockGreeting, 15000);
  renderQuickLinks();
  await renderOpenTabsDeck();

  document.getElementById('ntOpenCommandBarBtn')?.addEventListener('click', () => {
    triggerCommandBar();
  });

  document.getElementById('ntFramelessBtn')?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'DIA_TOGGLE_FRAMELESS_WINDOW' });
  });

  document.getElementById('ntFullscreenBtn')?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'DIA_TOGGLE_FULLSCREEN' });
  });

  document.getElementById('ntTidyBtn')?.addEventListener('click', () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 't',
        metaKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    setTimeout(renderOpenTabsDeck, 400);
  });

  document.getElementById('ntDomainBtn')?.addEventListener('click', () => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'g',
        metaKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true
      })
    );
    setTimeout(renderOpenTabsDeck, 400);
  });

  // _DPOpenOverBlank: Automatically open the Dia Command Bar when New Tab opens
  try {
    const stored = await chrome.storage.sync.get({ openNewTabInCommandBar: true });
    if (stored.openNewTabInCommandBar !== false) {
      setTimeout(() => {
        triggerCommandBar();
      }, 90);
    }
  } catch {
    setTimeout(() => {
      triggerCommandBar();
    }, 90);
  }
}

document.addEventListener('DOMContentLoaded', initNewTab);
