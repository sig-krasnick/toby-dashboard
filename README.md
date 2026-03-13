# Karakeep Dashboard

A bookmark manager frontend for [Karakeep](https://github.com/karakeep-app/karakeep) (formerly Hoarder). Provides a visual, card-based UI for organizing bookmarks into collections with drag-and-drop support.

![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple)

## Features

- **Collection-based layout** — Horizontal sections with card grids
- **Drag and drop** — Move bookmarks between collections or reorder within a collection
- **Sidebar navigation** — Browse and reorder collections, filter views, and search bookmarks
- **Right-click context menu** — Open, edit, move, or delete bookmarks
- **Inline editing** — Double-click collection names or edit bookmark titles from the context menu
- **Open All** — Open all bookmarks in a collection via a launcher page
- **Open Tabs view** — See tabs from all browser windows (requires companion extension)
- **Optimistic updates** — UI updates instantly; API calls happen in the background
- **Cache-first loading** — Renders instantly from cache, refreshes in the background
- **Cross-device ordering** — Collection and bookmark order syncs to the Karakeep server
- **Settings panel** — Configure your Karakeep server URL and API key from the UI

## Companion Chrome Extension

The `extension/` directory contains a Chromium extension that adds:

- **Save to Karakeep** — Click the extension icon to save the current page to a collection
- **New tab override** — New tabs redirect to the dashboard
- **Open Tabs bridge** — Exposes browser tab/window data to the dashboard

### Installing the extension

1. Open `chrome://extensions/` (or `brave://extensions/`)
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked** and select the `extension/` folder
4. Open the dashboard once to automatically push your Karakeep credentials to the extension

The extension ID differs per machine. To enable the Open Tabs view, copy the extension ID from `chrome://extensions/` and paste it in the dashboard Settings panel.

## Prerequisites

- A running [Karakeep](https://github.com/karakeep-app/karakeep) instance
- A Karakeep API key (generate one from Karakeep's settings)
- Node.js 18+

## Getting Started

```bash
# Clone the repo
git clone https://github.com/sig-krasnick/toby-dashboard.git
cd toby-dashboard

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser. On first launch, enter your Karakeep server URL and API key in the settings panel.

## Deployment

```bash
# Build for production
npm run build

# Deploy to server (nginx serving static files)
rsync -avz --delete --exclude='extension' dist/ root@<server-ip>:/var/www/html/
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Tech Stack

- **React 19** + **Vite 7**
- **@dnd-kit** — Drag-and-drop toolkit (core, sortable, utilities)
- **Karakeep REST API v1** — Backend for bookmark and list management

## Project Structure

```
src/
  api/
    karakeep.js          # Karakeep API client + server-synced ordering
    extension.js         # Chrome extension messaging bridge
  components/
    BookmarkCard.jsx     # Draggable bookmark card with context menu
    CollectionSection.jsx # Collection header + card grid drop zone
    Dashboard.jsx        # Main layout with DnD context
    OpenTabsPanel.jsx    # Browser tabs/windows view
    SearchResults.jsx    # Search results view
    Settings.jsx         # API key / server URL configuration
    Sidebar.jsx          # Left sidebar navigation with drag-to-reorder
  hooks/
    useKarakeep.js       # State management, caching, and optimistic updates
    useOpenTabs.js       # Browser tab polling via extension
  App.jsx                # Root component
  App.css                # All styles
extension/
  manifest.json          # Extension manifest (Manifest V3)
  background.js          # Service worker: tab override, save API, external messaging
  popup.html/js/css      # Save to Karakeep popup UI
  newtab.html/js         # New tab redirect
```

## Known Limitations

- **Open All tabs** — Browsers block multiple popups from a single click. The "Open All" button opens a launcher page with individual links and a bulk-open button instead.
- **Extension ID** — Unpacked extensions get a unique ID per machine. The Open Tabs feature requires entering the extension ID in Settings on each device.

## License

MIT
