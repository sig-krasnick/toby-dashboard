import { useState, useEffect, useCallback } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import * as api from '../api/karakeep';

const LIST_ORDER_KEY = 'karakeep_list_order';
const BOOKMARK_ORDER_KEY = 'karakeep_bookmark_order';
const DATA_CACHE_KEY = 'karakeep_data_cache';

function loadDataCache() {
  try {
    const stored = localStorage.getItem(DATA_CACHE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function slimBookmark(b) {
  return {
    id: b.id,
    title: b.title,
    content: b.content ? {
      title: b.content.title,
      url: b.content.url,
      sourceUrl: b.content.sourceUrl,
      text: b.content.text?.slice(0, 60),
      favicon: b.content.favicon,
      description: b.content.description,
    } : undefined,
  };
}

function saveDataCache(data) {
  try {
    const slim = {
      lists: data.lists,
      listBookmarks: Object.fromEntries(
        Object.entries(data.listBookmarks).map(([k, v]) => [k, v.map(slimBookmark)])
      ),
      uncategorized: data.uncategorized.map(slimBookmark),
    };
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(slim));
  } catch { /* ignore */ }
}

function getSavedBookmarkOrder() {
  try {
    const stored = localStorage.getItem(BOOKMARK_ORDER_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

function saveBookmarkOrder(listId, bookmarkIds) {
  try {
    const all = getSavedBookmarkOrder();
    all[listId] = bookmarkIds;
    localStorage.setItem(BOOKMARK_ORDER_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function applyBookmarkOrder(listId, bookmarks) {
  const all = getSavedBookmarkOrder();
  const savedIds = all[listId];
  if (!savedIds || !Array.isArray(savedIds)) return bookmarks;
  const orderMap = new Map(savedIds.map((id, i) => [id, i]));
  return [...bookmarks].sort((a, b) => {
    const aIdx = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
    const bIdx = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
    return aIdx - bIdx;
  });
}

export function useKarakeep() {
  const [lists, setLists] = useState([]);
  const [listBookmarks, setListBookmarks] = useState({});
  const [uncategorized, setUncategorized] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      // Stage 1: Fetch lists (single fast API call)
      const listsRes = await api.fetchLists();
      const manualLists = (listsRes.lists || []).filter(l => l.type === 'manual');

      // Apply saved list order from localStorage
      const savedOrder = (() => {
        try {
          const stored = localStorage.getItem(LIST_ORDER_KEY);
          return stored ? JSON.parse(stored) : null;
        } catch { return null; }
      })();

      let orderedLists;
      if (savedOrder && Array.isArray(savedOrder)) {
        const orderMap = new Map(savedOrder.map((id, i) => [id, i]));
        orderedLists = [...manualLists].sort((a, b) => {
          const aIdx = orderMap.has(a.id) ? orderMap.get(a.id) : Infinity;
          const bIdx = orderMap.has(b.id) ? orderMap.get(b.id) : Infinity;
          return aIdx - bIdx;
        });
      } else {
        orderedLists = manualLists;
      }

      // Stage 2: Fetch all bookmarks + per-list bookmarks in parallel
      const [bookmarks, ...listResults] = await Promise.all([
        api.fetchBookmarks(),
        ...manualLists.map(async (list) => {
          const items = await api.fetchListBookmarks(list.id);
          return { listId: list.id, items };
        }),
      ]);

      const listBookmarkMap = {};
      const assignedBookmarkIds = new Set();
      listResults.forEach(({ listId, items }) => {
        listBookmarkMap[listId] = applyBookmarkOrder(listId, items);
        items.forEach(b => assignedBookmarkIds.add(b.id));
      });

      const uncatBookmarks = bookmarks.filter(b => !assignedBookmarkIds.has(b.id));
      const orderedUncategorized = applyBookmarkOrder('uncategorized', uncatBookmarks);

      // Cache from local variables (not React state) to avoid effect timing issues
      saveDataCache({ lists: orderedLists, listBookmarks: listBookmarkMap, uncategorized: orderedUncategorized });

      // Set all state together so React batches into a single render
      setLists(orderedLists);
      setListBookmarks(listBookmarkMap);
      setUncategorized(orderedUncategorized);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (api.isConfigured()) {
      const cached = loadDataCache();
      if (cached) {
        setLists(cached.lists || []);
        setListBookmarks(cached.listBookmarks || {});
        setUncategorized(cached.uncategorized || []);
        setLoading(false);
        loadData({ silent: true });
      } else {
        loadData();
      }
    } else {
      setLoading(false);
    }
  }, [loadData]);

  // Auto-save data cache when state changes (captures optimistic updates too)
  useEffect(() => {
    if (lists.length > 0 && Object.keys(listBookmarks).length > 0) {
      saveDataCache({ lists, listBookmarks, uncategorized });
    }
  }, [lists, listBookmarks, uncategorized]);

  const moveBookmark = useCallback(async (bookmarkId, fromListId, toListId) => {
    // Find the bookmark object before modifying state
    let bookmark = null;
    if (fromListId === 'uncategorized') {
      bookmark = uncategorized.find(b => b.id === bookmarkId);
    } else {
      bookmark = (listBookmarks[fromListId] || []).find(b => b.id === bookmarkId);
    }
    if (!bookmark) return;

    // Optimistically update local state
    setListBookmarks(prev => {
      const next = { ...prev };

      // Remove from source list
      if (fromListId && fromListId !== 'uncategorized') {
        next[fromListId] = (prev[fromListId] || []).filter(b => b.id !== bookmarkId);
      }

      // Add to target list
      if (toListId && toListId !== 'uncategorized') {
        next[toListId] = [...(prev[toListId] || []), bookmark];
      }

      return next;
    });

    // Update uncategorized
    if (fromListId === 'uncategorized') {
      setUncategorized(prev => prev.filter(b => b.id !== bookmarkId));
    }
    if (toListId === 'uncategorized') {
      setUncategorized(prev => [...prev, bookmark]);
    }

    // Fire API calls in background (don't await before updating UI)
    try {
      if (fromListId && fromListId !== 'uncategorized') {
        await api.removeBookmarkFromList(fromListId, bookmarkId);
      }
      if (toListId && toListId !== 'uncategorized') {
        await api.addBookmarkToList(toListId, bookmarkId);
      }
    } catch (err) {
      // Revert on failure
      setError(err.message);
      await loadData();
    }
  }, [listBookmarks, uncategorized, loadData]);

  const createList = useCallback(async (name) => {
    try {
      const res = await api.createList(name);
      // Optimistically add the new list at the top
      setLists(prev => [res, ...prev]);
      setListBookmarks(prev => ({ ...prev, [res.id]: [] }));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const renameList = useCallback(async (listId, name) => {
    // Optimistically rename
    setLists(prev => prev.map(l => l.id === listId ? { ...l, name } : l));
    try {
      await api.updateList(listId, { name });
    } catch (err) {
      setError(err.message);
      await loadData();
    }
  }, [loadData]);

  const removeList = useCallback(async (listId) => {
    // Optimistically remove and move bookmarks to uncategorized
    const orphanedBookmarks = listBookmarks[listId] || [];
    setLists(prev => prev.filter(l => l.id !== listId));
    setListBookmarks(prev => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });
    if (orphanedBookmarks.length > 0) {
      setUncategorized(prev => [...prev, ...orphanedBookmarks]);
    }
    try {
      await api.deleteList(listId);
    } catch (err) {
      setError(err.message);
      await loadData();
    }
  }, [listBookmarks, loadData]);

  const editBookmark = useCallback(async (bookmarkId, data) => {
    // Optimistically update title in local state
    const updateBookmarkInList = (bookmarks) =>
      bookmarks.map(b => b.id === bookmarkId ? { ...b, ...data } : b);

    setListBookmarks(prev => {
      const next = {};
      for (const [listId, items] of Object.entries(prev)) {
        next[listId] = updateBookmarkInList(items);
      }
      return next;
    });
    setUncategorized(prev => updateBookmarkInList(prev));

    try {
      await api.updateBookmark(bookmarkId, data);
    } catch (err) {
      setError(err.message);
      await loadData();
    }
  }, [loadData]);

  const removeBookmark = useCallback(async (bookmarkId, fromListId) => {
    // Optimistically remove
    if (fromListId === 'uncategorized') {
      setUncategorized(prev => prev.filter(b => b.id !== bookmarkId));
    } else {
      setListBookmarks(prev => ({
        ...prev,
        [fromListId]: (prev[fromListId] || []).filter(b => b.id !== bookmarkId),
      }));
    }

    try {
      await api.deleteBookmark(bookmarkId);
    } catch (err) {
      setError(err.message);
      await loadData();
    }
  }, [loadData]);

  const reorderListBookmarks = useCallback((listId, reorderFn) => {
    setListBookmarks(prev => {
      const reordered = reorderFn(prev[listId] || []);
      saveBookmarkOrder(listId, reordered.map(b => b.id));
      return { ...prev, [listId]: reordered };
    });
  }, []);

  const reorderUncategorized = useCallback((reorderFn) => {
    setUncategorized(prev => {
      const reordered = reorderFn(prev);
      saveBookmarkOrder('uncategorized', reordered.map(b => b.id));
      return reordered;
    });
  }, []);

  const reorderLists = useCallback((activeId, overId) => {
    setLists(prev => {
      const oldIndex = prev.findIndex(l => l.id === activeId);
      const newIndex = prev.findIndex(l => l.id === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      try {
        localStorage.setItem(LIST_ORDER_KEY, JSON.stringify(reordered.map(l => l.id)));
      } catch { /* ignore */ }
      return reordered;
    });
  }, []);

  const prioritizeList = useCallback((listId) => {
    setLists(prev => {
      const target = prev.find(l => l.id === listId);
      if (!target) return prev;
      return [target, ...prev.filter(l => l.id !== listId)];
    });
  }, []);

  return {
    lists,
    listBookmarks,
    uncategorized,
    loading,
    error,
    loadData,
    moveBookmark,
    createList,
    renameList,
    removeList,
    reorderLists,
    reorderListBookmarks,
    reorderUncategorized,
    prioritizeList,
    editBookmark,
    removeBookmark,
  };
}
