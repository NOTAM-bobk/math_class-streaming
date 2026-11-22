export function yearOf(meta) {
  const match = String(meta?.releaseInfo || meta?.year || "").match(/\d{4}/);
  return match ? match[0] : "";
}

export function genresOf(meta) {
  return Array.isArray(meta?.genres) ? meta.genres.filter(Boolean).slice(0, 3) : [];
}

export function runtimeOf(meta) {
  return typeof meta?.runtime === "string" ? meta.runtime.trim() : "";
}

export function relativeTime(timestamp) {
  const then = Number(timestamp);
  if (!Number.isFinite(then)) return "recently";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function initials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function hueOf(seed) {
  const text = String(seed || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 360;
  }
  return hash;
}
