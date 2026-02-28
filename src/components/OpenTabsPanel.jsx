import { getSavedExtensionId } from '../api/extension';

export default function OpenTabsPanel({ windows, loading, error, extensionConnected, onSaveWindow }) {
  if (!extensionConnected) {
    const hasId = Boolean(getSavedExtensionId());
    return (
      <div className="open-tabs-panel">
        <div className="open-tabs-setup">
          <h2>Connect Chrome Extension</h2>
          <ol>
            <li>Open <code>chrome://extensions</code> and enable Developer mode</li>
            <li>Click "Load unpacked" and select the <code>extension/</code> folder from this project</li>
            <li>Copy the extension ID shown on the card</li>
            <li>Paste it in Settings (gear icon above)</li>
          </ol>
          {hasId && error && (
            <p className="open-tabs-error">
              Extension not responding: {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="open-tabs-panel">
        <div className="spinner" />
      </div>
    );
  }

  if (windows.length === 0) {
    return (
      <div className="open-tabs-panel">
        <p className="open-tabs-empty">No browser windows found.</p>
      </div>
    );
  }

  return (
    <div className="open-tabs-panel">
      {windows.map((win, idx) => (
        <div key={win.id} className="open-tabs-window">
          <div className="open-tabs-window-header">
            <div className="open-tabs-window-title">
              <span>Window {idx + 1}</span>
              {win.focused && <span className="open-tabs-badge">Focused</span>}
              <span className="open-tabs-tab-count">{win.tabs.length} tabs</span>
            </div>
            <button
              className="open-tabs-save-btn"
              onClick={() => onSaveWindow(win.tabs)}
              title="Save as collection"
            >
              Save as Collection
            </button>
          </div>
          <ul className="open-tabs-list">
            {win.tabs.map((tab) => {
              let hostname = '';
              try { hostname = new URL(tab.url).hostname; } catch { /* ignore */ }
              return (
                <li key={tab.id} className="open-tabs-tab">
                  <img
                    className="open-tabs-favicon"
                    src={tab.favIconUrl || `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                    alt=""
                    width="16"
                    height="16"
                    onError={(e) => { e.target.style.visibility = 'hidden'; }}
                  />
                  <a
                    className="open-tabs-tab-title"
                    href={tab.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tab.url}
                  >
                    {tab.title || hostname || tab.url}
                  </a>
                  <span className="open-tabs-hostname">{hostname}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
