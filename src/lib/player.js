export const PLAYER_API = "https://vidfast.vc";

export function idOf(meta) {
  return String(meta?.moviedb_id || meta?.id || meta?.imdb_id || "");
}

function playerParams(autoplay) {
  const params = new URLSearchParams({
    theme: "E8B25F",
    title: "false",
    poster: "true",
  });
  if (autoplay) params.set("autoPlay", "true");
  return params.toString();
}

export function movieUrl(id, autoplay = true) {
  return `${PLAYER_API}/movie/${id}?${playerParams(autoplay)}`;
}

export function episodeUrl(id, season, episode, autoplay = true) {
  return `${PLAYER_API}/tv/${id}/${season}/${episode}?${playerParams(autoplay)}`;
}
