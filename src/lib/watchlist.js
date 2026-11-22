const WATCHLIST_KEY = "math_class_streaming_watchlist";
const WATCHLIST_LIMIT = 60;

export function keyOf(meta) {
  const type = meta?.type || "movie";
  const id = meta?.id || meta?.imdb_id || meta?.moviedb_id || "";
  return `${type}-${id}`;
}

function entryOf(meta) {
  return {
    id: meta.id,
    type: meta.type || "movie",
    name: meta.name,
    poster: meta.poster,
    background: meta.background,
    releaseInfo: meta.releaseInfo,
    imdbRating: meta.imdbRating,
    genres: meta.genres,
    description: meta.description,
    moviedb_id: meta.moviedb_id,
    addedAt: Date.now(),
  };
}

export function readWatchlist() {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.id && item.name)
      .slice(0, WATCHLIST_LIMIT);
  } catch {
    return [];
  }
}

export function writeWatchlist(items) {
  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  } catch {
    // Private mode can refuse storage; the in-memory list still works.
  }
}

export function isSaved(items, meta) {
  const key = keyOf(meta);
  return items.some((item) => keyOf(item) === key);
}

export function toggleWatchlist(items, meta) {
  if (!meta?.id) return items;
  const key = keyOf(meta);
  const exists = items.some((item) => keyOf(item) === key);
  const next = exists
    ? items.filter((item) => keyOf(item) !== key)
    : [entryOf(meta), ...items].slice(0, WATCHLIST_LIMIT);
  writeWatchlist(next);
  return next;
}
