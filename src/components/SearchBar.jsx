import { useState } from 'react';
import { searchBookmarks } from '../api/karakeep';
import BookmarkCard from './BookmarkCard';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await searchBookmarks(query.trim());
      setResults(res.bookmarks || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          className="search-input"
          placeholder="Search bookmarks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="search-clear" onClick={clearSearch}>
            &times;
          </button>
        )}
        <button type="submit" className="search-btn" disabled={searching}>
          {searching ? '...' : 'Search'}
        </button>
      </form>

      {results !== null && (
        <div className="search-results">
          <div className="search-results-header">
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <button onClick={clearSearch} className="search-close">Close</button>
          </div>
          <div className="search-results-grid">
            {results.map((bookmark) => (
              <div key={bookmark.id} className="search-result-item">
                <BookmarkCard bookmark={bookmark} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
