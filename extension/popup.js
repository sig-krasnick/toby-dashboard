// --- DOM refs ---
const stateNotConfigured = document.getElementById('state-not-configured');
const stateForm = document.getElementById('state-form');
const stateSaving = document.getElementById('state-saving');
const stateSuccess = document.getElementById('state-success');
const stateError = document.getElementById('state-error');

const pageFavicon = document.getElementById('page-favicon');
const pageTitle = document.getElementById('page-title');
const pageUrl = document.getElementById('page-url');
const collectionSelect = document.getElementById('collection-select');
const newCollectionRow = document.getElementById('new-collection-row');
const newCollectionName = document.getElementById('new-collection-name');
const saveBtn = document.getElementById('save-btn');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');

// --- State ---
let config = { serverUrl: '', apiKey: '' };
let currentTab = { title: '', url: '', favIconUrl: '' };

// --- Helpers ---
function showState(stateEl) {
  [stateNotConfigured, stateForm, stateSaving, stateSuccess, stateError].forEach(
    (el) => (el.hidden = el !== stateEl)
  );
}

async function apiRequest(path, options = {}) {
  const url = new URL(`/api/v1${path}`, config.serverUrl);
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
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

async function fetchLists() {
  const res = await apiRequest('/lists');
  return (res.lists || [])
    .filter((l) => l.type === 'manual')
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function createBookmark(url, title) {
  return apiRequest('/bookmarks', {
    method: 'POST',
    body: { type: 'link', url, title },
  });
}

async function addBookmarkToList(listId, bookmarkId) {
  return apiRequest(`/lists/${listId}/bookmarks/${bookmarkId}`, { method: 'PUT' });
}

async function createList(name) {
  return apiRequest('/lists', {
    method: 'POST',
    body: { name, icon: '\u{1F4C1}', type: 'manual' },
  });
}

// --- Init ---
async function init() {
  try {
    // 1. Get config from chrome.storage.local
    const stored = await chrome.storage.local.get(['karakeep_server_url', 'karakeep_api_key']);
    config.serverUrl = (stored.karakeep_server_url || '').replace(/\/+$/, '');
    config.apiKey = stored.karakeep_api_key || '';

    if (!config.serverUrl || !config.apiKey) {
      showState(stateNotConfigured);
      return;
    }

    // 2. Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showState(stateError);
      errorMessage.textContent = 'Could not detect the current tab.';
      return;
    }

    currentTab = { title: tab.title || '', url: tab.url || '', favIconUrl: tab.favIconUrl || '' };

    // 3. Populate form
    pageTitle.value = currentTab.title;
    pageUrl.textContent = currentTab.url;
    if (currentTab.favIconUrl) {
      pageFavicon.src = currentTab.favIconUrl;
    } else {
      pageFavicon.style.display = 'none';
    }

    // 4. Load collections
    const lists = await fetchLists();
    lists.forEach((list) => {
      const opt = document.createElement('option');
      opt.value = list.id;
      opt.textContent = `${list.icon || '\u{1F4C1}'} ${list.name}`;
      collectionSelect.appendChild(opt);
    });

    const newOpt = document.createElement('option');
    newOpt.value = '__new__';
    newOpt.textContent = '+ New Collection...';
    collectionSelect.appendChild(newOpt);

    showState(stateForm);
  } catch (err) {
    showState(stateError);
    errorMessage.textContent = err.message;
  }
}

// --- Event handlers ---
collectionSelect.addEventListener('change', () => {
  const isNew = collectionSelect.value === '__new__';
  newCollectionRow.hidden = !isNew;
  if (isNew) {
    newCollectionName.focus();
  }
});

saveBtn.addEventListener('click', async () => {
  const title = pageTitle.value.trim() || currentTab.title || currentTab.url;
  const url = currentTab.url;
  const selectedCollection = collectionSelect.value;
  const isNewCollection = selectedCollection === '__new__';
  const newName = newCollectionName.value.trim();

  if (isNewCollection && !newName) {
    newCollectionName.focus();
    newCollectionName.style.borderColor = '#e8384f';
    return;
  }

  // Offload save to background service worker so popup can close instantly
  chrome.runtime.sendMessage({
    type: 'saveBookmark',
    url,
    title,
    listId: isNewCollection ? null : selectedCollection || null,
    newListName: isNewCollection ? newName : null,
  });

  showState(stateSuccess);
  setTimeout(() => window.close(), 600);
});

retryBtn.addEventListener('click', () => {
  showState(stateForm);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !stateForm.hidden) {
    if (document.activeElement === newCollectionName) return;
    saveBtn.click();
  }
});

init();
