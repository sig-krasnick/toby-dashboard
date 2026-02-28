import { useState } from 'react';

export default function Sidebar({ lists, uncategorizedCount, onSelectList, selectedList, onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
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

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>COLLECTIONS</span>
        </div>
        {lists.map((list) => (
          <button
            key={list.id}
            className={`sidebar-item ${selectedList === list.id ? 'active' : ''}`}
            onClick={() => onSelectList(list.id)}
          >
            <span className="sidebar-item-icon">{list.icon || '\u{1F4C1}'}</span>
            <span className="sidebar-item-label">{list.name}</span>
            <span className="sidebar-count">{list.count || 0}</span>
          </button>
        ))}
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
