const VERSION = '1.0.0';

// --- Karakeep API helper (used by saveBookmark) ---
async function karakeepRequest(path, options = {}) {
  const stored = await chrome.storage.local.get(['karakeep_server_url', 'karakeep_api_key']);
  const serverUrl = (stored.karakeep_server_url || '').replace(/\/+$/, '');
  const apiKey = stored.karakeep_api_key || '';
  if (!serverUrl || !apiKey) throw new Error('Not configured');

  const url = new URL(`/api/v1${path}`, serverUrl);
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(err.message || `API error: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function handleSaveBookmark({ url, title, listId, newListName }) {
  const bookmark = await karakeepRequest('/bookmarks', {
    method: 'POST',
    body: { type: 'link', url, title },
  });

  if (newListName) {
    const newList = await karakeepRequest('/lists', {
      method: 'POST',
      body: { name: newListName, icon: '\u{1F4C1}', type: 'manual' },
    });
    await karakeepRequest(`/lists/${newList.id}/bookmarks/${bookmark.id}`, { method: 'PUT' });
  } else if (listId) {
    await karakeepRequest(`/lists/${listId}/bookmarks/${bookmark.id}`, { method: 'PUT' });
  }
}

// --- Internal messages (from popup) ---
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'saveBookmark') {
    handleSaveBookmark(message)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

// --- New tab override: redirect via tabs.update to keep omnibox focused ---
const DASHBOARD_URL = 'http://100.114.3.92/';

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl === 'chrome://newtab/' || tab.url === 'chrome://newtab/') {
    chrome.tabs.update(tab.id, { url: DASHBOARD_URL });
  }
});

// --- External messages (from dashboard) ---
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) {
    sendResponse({ error: 'Missing message type' });
    return;
  }

  switch (message.type) {
    case 'ping':
      sendResponse({ ok: true, version: VERSION });
      break;

    case 'getWindows':
      chrome.windows.getAll({ populate: true }, (windows) => {
        const result = windows
          .filter((w) => w.type === 'normal')
          .map((w) => ({
            id: w.id,
            focused: w.focused,
            tabs: w.tabs
              .filter((t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('about:'))
              .map((t) => ({
                id: t.id,
                title: t.title,
                url: t.url,
                favIconUrl: t.favIconUrl,
                active: t.active,
                pinned: t.pinned,
              })),
          }));
        sendResponse({ ok: true, windows: result });
      });
      return true; // keep channel open for async response

    case 'openWindow':
      if (!Array.isArray(message.urls) || message.urls.length === 0) {
        sendResponse({ error: 'urls must be a non-empty array' });
        break;
      }
      chrome.windows.create({ url: message.urls, focused: true }, (win) => {
        sendResponse({ ok: true, windowId: win.id });
      });
      return true;

    case 'setConfig':
      if (!message.serverUrl || !message.apiKey) {
        sendResponse({ error: 'serverUrl and apiKey are required' });
        break;
      }
      chrome.storage.local.set(
        {
          karakeep_server_url: message.serverUrl,
          karakeep_api_key: message.apiKey,
        },
        () => {
          sendResponse({ ok: true });
        }
      );
      return true;

    default:
      sendResponse({ error: `Unknown message type: ${message.type}` });
  }
});
