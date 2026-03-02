import { useRef, useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function getDisplayInfo(bookmark) {
  const content = bookmark.content || {};
  const title = bookmark.title || content.title || content.url || content.text?.slice(0, 60) || 'Untitled';
  const url = content.url || content.sourceUrl || null;
  let hostname = '';
  try {
    if (url) hostname = new URL(url).hostname.replace('www.', '');
  } catch { /* ignore */ }

  let faviconUrl = null;
  if (content.favicon) {
    faviconUrl = content.favicon;
  } else if (url) {
    faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  }

  const subtitle = content.description || hostname || '';

  return { title, url, hostname, faviconUrl, subtitle };
}

function CardContent({ title, faviconUrl, subtitle }) {
  return (
    <>
      <div className="bookmark-top-row">
        <div className="bookmark-favicon-wrap">
          {faviconUrl ? (
            <img src={faviconUrl} alt="" className="bookmark-favicon" draggable={false} />
          ) : (
            <div className="bookmark-favicon-placeholder" />
          )}
        </div>
        <span className="bookmark-title">{title}</span>
      </div>
      <div className="bookmark-subtitle">{subtitle}</div>
    </>
  );
}

export function BookmarkCardOverlay({ bookmark }) {
  const { title, faviconUrl, subtitle } = getDisplayInfo(bookmark);
  return (
    <div className="bookmark-card overlay" title={title}>
      <CardContent title={title} faviconUrl={faviconUrl} subtitle={subtitle} />
    </div>
  );
}

export default function BookmarkCard({ bookmark, lists, currentListId, onMove, onEdit, onDelete }) {
  const { title, url, faviconUrl, subtitle } = getDisplayInfo(bookmark);
  const pointerStartPos = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const menuRef = useRef(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: bookmark.id,
    data: { type: 'bookmark', bookmark },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  const handlePointerDown = (e) => {
    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    if (listeners?.onPointerDown) listeners.onPointerDown(e);
  };

  const handleClick = (e) => {
    if (!url || contextMenu || editingTitle) return;
    const start = pointerStartPos.current;
    if (start) {
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > 5 || dy > 5) return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleEditTitle = () => {
    setContextMenu(null);
    setEditingTitle(true);
    setEditTitle(title);
  };

  const handleSaveTitle = () => {
    setEditingTitle(false);
    if (editTitle.trim() && editTitle !== title && onEdit) {
      onEdit(bookmark.id, { title: editTitle.trim() });
    }
  };

  const handleMoveTo = (targetListId) => {
    setContextMenu(null);
    if (onMove && targetListId !== currentListId) {
      onMove(bookmark.id, currentListId, targetListId);
    }
  };

  const handleDelete = () => {
    setContextMenu(null);
    if (onDelete && window.confirm(`Delete "${title}"?`)) {
      onDelete(bookmark.id, currentListId);
    }
  };

  const moveTargets = (lists || [])
    .filter(l => l.id !== currentListId)
    .map(l => ({ id: l.id, name: l.name, icon: l.icon }));
  if (currentListId !== 'uncategorized') {
    moveTargets.push({ id: 'uncategorized', name: 'Uncategorized', icon: '\u{1F4E5}' });
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`bookmark-card ${isDragging ? 'dragging' : ''} ${url ? 'clickable' : ''}`}
        title={editingTitle ? '' : title}
      >
        {editingTitle ? (
          <>
            <div className="bookmark-top-row">
              <div className="bookmark-favicon-wrap">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="" className="bookmark-favicon" draggable={false} />
                ) : (
                  <div className="bookmark-favicon-placeholder" />
                )}
              </div>
              <input
                className="bookmark-edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
            <div className="bookmark-subtitle">{subtitle}</div>
          </>
        ) : (
          <CardContent title={title} faviconUrl={faviconUrl} subtitle={subtitle} />
        )}
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {url && (
            <button className="context-menu-item" onClick={() => { setContextMenu(null); window.open(url, '_blank', 'noopener,noreferrer'); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              Open in new tab
            </button>
          )}
          <button className="context-menu-item" onClick={handleEditTitle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
            Edit Title
          </button>
          <div className="context-menu-divider" />
          <button className="context-menu-item danger" onClick={handleDelete}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            Delete
          </button>
          {moveTargets.length > 0 && (
            <>
              <div className="context-menu-divider" />
              <div className="context-menu-label">Move to</div>
              <div className="context-menu-scroll">
                {moveTargets.map(target => (
                  <button key={target.id} className="context-menu-item indent" onClick={() => handleMoveTo(target.id)}>
                    {target.icon && <span className="context-menu-icon">{target.icon}</span>}
                    {target.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
