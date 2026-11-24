const TITLE_ID = /^(tt\d+|\d+)$/i;

export function slugify(value) {
  const base = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return base || "title";
}

export function titleId(meta) {
  return String(meta?.id || meta?.imdb_id || "").toLowerCase();
}

// "/movie/the-matrix-tt0133093" — readable, and id plus type rebuild the title.
export function titlePath(meta) {
  const id = titleId(meta);
  if (!id) return "/";
  const type = meta?.type === "series" ? "series" : "movie";
  return `/${type}/${slugify(meta?.name)}-${id}`;
}

export function titleUrl(meta) {
  const path = titlePath(meta);
  return typeof window === "undefined"
    ? path
    : new URL(path, window.location.origin).toString();
}

// "/q/the-matrix" — the search term lives in the path, not a query string.
export function searchPath(query) {
  return `/q/${encodeURIComponent(String(query || "").trim())}`;
}

export function parseSearchPath(pathname = "/") {
  const match = String(pathname).match(/^\/q\/(.+?)\/?$/i);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

export function parseTitlePath(pathname = "/") {
  const match = String(pathname).match(
    /^\/(movie|series)\/([a-z0-9][a-z0-9-]*?)-([a-z0-9]+)\/?$/i
  );
  if (!match || !TITLE_ID.test(match[3])) return null;
  return {
    type: match[1].toLowerCase(),
    slug: match[2],
    id: match[3].toLowerCase(),
  };
}
