import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useState } from 'react';
import BookmarkCard from './BookmarkCard';

export default function ListColumn({ list, bookmarks, onRename, onDelete, isUncategorized = false }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [collapsed, setCollapsed] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: 'list', listId: list.id },
  });

  const handleRename = () => {
    if (name.trim() && name !== list.name) {
      onRename(list.id, name.trim());
    }
    setEditing(false);
  };

  const bookmarkIds = bookmarks.map(b => b.id);

  return (
    <div className={`list-column ${isOver ? 'drag-over' : ''}`} ref={setNodeRef}>
      <div className="list-header">
        <button
          className="collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '\u25B6' : '\u25BC'}
        </button>

        {editing && !isUncategorized ? (
          <input
            className="list-name-input"
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
            className="list-name"
            onDoubleClick={() => !isUncategorized && setEditing(true)}
            title={isUncategorized ? '' : 'Double-click to rename'}
          >
            {list.icon && <span className="list-icon">{list.icon}</span>}
            {list.name}
            <span className="list-count">{bookmarks.length}</span>
          </h3>
        )}

        {!isUncategorized && (
          <button
            className="list-delete-btn"
            onClick={() => {
              if (window.confirm(`Delete list "${list.name}"? Bookmarks will not be deleted.`)) {
                onDelete(list.id);
              }
            }}
            title="Delete list"
          >
            &times;
          </button>
        )}
      </div>

      {!collapsed && (
        <SortableContext items={bookmarkIds} strategy={verticalListSortingStrategy}>
          <div className="list-bookmarks">
            {bookmarks.length === 0 && (
              <div className="empty-list">Drop bookmarks here</div>
            )}
            {bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
