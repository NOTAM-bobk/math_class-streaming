const HISTORY_KEY = "math_class_streaming_recent";
const HISTORY_LIMIT = 12;

function entryOf(meta) {
  return {
    id: meta.id,
    type: meta.type,
    name: meta.name,
    poster: meta.poster,
    background: meta.background,
    releaseInfo: meta.releaseInfo,
    imdbRating: meta.imdbRating,
    genres: meta.genres,
    description: meta.description,
    moviedb_id: meta.moviedb_id,
    watchedAt: Date.now(),
  };
}

export function readHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.id && item.name && item.type)
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function writeHistory(items) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // Private mode can refuse storage; watching still works.
  }
}

export function recordHistory(meta) {
  const entry = entryOf(meta);
  const next = [
    entry,
    ...readHistory().filter(
      (item) => !(item.id === entry.id && item.type === entry.type)
    ),
  ].slice(0, HISTORY_LIMIT);
  writeHistory(next);
  return next;
}
