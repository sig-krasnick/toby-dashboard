import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import BookmarkCard from './BookmarkCard';

export default function CollectionSection({ list, bookmarks, onRename, onDelete, isUncategorized = false, allLists = [], onMove, onEditBookmark, onDeleteBookmark, onOpenAllInWindow, sortable = false }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [collapsed, setCollapsed] = useState(false);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: list.id,
    data: { type: 'list', listId: list.id },
  });

  const {
    attributes: sortableAttributes,
    listeners: sortableListeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: 'collection', listId: list.id },
    disabled: !sortable,
  });

  const sortableStyle = sortable ? {
    transform: CSS.Transform.toString(transform),
    transition,
  } : {};

  const handleRename = () => {
    if (name.trim() && name !== list.name) {
      onRename(list.id, name.trim());
    }
    setEditing(false);
  };

  const handleOpenAll = () => {
    const urls = bookmarks
      .map(b => ({ title: b.title || b.content?.title || b.content?.url || 'Untitled', url: b.content?.url || b.content?.sourceUrl }))
      .filter(b => b.url);
    if (urls.length === 0) return;

    // Use extension to open in a new window if available
    if (onOpenAllInWindow) {
      onOpenAllInWindow(urls.map(b => b.url));
      return;
    }

    // Fallback: open a single launcher tab that auto-opens all the URLs
    const linksHtml = urls.map(b =>
      `<a href="${b.url}" target="_blank" rel="noopener">${b.title}</a>`
    ).join('<br>');

    const html = `<!DOCTYPE html><html><head>
      <title>Opening ${urls.length} tabs from "${list.name}"</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 40px; background: #f5f5f5; color: #333; }
        h2 { margin-bottom: 8px; }
        p { color: #777; margin-bottom: 20px; }
        a { display: block; padding: 8px 0; color: #6366f1; text-decoration: none; font-size: 14px; }
        a:hover { text-decoration: underline; }
        .btn { display: inline-block; margin-bottom: 24px; padding: 10px 20px; background: #e8384f; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
      </style>
    </head><body>
      <h2>${list.name}</h2>
      <p>${urls.length} bookmarks</p>
      <button class="btn" onclick="document.querySelectorAll('a').forEach(a => window.open(a.href)); this.textContent='Opened!'">
        Open All Tabs
      </button>
      <div>${linksHtml}</div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
  };

  const bookmarkIds = bookmarks.map(b => b.id);

  return (
    <div
      ref={sortable ? setSortableRef : undefined}
      style={sortableStyle}
      {...(sortable ? sortableAttributes : {})}
      className={`collection-section ${isOver ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''}`}
    >
      <div className="collection-header">
        <div className="collection-header-left">
          {sortable && (
            <button
              className="collection-drag-handle"
              {...sortableListeners}
              title="Drag to reorder"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
            </button>
          )}
          <button
            className="collection-chevron"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '\u25B6' : '\u25BC'}
          </button>

          {editing && !isUncategorized ? (
            <input
              className="collection-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setName(list.name); setEditing(false); }
              }}
              autoFocus
            />
          ) : (
            <h3
              className="collection-name"
              onDoubleClick={() => !isUncategorized && setEditing(true)}
              title={isUncategorized ? '' : 'Double-click to rename'}
            >
              {list.name}
              <span className="collection-count">{bookmarks.length}</span>
            </h3>
          )}
        </div>

        <div className="collection-actions">
          {bookmarks.length > 0 && (
            <button
              className="collection-action-btn"
              onClick={handleOpenAll}
              title="Open all in new tabs"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          )}
          {!isUncategorized && (
            <>
              <button
                className="collection-action-btn"
                onClick={() => setEditing(true)}
                title="Rename collection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
              <button
                className="collection-action-btn delete"
                onClick={() => {
                  if (window.confirm(`Delete collection "${list.name}"? Bookmarks will not be deleted.`)) {
                    onDelete(list.id);
                  }
                }}
                title="Delete collection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {!collapsed && (
        <div ref={setDropRef} className="collection-drop-zone">
          <SortableContext items={bookmarkIds} strategy={rectSortingStrategy}>
            <div className="collection-cards">
              {bookmarks.length === 0 && (
                <div className="collection-empty">Drop bookmarks here</div>
              )}
              {bookmarks.map((bookmark) => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  lists={allLists}
                  currentListId={list.id}
                  onMove={onMove}
                  onEdit={onEditBookmark}
                  onDelete={onDeleteBookmark}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      )}

    </div>
  );
}
