import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSidebarItem({ list, selectedList, onSelectList }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="sidebar-item-wrapper">
      <span className="sidebar-drag-handle" {...listeners}>
        <svg width="8" height="10" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </span>
      <button
        className={`sidebar-item sidebar-item-sortable ${selectedList === list.id ? 'active' : ''}`}
        onClick={() => onSelectList(list.id)}
      >
        <span className="sidebar-item-icon">{list.icon || '\u{1F4C1}'}</span>
        <span className="sidebar-item-label">{list.name}</span>
        <span className="sidebar-count">{list.count || 0}</span>
      </button>
    </div>
  );
}

export default function Sidebar({ lists, uncategorizedCount, onSelectList, selectedList, onSearch, extensionConnected = false, onReorderLists }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeList, setActiveList] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleDragStart = (event) => {
    const list = lists.find(l => l.id === event.active.id);
    setActiveList(list || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveList(null);
    if (over && active.id !== over.id && onReorderLists) {
      onReorderLists(active.id, over.id);
    }
  };

  const totalBookmarks = lists.reduce((sum, l) => sum + (l.count || 0), 0) + uncategorizedCount;

  return (
    <aside className="sidebar">
      <div className="sidebar-search">
        <form onSubmit={handleSearch}>
          <div className="sidebar-search-box">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-item ${selectedList === 'all' ? 'active' : ''}`}
          onClick={() => onSelectList('all')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          All Bookmarks
          <span className="sidebar-count">{totalBookmarks}</span>
        </button>
      </nav>

      {extensionConnected && (
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span>OPEN TABS</span>
          </div>
          <button
            className={`sidebar-item ${selectedList === 'open-tabs' ? 'active' : ''}`}
            onClick={() => onSelectList('open-tabs')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span className="sidebar-item-label">Browser Windows</span>
          </button>
        </div>
      )}

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>COLLECTIONS</span>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={lists.map(l => l.id)} strategy={verticalListSortingStrategy}>
            {lists.map((list) => (
              <SortableSidebarItem
                key={list.id}
                list={list}
                selectedList={selectedList}
                onSelectList={onSelectList}
              />
            ))}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeList ? (
              <div className="sidebar-item sidebar-drag-overlay">
                <span className="sidebar-item-icon">{activeList.icon || '\u{1F4C1}'}</span>
                <span className="sidebar-item-label">{activeList.name}</span>
                <span className="sidebar-count">{activeList.count || 0}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        {uncategorizedCount > 0 && (
          <button
            className={`sidebar-item ${selectedList === 'uncategorized' ? 'active' : ''}`}
            onClick={() => onSelectList('uncategorized')}
          >
            <span className="sidebar-item-icon">{'\u{1F4E5}'}</span>
            <span className="sidebar-item-label">Uncategorized</span>
            <span className="sidebar-count">{uncategorizedCount}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
