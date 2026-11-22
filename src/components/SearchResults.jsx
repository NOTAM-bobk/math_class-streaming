import Shelf from "./Shelf.jsx";

export default function SearchResults({ search, onOpen, onClear, onRetry }) {
  return (
    <main id="main" className="search-results">
      <Shelf
        title={`Results for “${search.query}”`}
        note={search.message}
        items={search.items}
        status={search.status}
        onOpen={onOpen}
        onRetry={onRetry}
        emptyMessage={`No matches for “${search.query}”. Try a different title.`}
        action={
          <button type="button" className="row-clear" onClick={onClear}>
            Clear search
          </button>
        }
      />
    </main>
  );
}
