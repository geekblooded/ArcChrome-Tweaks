(async () => {
  const token = new URL(location.href).searchParams.get('token');
  try {
    const result = await chrome.runtime.sendMessage({ type: 'ARC_SETTINGS_VERIFY', token });
    if (!result?.ok) return;
    const response = await fetch(chrome.runtime.getURL('popup/popup.html'));
    if (!response.ok) throw new Error('Settings markup unavailable');
    const markup = new DOMParser().parseFromString(await response.text(), 'text/html');
    markup.querySelectorAll('script').forEach(script => script.remove());
    document.body.replaceChildren(...Array.from(markup.body.childNodes, node => document.importNode(node, true)));
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('popup/popup.js');
    document.body.appendChild(script);
  } catch {
    // An unverified or stale frame must never load the privileged settings page.
  }
})();
