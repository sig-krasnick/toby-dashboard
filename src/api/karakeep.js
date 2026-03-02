const getConfig = () => {
  const serverUrl = localStorage.getItem('karakeep_server_url') || '';
  const apiKey = localStorage.getItem('karakeep_api_key') || '';
  return { serverUrl: serverUrl.replace(/\/+$/, ''), apiKey };
};

const request = async (path, options = {}) => {
  const { serverUrl, apiKey } = getConfig();
  if (!serverUrl || !apiKey) {
    throw new Error('Karakeep server URL and API key must be configured');
  }

  const url = new URL(`/api/v1${path}`, serverUrl);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

// Lists
export const fetchLists = () => request('/lists');

export const createList = (name, icon = '📁') =>
  request('/lists', {
    method: 'POST',
    body: { name, icon, type: 'manual' },
  });

export const updateList = (listId, data) =>
  request(`/lists/${listId}`, { method: 'PATCH', body: data });

export const deleteList = (listId) =>
  request(`/lists/${listId}`, { method: 'DELETE' });

export const fetchListBookmarks = async (listId, limit = 100) => {
  const items = [];
  let cursor = undefined;
  do {
    const res = await request(`/lists/${listId}/bookmarks`, {
      params: { limit, cursor },
    });
    items.push(...(res.bookmarks || []));
    cursor = res.nextCursor;
  } while (cursor);
  return items;
};

// Bookmarks
export const fetchBookmarks = async (limit = 100) => {
  const items = [];
  let cursor = undefined;
  do {
    const res = await request('/bookmarks', {
      params: { limit, cursor, archived: false },
    });
    items.push(...(res.bookmarks || []));
    cursor = res.nextCursor;
  } while (cursor);
  return items;
};

export const searchBookmarks = (query) =>
  request('/bookmarks/search', { params: { q: query } });

export const addBookmarkToList = (listId, bookmarkId) =>
  request(`/lists/${listId}/bookmarks/${bookmarkId}`, { method: 'PUT' });

export const removeBookmarkFromList = (listId, bookmarkId) =>
  request(`/lists/${listId}/bookmarks/${bookmarkId}`, { method: 'DELETE' });

export const fetchBookmarkLists = (bookmarkId) =>
  request(`/bookmarks/${bookmarkId}/lists`);

export const deleteBookmark = (bookmarkId) =>
  request(`/bookmarks/${bookmarkId}`, { method: 'DELETE' });

export const updateBookmark = (bookmarkId, data) =>
  request(`/bookmarks/${bookmarkId}`, { method: 'PATCH', body: data });

// Create a new bookmark
export const createBookmark = (url, title) =>
  request('/bookmarks', {
    method: 'POST',
    body: { type: 'link', url, title },
  });

// Tags
export const fetchTags = () => request('/tags');

// Assets — returns a direct URL for <img> tags
export const getAssetUrl = (assetId) => {
  const { serverUrl, apiKey } = getConfig();
  return `${serverUrl}/api/v1/assets/${assetId}?bearer=${apiKey}`;
};

// Config helpers
export const isConfigured = () => {
  const { serverUrl, apiKey } = getConfig();
  return Boolean(serverUrl && apiKey);
};

export const saveConfig = (serverUrl, apiKey) => {
  localStorage.setItem('karakeep_server_url', serverUrl);
  localStorage.setItem('karakeep_api_key', apiKey);
  localStorage.removeItem('karakeep_data_cache');
};

export const testConnection = async () => {
  const res = await request('/users/me');
  return res;
};
