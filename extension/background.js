const VERSION = '1.0.0';

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

    default:
      sendResponse({ error: `Unknown message type: ${message.type}` });
  }
});
