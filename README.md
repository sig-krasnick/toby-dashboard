# Karakeep Dashboard

A bookmark manager frontend for [Karakeep](https://github.com/karakeep-app/karakeep) (formerly Hoarder). Provides a visual, card-based UI for organizing bookmarks into collections with drag-and-drop support.

![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-7-purple)

## Features

- **Collection-based layout** — Horizontal sections with card grids
- **Drag and drop** — Move bookmarks between collections or reorder within a collection
- **Sidebar navigation** — Browse collections, filter views, and search bookmarks
- **Right-click context menu** — Open, edit, move, or delete bookmarks
- **Inline editing** — Double-click collection names or edit bookmark titles from the context menu
- **Open All** — Open all bookmarks in a collection via a launcher page
- **Optimistic updates** — UI updates instantly; API calls happen in the background
- **Settings panel** — Configure your Karakeep server URL and API key from the UI

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
    karakeep.js        # Karakeep API client
  components/
    BookmarkCard.jsx    # Draggable bookmark card with context menu
    CollectionSection.jsx # Collection header + card grid drop zone
    Dashboard.jsx       # Main layout with DnD context
    SearchResults.jsx   # Search results view
    Settings.jsx        # API key / server URL configuration
    Sidebar.jsx         # Left sidebar navigation
  hooks/
    useKarakeep.js      # State management and optimistic updates
  App.jsx               # Root component
  App.css               # All styles
```

## Known Limitations

- **Open All tabs** — Browsers block multiple popups from a single click. The "Open All" button opens a launcher page with individual links and a bulk-open button instead.
- **Bookmark ordering** — Within-collection reorder is local only; Karakeep's API does not persist bookmark order within lists.

## License

MIT
