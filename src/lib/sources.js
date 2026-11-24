import { episodeUrl, movieUrl } from "./player.js";

const NUMERIC = /^\d+$/;

export function tmdbId(meta) {
  const value = meta?.moviedb_id ?? meta?.tmdb_id ?? "";
  return NUMERIC.test(String(value)) ? String(value) : "";
}

export function imdbId(meta) {
  const value = String(meta?.imdb_id || meta?.id || "");
  return /^tt\d+$/i.test(value) ? value.toLowerCase() : "";
}

function query(values) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

function fromStart(value) {
  return Number.isFinite(value) && value > 5 ? Math.floor(value) : "";
}

function colour(theme) {
  return String(theme || "E8B25F").replace(/^#/, "");
}

// Each source takes a TMDB or IMDb id and its own embed route; `needs` decides
// whether a title has the id a source can use.
export const SOURCES = [
  {
    id: "vidfast",
    label: "VidFast",
    needs: "any",
    url: ({ meta, season, episode, startAt, autoplay, theme, proxy }) => {
      const id = tmdbId(meta) || imdbId(meta);
      if (!id) return "";
      const options = { autoplay, startAt, theme, proxy };
      return season
        ? episodeUrl(id, season, episode, options)
        : movieUrl(id, options);
    },
  },
  {
    id: "cinesrc",
    label: "CineSrc",
    needs: "tmdb",
    url: ({ meta, season, episode, startAt, autoplay, theme }) => {
      const id = tmdbId(meta);
      if (!id) return "";
      const search = query({
        autoplay: autoplay ? "true" : "false",
        t: fromStart(startAt),
        color: colour(theme),
        s: season || "",
        e: season ? episode : "",
      });
      return season
        ? `https://cinesrc.st/embed/tv/${id}${search}`
        : `https://cinesrc.st/embed/movie/${id}${search}`;
    },
  },
  {
    id: "vidnest",
    label: "VidNest",
    needs: "tmdb",
    url: ({ meta, season, episode, startAt }) => {
      const id = tmdbId(meta);
      if (!id) return "";
      const search = query({ startAt: fromStart(startAt) });
      return season
        ? `https://vidnest.fun/tv/${id}/${season}/${episode}${search}`
        : `https://vidnest.fun/movie/${id}${search}`;
    },
  },
  {
    id: "vidsrc",
    label: "VidSrc",
    needs: "either",
    url: ({ meta, season, episode }) => {
      const id = imdbId(meta) || tmdbId(meta);
      if (!id) return "";
      return season
        ? `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`
        : `https://vidsrc.to/embed/movie/${id}`;
    },
  },
  {
    id: "nxsha",
    label: "Nxsha",
    needs: "tmdb",
    url: ({ meta, season, episode, autoplay }) => {
      const id = tmdbId(meta);
      if (!id) return "";
      const search = query({
        autoplay: autoplay ? "true" : "false",
        lang: "en",
        sub: "en",
      });
      return season
        ? `https://web.nxsha.app/embed/tv/${id}/${season}/${episode}${search}`
        : `https://web.nxsha.app/embed/movie/${id}${search}`;
    },
  },
  {
    id: "vidlink",
    label: "VidLink",
    needs: "tmdb",
    url: ({ meta, season, episode, startAt, autoplay, theme }) => {
      const id = tmdbId(meta);
      if (!id) return "";
      const search = query({
        autoplay: autoplay ? "true" : "false",
        startAt: fromStart(startAt),
        primaryColor: colour(theme),
      });
      return season
        ? `https://vidlink.pro/tv/${id}/${season}/${episode}${search}`
        : `https://vidlink.pro/movie/${id}${search}`;
    },
  },
  {
    id: "vidking",
    label: "VidKing",
    needs: "tmdb",
    url: ({ meta, season, episode, startAt, autoplay, theme }) => {
      const id = tmdbId(meta);
      if (!id) return "";
      const search = query({
        autoPlay: autoplay ? "true" : "false",
        progress: fromStart(startAt),
        color: colour(theme),
        nextEpisode: season ? "true" : "",
        episodeSelector: season ? "true" : "",
      });
      return season
        ? `https://www.vidking.net/embed/tv/${id}/${season}/${episode}${search}`
        : `https://www.vidking.net/embed/movie/${id}${search}`;
    },
  },
];

export const SOURCE_IDS = SOURCES.map((source) => source.id);

export function sourceById(id) {
  return SOURCES.find((source) => source.id === id) || null;
}

export function sourceLabel(id) {
  return sourceById(id)?.label || "Source";
}

export function canPlaySource(source, meta) {
  if (!source) return false;
  if (source.needs === "tmdb") return Boolean(tmdbId(meta));
  if (source.needs === "either") return Boolean(imdbId(meta) || tmdbId(meta));
  return Boolean(tmdbId(meta) || imdbId(meta));
}

export function buildSourceUrl({
  source,
  meta,
  season = null,
  episode = null,
  startAt = 0,
  autoplay = true,
  theme = "E8B25F",
  proxy = true,
}) {
  const definition = typeof source === "string" ? sourceById(source) : source;
  if (!definition || !canPlaySource(definition, meta)) return "";
  try {
    return (
      definition.url({
        meta,
        season: season || null,
        episode: episode || null,
        startAt,
        autoplay,
        theme,
        proxy,
      }) || ""
    );
  } catch {
    return "";
  }
}
