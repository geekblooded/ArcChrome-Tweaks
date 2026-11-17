function normalizeNewTabDestination(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^(https?:\/\/|chrome:\/\/|file:\/\/|about:)/i.test(text)) return text;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(text)) return `https://${text}`;
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('ntAddressInput');
  const form = document.getElementById('ntAddressForm');
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
