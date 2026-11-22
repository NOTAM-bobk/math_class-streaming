export const PLAYER_API = "https://vidfast.vc";
export const PROXY_PREFIX = "/embed";

export function idOf(meta) {
  return String(meta?.moviedb_id || meta?.id || meta?.imdb_id || "");
}

function playerParams({ autoplay = true, startAt = 0, theme = "E8B25F" } = {}) {
  const params = new URLSearchParams({
    theme: String(theme || "E8B25F").replace(/^#/, ""),
    title: "false",
    poster: "true",
    autoPlay: autoplay ? "true" : "false",
  });
  if (Number.isFinite(startAt) && startAt > 0) {
    params.set("startAt", String(Math.floor(startAt)));
  }
  return params.toString();
}

function baseUrl(proxy) {
  return proxy ? PROXY_PREFIX : PLAYER_API;
}

export function movieUrl(id, options = {}) {
  const { proxy = true, ...rest } = options;
  return `${baseUrl(proxy)}/movie/${encodeURIComponent(id)}?${playerParams(rest)}`;
}

export function episodeUrl(id, season, episode, options = {}) {
  const { proxy = true, ...rest } = options;
  return `${baseUrl(proxy)}/tv/${encodeURIComponent(id)}/${season}/${episode}?${playerParams(rest)}`;
}

// The same embed on VidFast's own domain, for the "open in new tab" escape hatch.
export function directUrl(url) {
  if (!url) return PLAYER_API;
  if (url.startsWith(PROXY_PREFIX)) {
    return `${PLAYER_API}${url.slice(PROXY_PREFIX.length)}`;
  }
  return url;
}
