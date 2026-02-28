import { useState, useEffect, useCallback } from 'react';
import * as api from '../api/karakeep';

export function useKarakeep() {
  const [lists, setLists] = useState([]);
  const [allBookmarks, setAllBookmarks] = useState([]);
  const [listBookmarks, setListBookmarks] = useState({});
  const [uncategorized, setUncategorized] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [listsRes, bookmarks] = await Promise.all([
        api.fetchLists(),
        api.fetchBookmarks(),
      ]);

      const manualLists = (listsRes.lists || []).filter(l => l.type === 'manual');
      setLists(manualLists);
      setAllBookmarks(bookmarks);

      const listBookmarkMap = {};
      const results = await Promise.all(
        manualLists.map(async (list) => {
          const items = await api.fetchListBookmarks(list.id);
          return { listId: list.id, items };
        })
      );

      const assignedBookmarkIds = new Set();
      results.forEach(({ listId, items }) => {
        listBookmarkMap[listId] = items;
        items.forEach(b => assignedBookmarkIds.add(b.id));
      });

      setListBookmarks(listBookmarkMap);
      setUncategorized(bookmarks.filter(b => !assignedBookmarkIds.has(b.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (api.isConfigured()) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [loadData]);

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
      // Optimistically add the new list
      setLists(prev => [...prev, res]);
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
    setListBookmarks(prev => ({
      ...prev,
      [listId]: reorderFn(prev[listId] || []),
    }));
  }, []);

  const reorderUncategorized = useCallback((reorderFn) => {
    setUncategorized(prev => reorderFn(prev));
  }, []);

  return {
    lists,
    listBookmarks,
    uncategorized,
    allBookmarks,
    loading,
    error,
    loadData,
    moveBookmark,
    createList,
    renameList,
    removeList,
    reorderListBookmarks,
    reorderUncategorized,
    editBookmark,
    removeBookmark,
  };
}
