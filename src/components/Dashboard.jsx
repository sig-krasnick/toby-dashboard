import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useKarakeep } from '../hooks/useKarakeep';
import { useOpenTabs } from '../hooks/useOpenTabs';
import CollectionSection from './CollectionSection';
import OpenTabsPanel from './OpenTabsPanel';
import { BookmarkCardOverlay } from './BookmarkCard';
import Sidebar from './Sidebar';
import Settings from './Settings';
import SearchResults from './SearchResults';
import { createBookmark, addBookmarkToList, createList as apiCreateList } from '../api/karakeep';

export default function Dashboard() {
  const {
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
  } = useKarakeep();

  const [activeBookmark, setActiveBookmark] = useState(null);
  const [activeCollection, setActiveCollection] = useState(null);
  const [activeSourceList, setActiveSourceList] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedList, setSelectedList] = useState('all');
  const [searchResults, setSearchResults] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const showOpenTabs = selectedList === 'open-tabs';
  const { windows, extensionConnected, loading: tabsLoading, error: tabsError, openAsWindow, recheckExtension } = useOpenTabs(showOpenTabs);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Find which list a bookmark belongs to
  const findBookmarkList = useCallback((bookmarkId) => {
    for (const [listId, bookmarks] of Object.entries(listBookmarks)) {
      if (bookmarks.some(b => b.id === bookmarkId)) return listId;
    }
    if (uncategorized.some(b => b.id === bookmarkId)) return 'uncategorized';
    return null;
  }, [listBookmarks, uncategorized]);

  // Find a bookmark object by ID
  const findBookmarkById = useCallback((bookmarkId) => {
    for (const bookmarks of Object.values(listBookmarks)) {
      const found = bookmarks.find(b => b.id === bookmarkId);
      if (found) return found;
    }
    return uncategorized.find(b => b.id === bookmarkId);
  }, [listBookmarks, uncategorized]);

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data?.current?.type === 'collection') {
      const list = lists.find(l => l.id === active.id);
      setActiveCollection(list || null);
      return;
    }
    const bookmark = findBookmarkById(active.id);
    const sourceList = findBookmarkList(active.id);
    setActiveBookmark(bookmark);
    setActiveSourceList(sourceList);
  };

  const handleDragOver = () => {
    // Could add visual feedback here in the future
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    // Handle collection reorder
    if (active.data?.current?.type === 'collection') {
      setActiveCollection(null);
      if (over && active.id !== over.id) {
        reorderLists(active.id, over.id);
      }
      return;
    }

    setActiveBookmark(null);

    if (!over) {
      setActiveSourceList(null);
      return;
    }

    const bookmarkId = active.id;
    const fromList = activeSourceList;

    // Determine target — could be dropping on a list droppable zone or on a bookmark card
    let toList = null;
    const overData = over.data?.current;

    if (overData?.type === 'list') {
      toList = over.id;
    } else if (overData?.type === 'bookmark') {
      toList = findBookmarkList(over.id);
    }

    setActiveSourceList(null);

    if (!toList) return;

    // Same list — reorder locally
    if (fromList === toList && active.id !== over.id) {
      const reorder = (items) => {
        const oldIndex = items.findIndex(b => b.id === active.id);
        const newIndex = items.findIndex(b => b.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      };

      if (fromList === 'uncategorized') {
        reorderUncategorized(reorder);
      } else {
        reorderListBookmarks(fromList, reorder);
      }
      return;
    }

    // Different list — move via API
    if (fromList !== toList) {
      await moveBookmark(bookmarkId, fromList, toList);
    }
  };

  const handleDragCancel = () => {
    setActiveBookmark(null);
    setActiveCollection(null);
    setActiveSourceList(null);
  };

  const handleCreateList = (e) => {
    e.preventDefault();
    if (newListName.trim()) {
      createList(newListName.trim());
      setNewListName('');
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    const { searchBookmarks } = await import('../api/karakeep');
    const res = await searchBookmarks(query);
    setSearchResults(res.bookmarks || []);
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchQuery('');
  };

  const handleSaveWindow = async (tabs) => {
    const name = window.prompt('Collection name:');
    if (!name || !name.trim()) return;

    try {
      const newList = await apiCreateList(name.trim(), '\uD83D\uDCBB');
      const listId = newList.id;

      for (const tab of tabs) {
        const bookmark = await createBookmark(tab.url, tab.title || tab.url);
        await addBookmarkToList(listId, bookmark.id);
      }

      await loadData();
      prioritizeList(listId);
      setSelectedList('all');
    } catch (err) {
      console.error('Failed to save window:', err);
    }
  };

  const listsWithCounts = lists.map(l => ({
    ...l,
    count: (listBookmarks[l.id] || []).length,
  }));

  // Filter visible sections based on sidebar selection
  const visibleLists = selectedList === 'all'
    ? lists
    : selectedList === 'uncategorized'
      ? []
      : lists.filter(l => l.id === selectedList);

  const showUncategorized = selectedList === 'all' || selectedList === 'uncategorized';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading bookmarks...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        lists={listsWithCounts}
        uncategorizedCount={uncategorized.length}
        selectedList={selectedList}
        onSelectList={(id) => { setSelectedList(id); clearSearch(); }}
        onSearch={handleSearch}
        extensionConnected={extensionConnected}
      />

      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="page-title">
              {showOpenTabs ? 'Open Tabs' :
               selectedList === 'all' ? 'My Collections' :
               selectedList === 'uncategorized' ? 'Uncategorized' :
               lists.find(l => l.id === selectedList)?.name || 'Collections'}
            </h1>
            <span className="collection-total">
              {showOpenTabs ? '' : selectedList === 'all' ? `${lists.length} collections` : ''}
            </span>
          </div>
          <div className="top-bar-right">
            <form onSubmit={handleCreateList} className="add-collection-form">
              <input
                type="text"
                placeholder="Collection name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="add-collection-input"
              />
              <button type="submit" className="add-collection-btn" disabled={!newListName.trim()}>
                + ADD COLLECTION
              </button>
            </form>
            <button onClick={loadData} className="icon-btn" title="Refresh">
              &#x21bb;
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="icon-btn" title="Settings">
              &#x2699;
            </button>
          </div>
        </header>

        {showSettings && (
          <div className="settings-dropdown">
            <Settings inline onConfigured={() => { setShowSettings(false); loadData(); recheckExtension(); }} />
          </div>
        )}

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => loadData()}>Retry</button>
          </div>
        )}

        {showOpenTabs ? (
          <OpenTabsPanel
            windows={windows}
            loading={tabsLoading}
            error={tabsError}
            extensionConnected={extensionConnected}
            onSaveWindow={handleSaveWindow}
          />
        ) : searchResults !== null ? (
          <SearchResults results={searchResults} query={searchQuery} onClose={clearSearch} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="collections-area">
              <SortableContext items={visibleLists.map(l => l.id)} strategy={verticalListSortingStrategy}>
                {visibleLists.map((list) => (
                  <CollectionSection
                    key={list.id}
                    list={list}
                    bookmarks={listBookmarks[list.id] || []}
                    onRename={renameList}
                    onDelete={removeList}
                    allLists={lists}
                    onMove={moveBookmark}
                    onEditBookmark={editBookmark}
                    onDeleteBookmark={removeBookmark}
                    onOpenAllInWindow={extensionConnected ? openAsWindow : null}
                    sortable={selectedList === 'all'}
                  />
                ))}
              </SortableContext>

              {showUncategorized && uncategorized.length > 0 && (
                <CollectionSection
                  list={{ id: 'uncategorized', name: 'Uncategorized', icon: '' }}
                  bookmarks={uncategorized}
                  onRename={() => {}}
                  onDelete={() => {}}
                  isUncategorized
                  allLists={lists}
                  onMove={moveBookmark}
                  onEditBookmark={editBookmark}
                  onDeleteBookmark={removeBookmark}
                  onOpenAllInWindow={extensionConnected ? openAsWindow : null}
                />
              )}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeBookmark ? (
                <BookmarkCardOverlay bookmark={activeBookmark} />
              ) : activeCollection ? (
                <div className="collection-overlay">
                  <span className="collection-overlay-icon">{activeCollection.icon || '\uD83D\uDCC1'}</span>
                  <span className="collection-overlay-name">{activeCollection.name}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>
    </div>
  );
}
