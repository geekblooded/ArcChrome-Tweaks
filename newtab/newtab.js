function normalizeNewTabDestination(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^(https?:\/\/|chrome:\/\/|file:\/\/|about:)/i.test(text)) return text;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(text)) return `https://${text}`;
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('ntAddressInput');
  const form = document.getElementById('ntAddressForm');
  if (new URLSearchParams(location.search).has('recovery')) {
    const tab = await chrome.tabs.getCurrent();
    const key = `arcRecovery:${tab?.id}`;
    const stored = await chrome.storage.session.get(key);
    const failure = stored[key];
    document.getElementById('recoveryMessage').hidden = false;
    document.querySelector('.hint').hidden = true;
    if (failure?.url) {
      input.value = failure.url;
      const retry = document.getElementById('recoveryRetry');
      retry.hidden = false;
      retry.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'DIA_NAVIGATE', url: failure.url, newTab: false }));
      if (failure.error === 'net::ERR_NAME_NOT_RESOLVED' || failure.error === 'net::ERR_NAME_RESOLUTION_FAILED') {
        document.getElementById('recoveryReason').textContent = 'The address could not be found. Check it or try again.';
      }
    }
    input.focus();
    return;
  }
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = normalizeNewTabDestination(input?.value);
    if (!url) return;
    await chrome.runtime.sendMessage({ type: 'DIA_NAVIGATE', url, newTab: false });
  });

  chrome.storage.sync.get({ openNewTabInCommandBar: true }).then(({ openNewTabInCommandBar }) => {
    if (openNewTabInCommandBar !== false) {
      setTimeout(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'k', metaKey: true, bubbles: true, cancelable: true
        }));
      }, 90);
    } else {
      input?.focus();
    }
  }).catch(() => input?.focus());
});
