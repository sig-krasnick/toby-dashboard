import BookmarkCard from './BookmarkCard';

export default function SearchResults({ results, query, onClose }) {
  return (
    <div className="search-results-page">
      <div className="search-results-header">
        <h2>Results for "{query}"</h2>
        <span className="search-results-count">{results.length} found</span>
        <button onClick={onClose} className="search-close-btn">Clear Search</button>
      </div>
      <div className="collection-cards">
        {results.map((bookmark) => (
          <BookmarkCard key={bookmark.id} bookmark={bookmark} />
        ))}
        {results.length === 0 && (
          <p className="no-results">No bookmarks found.</p>
        )}
      </div>
    </div>
  );
}
