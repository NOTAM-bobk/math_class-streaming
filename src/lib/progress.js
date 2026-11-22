const PROGRESS_KEY = "math_class_streaming_progress";
const PROGRESS_LIMIT = 200;
const RESUME_MIN_SECONDS = 45;
const COMPLETE_RATIO = 0.96;

export function progressKey(meta, season, episode) {
  const type = meta?.type || "movie";
  const id = meta?.id || meta?.imdb_id || meta?.moviedb_id || "";
  if (type === "series" && Number.isFinite(season) && Number.isFinite(episode)) {
    return `${type}-${id}-s${season}e${episode}`;
  }
  return `${type}-${id}`;
}

export function readProgress() {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed)
      .filter(([, value]) => value && Number.isFinite(value.position))
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
      .slice(0, PROGRESS_LIMIT);
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function writeProgress(map) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // Storage can be unavailable in private mode.
  }
}

export function getProgress(meta, season, episode) {
  if (!meta) return null;
  return readProgress()[progressKey(meta, season, episode)] || null;
}

export function saveProgress(meta, { position, duration = 0, season, episode }) {
  if (!meta?.id || !Number.isFinite(position) || position < 5) return null;
  const map = readProgress();
  const key = progressKey(meta, season, episode);
  const entry = {
    position: Math.max(0, Math.round(position)),
    duration: Number.isFinite(duration) ? Math.round(duration) : 0,
    updatedAt: Date.now(),
    name: meta.name,
    type: meta.type || "movie",
    id: meta.id,
    season: Number.isFinite(season) ? season : undefined,
    episode: Number.isFinite(episode) ? episode : undefined,
  };
  map[key] = entry;
  const trimmed = Object.entries(map)
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
    .slice(0, PROGRESS_LIMIT);
  writeProgress(Object.fromEntries(trimmed));
  return entry;
}

export function clearProgressEntry(meta, season, episode) {
  const map = readProgress();
  delete map[progressKey(meta, season, episode)];
  writeProgress(map);
  return map;
}

export function clearProgress() {
  writeProgress({});
}

export function resumeSeconds(entry) {
  if (!entry || !Number.isFinite(entry.position)) return 0;
  const position = entry.position;
  if (position < RESUME_MIN_SECONDS) return 0;
  if (entry.duration > 0 && position / entry.duration >= COMPLETE_RATIO) return 0;
  return Math.floor(position);
}

export function progressRatio(entry) {
  if (!entry || !Number.isFinite(entry.position)) return 0;
  const position = Math.max(0, entry.position);
  if (entry.duration > 0) {
    return Math.min(1, position / entry.duration);
  }
  return position > 0 ? 0.12 : 0;
}
