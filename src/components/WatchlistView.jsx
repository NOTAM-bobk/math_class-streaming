import { BookmarkIcon, ChevronLeft } from "./Icons.jsx";
import Tile from "./Tile.jsx";

export default function WatchlistView({ items, onOpen, onBrowse, progressFor }) {
  return (
    <main id="main" className="watchlist view-enter">
      <header className="page-head">
        <div>
          <p className="eyebrow">My List</p>
          <h1>Your watchlist</h1>
          <p className="page-sub">
            {items.length
              ? `${items.length} saved title${items.length === 1 ? "" : "s"} · stored on this device`
              : "Saved titles live here, stored on this device."}
          </p>
        </div>
        <button type="button" className="btn btn-quiet" onClick={onBrowse}>
          <ChevronLeft />
          Browse titles
        </button>
      </header>

      {items.length ? (
        <div className="watchlist-grid">
          {items.map((meta) => (
            <Tile
              key={`${meta.type || "movie"}-${meta.id}`}
              meta={meta}
              onOpen={onOpen}
              progress={progressFor?.(meta) || null}
            />
          ))}
        </div>
      ) : (
        <div className="watchlist-empty">
          <span className="watchlist-empty-icon" aria-hidden="true">
            <BookmarkIcon />
          </span>
          <h2>Nothing saved yet</h2>
          <p>
            Open any title and tap My List on its page to keep it here for later.
            Your list stays in this browser.
          </p>
          <button type="button" className="btn btn-primary" onClick={onBrowse}>
            Find something to watch
          </button>
        </div>
      )}
    </main>
  );
}
