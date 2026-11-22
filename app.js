/* math_class streaming — catalog, history and player bootstrap.

   Two adapters sit at the top:
   `catalog` reads Cinemeta (keyless Stremio metadata, IMDb-id keyed);
   `player` builds VidFast embed URLs (accepts TMDB or IMDb ids).
   Everything below renders the UI and never talks to a service directly. */

const CATALOG_API = "https://v3-cinemeta.strem.io";
const PLAYER_API = "https://vidfast.vc";
const PLAYER_THEME = "E8B25F";
const HISTORY_KEY = "math_class_streaming_recent";
const PAGE_SIZE = 14;

/** Default hero title: Inception. Swap the id to feature something else. */
const HERO = { type: "movie", id: "tt1375666" };

/** Shelf definitions. `genre` means a genre, or a year for the `year` catalog. */
const ROWS = [
  { key: "trending", title: "Trending now", note: "Popular this week", type: "movie", catalog: "top" },
  { key: "new", title: "New releases", note: "2026 films", type: "movie", catalog: "year", genre: "2026" },
  { key: "shows", title: "TV shows", note: "Series to start", type: "series", catalog: "top" },
  { key: "action", title: "Action", note: "", type: "movie", catalog: "top", genre: "Action" },
  { key: "comedy", title: "Comedy", note: "", type: "movie", catalog: "top", genre: "Comedy" },
  { key: "horror", title: "Horror", note: "", type: "movie", catalog: "top", genre: "Horror" },
  { key: "animation", title: "Animation", note: "", type: "movie", catalog: "top", genre: "Animation" },
  { key: "documentary", title: "Documentary", note: "", type: "movie", catalog: "top", genre: "Documentary" },
  { key: "thriller", title: "Thriller", note: "", type: "movie", catalog: "top", genre: "Thriller" },
];

const catalog = {
  async request(path) {
    const response = await fetch(`${CATALOG_API}${path}`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Cinemeta responded ${response.status}`);
    return response.json();
  },
  meta(type, id) {
    return this.request(`/meta/${type}/${encodeURIComponent(id)}.json`);
  },
  browse(def) {
    const extra = def.genre ? `/genre=${encodeURIComponent(def.genre)}` : "";
    return this.request(`/catalog/${def.type}/${def.catalog}${extra}.json`);
  },
  async search(query) {
    const encoded = encodeURIComponent(query);
    const [movies, shows] = await Promise.all([
      this.request(`/catalog/movie/top/search=${encoded}.json`),
      this.request(`/catalog/series/top/search=${encoded}.json`),
    ]);
    const seen = new Set();
    return [...(movies.metas || []), ...(shows.metas || [])].filter((meta) => {
      if (seen.has(meta.id)) return false;
      seen.add(meta.id);
      return true;
    });
  },
};

const player = {
  idOf(meta) {
    return meta.moviedb_id || meta.id || meta.imdb_id || "";
  },
  movieUrl(id, autoplay) {
    return `${PLAYER_API}/movie/${encodeURIComponent(id)}?${this.params(autoplay)}`;
  },
  episodeUrl(id, season, episode, autoplay) {
    return `${PLAYER_API}/tv/${encodeURIComponent(id)}/${season}/${episode}?${this.params(autoplay)}`;
  },
  params(autoplay) {
    return new URLSearchParams({
      autoPlay: String(Boolean(autoplay)),
      theme: PLAYER_THEME,
      title: "false",
      poster: "true",
    }).toString();
  },
};

/* Elements */
const rowsRoot = document.getElementById("rows");
const browseView = document.getElementById("browse");
const playerView = document.getElementById("player");
const playerInfo = document.getElementById("player-info");
const playerTitle = document.getElementById("player-title");
const playerFacts = document.getElementById("player-facts");
const playerOverview = document.getElementById("player-overview");
const playerFrame = document.getElementById("player-frame");
const playerExternal = document.getElementById("player-external");
const stageStatus = document.getElementById("stage-status");
const episodesAside = document.getElementById("episodes");
const episodeList = document.getElementById("episode-list");
const episodeCount = document.getElementById("episode-count");
const seasonSelect = document.getElementById("season-select");
const heroTitle = document.getElementById("hero-title");
const heroFacts = document.getElementById("hero-facts");
const heroCopy = document.getElementById("hero-copy");
const heroMedia = document.getElementById("hero-media");
const heroPlay = document.getElementById("hero-play");
const heroDetails = document.getElementById("hero-details");
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");
const searchSection = document.getElementById("search-results");
const searchTitle = document.getElementById("search-title");
const searchStatus = document.getElementById("search-status");
const searchShelf = searchSection.querySelector(".shelf");
const searchClose = document.getElementById("search-close");
const billboard = document.querySelector(".billboard");

let currentFilter = "all";
let currentMeta = null;

/* -------------------------------------------------------------------------
   Small helpers
   ------------------------------------------------------------------------- */

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

const yearOf = (meta) => meta.releaseInfo || meta.year || "";
const genresOf = (meta) => (meta.genres || meta.genre || []).slice(0, 3);

function formatRuntime(value) {
  if (!value) return "";
  const match = /^(\d+)\s*min/.exec(value);
  if (!match) return value;
  const minutes = Number(match[1]);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

function initials(title) {
  return String(title || "?")
    .split(" ")
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function hueOf(meta) {
  const seed = String(meta.id || meta.imdb_id || meta.name || "");
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  return hash;
}

function relativeTime(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return formatter.format(-days, "day");
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}

function factsMarkup(meta) {
  const parts = [];
  if (meta.imdbRating) {
    parts.push(`<span class="score"><strong>${esc(meta.imdbRating)}</strong><span>IMDb</span></span>`);
  }
  if (yearOf(meta)) parts.push(`<span>${esc(yearOf(meta))}</span>`);
  const runtime = formatRuntime(meta.runtime);
  if (runtime) parts.push(`<span>${esc(runtime)}</span>`);
  const genres = genresOf(meta);
  if (genres.length) parts.push(`<span>${esc(genres.join(", "))}</span>`);
  return parts.join("");
}

/* -------------------------------------------------------------------------
   History
   ------------------------------------------------------------------------- */

function readHistory() {
  try {
    const items = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(items) ? items.filter((item) => item && item.id && item.name) : [];
  } catch {
    return [];
  }
}

function writeHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked: history is a convenience, not a requirement */
  }
}

function recordHistory(meta) {
  const entry = {
    id: meta.id || meta.imdb_id,
    imdb_id: meta.imdb_id || meta.id,
    moviedb_id: meta.moviedb_id,
    name: meta.name,
    type: meta.type || "movie",
    poster: meta.poster,
    background: meta.background,
    description: meta.description,
    releaseInfo: yearOf(meta),
    runtime: meta.runtime,
    imdbRating: meta.imdbRating,
    genres: meta.genres || meta.genre || [],
    watchedAt: Date.now(),
  };
  const items = readHistory().filter((item) => item.id !== entry.id);
  items.unshift(entry);
  writeHistory(items.slice(0, 12));
}

/* -------------------------------------------------------------------------
   Tiles and shelves
   ------------------------------------------------------------------------- */

function tileMetaMarkup(meta) {
  return [yearOf(meta), formatRuntime(meta.runtime)]
    .filter(Boolean)
    .map((part) => `<span>${esc(part)}</span>`)
    .join("");
}

function createTile(meta, { metaText, onOpen } = {}) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "tile";
  const year = yearOf(meta);
  tile.setAttribute("aria-label", `Play ${meta.name}${year ? `, ${year}` : ""}`);

  const poster = meta.poster
    ? `<img src="${esc(meta.poster)}" alt="" width="300" height="450" loading="lazy" decoding="async">`
    : "";

  tile.innerHTML = `
    <span class="tile-art" style="--h:${hueOf(meta)}">
      <span class="tile-initials" aria-hidden="true">${esc(initials(meta.name))}</span>
      ${poster}
    </span>
    <span class="tile-title">${esc(meta.name)}</span>
    <span class="tile-meta">${metaText ? esc(metaText) : tileMetaMarkup(meta)}</span>
  `;

  tile.querySelector("img")?.addEventListener("error", (event) => event.target.remove(), { once: true });
  tile.addEventListener("click", () => (onOpen ? onOpen(meta) : openPlayer(meta, true)));
  return tile;
}

function skeletonTiles(count) {
  return Array.from({ length: count }, () => `
    <div class="tile is-skeleton" aria-hidden="true">
      <span class="tile-art skeleton"></span>
      <span class="sk-line skeleton"></span>
      <span class="sk-line skeleton short"></span>
    </div>
  `).join("");
}

function messageState(text, actionLabel, action) {
  const box = document.createElement("div");
  box.className = "shelf-message";
  box.innerHTML = `<p>${esc(text)}</p>`;
  if (actionLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "text-btn";
    button.textContent = actionLabel;
    button.addEventListener("click", action);
    box.append(button);
  }
  return box;
}

function wireShelf(section) {
  const shelf = section.querySelector(".shelf");
  const [previous, next] = section.querySelectorAll(".arrow");
  const refresh = () => {
    previous.disabled = shelf.scrollLeft < 4;
    next.disabled = shelf.scrollLeft + shelf.clientWidth >= shelf.scrollWidth - 4;
  };
  const scroll = (direction) => shelf.scrollBy({ left: direction * Math.max(260, shelf.clientWidth * 0.85), behavior: "smooth" });
  previous.addEventListener("click", () => scroll(-1));
  next.addEventListener("click", () => scroll(1));
  shelf.addEventListener("scroll", refresh, { passive: true });
  requestAnimationFrame(refresh);
  return refresh;
}

function createRow(def) {
  const section = document.createElement("section");
  section.className = "row";
  section.id = `row-${def.key}`;
  section.dataset.type = def.type;

  section.innerHTML = `
    <div class="shelf-head">
      <div class="shelf-heading">
        <h2>${esc(def.title)}</h2>
        ${def.note ? `<p class="row-note">${esc(def.note)}</p>` : ""}
      </div>
      <div class="shelf-actions">
        ${def.clear ? '<button class="row-clear" type="button">Clear history</button>' : ""}
        <button class="arrow" type="button" data-dir="-1" aria-label="Scroll ${esc(def.title)} left" disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"></path></svg>
        </button>
        <button class="arrow" type="button" data-dir="1" aria-label="Scroll ${esc(def.title)} right">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"></path></svg>
        </button>
      </div>
    </div>
    <div class="shelf" role="group" aria-label="${esc(def.title)}" tabindex="0">${skeletonTiles(7)}</div>
  `;

  section.refreshShelf = wireShelf(section);
  return section;
}

async function loadRow(def) {
  const section = document.getElementById(`row-${def.key}`);
  if (!section) return;
  const shelf = section.querySelector(".shelf");

  try {
    const data = await catalog.browse(def);
    const metas = (data.metas || [])
      // Cinemeta's year catalog is loose about the year, so keep only matches
      // when a shelf is labelled by year.
      .filter((meta) => def.catalog !== "year" || String(yearOf(meta)).startsWith(def.genre))
      .slice(0, PAGE_SIZE);
    if (!metas.length) throw new Error("Empty shelf");
    shelf.replaceChildren(...metas.map((meta) => createTile(meta)));
  } catch (error) {
    console.error(`Shelf "${def.key}" failed:`, error);
    shelf.replaceChildren(
      messageState("Couldn’t load this shelf.", "Retry", () => {
        shelf.innerHTML = skeletonTiles(4);
        loadRow(def);
      }),
    );
  }

  section.refreshShelf();
}

function buildRows() {
  ROWS.forEach((def) => {
    const section = createRow(def);
    rowsRoot.append(section);
    loadRow(def);
  });
  rowsRoot.removeAttribute("aria-busy");
}

function renderRecent() {
  document.getElementById("row-recent")?.remove();
  const items = readHistory();
  if (!items.length) return;

  const section = createRow({ key: "recent", title: "Recently watched", note: "", type: "mixed", clear: true });
  const shelf = section.querySelector(".shelf");
  shelf.replaceChildren(
    ...items.map((item) =>
      createTile(item, {
        metaText: `Watched ${relativeTime(item.watchedAt)}`,
        onOpen: (meta) => openPlayer(meta, true),
      }),
    ),
  );

  section.querySelector(".row-clear").addEventListener("click", () => {
    if (!window.confirm("Clear your recently watched list?")) return;
    writeHistory([]);
    section.remove();
  });

  rowsRoot.prepend(section);
  section.refreshShelf();
  applyFilter(currentFilter);
}

/* -------------------------------------------------------------------------
   Filters + search
   ------------------------------------------------------------------------- */

function applyFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".filter").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  });
  document.querySelectorAll(".row[data-type]").forEach((row) => {
    row.hidden = filter !== "all" && row.dataset.type !== filter;
  });
}

function setSearchUrl(query) {
  const base = location.pathname;
  history.replaceState(null, "", query ? `${base}?q=${encodeURIComponent(query)}` : base);
}

function closeSearch({ keepQuery = false } = {}) {
  searchSection.hidden = true;
  rowsRoot.hidden = false;
  billboard.hidden = false;
  searchInput.value = "";
  searchStatus.textContent = "";
  searchClear.hidden = true;
  searchShelf.replaceChildren();
  if (!keepQuery) setSearchUrl("");
  applyFilter(currentFilter);
}

async function runSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) {
    closeSearch();
    return;
  }

  if (!playerView.hidden) closePlayer();

  searchInput.value = query;
  searchClear.hidden = false;
  rowsRoot.hidden = true;
  billboard.hidden = true;
  searchSection.hidden = false;
  searchShelf.scrollLeft = 0;
  searchTitle.textContent = `Results for “${query}”`;
  searchStatus.textContent = "Searching…";
  searchShelf.replaceChildren(...Array.from({ length: 7 }, () => `
    <div class="tile is-skeleton" aria-hidden="true">
      <span class="tile-art skeleton"></span>
      <span class="sk-line skeleton"></span>
    </div>
  `));
  setSearchUrl(query);

  try {
    const metas = await catalog.search(query);
    if (!metas.length) {
      searchStatus.textContent = `No matches for “${query}”.`;
      searchShelf.replaceChildren(messageState("Try a different title or check the spelling."));
    } else {
      const shown = metas.slice(0, 30);
      searchStatus.textContent =
        metas.length > shown.length
          ? `${shown.length} of ${metas.length} results`
          : `${metas.length} result${metas.length === 1 ? "" : "s"}`;
      searchShelf.replaceChildren(...shown.map((meta) => createTile(meta)));
    }
  } catch (error) {
    console.error("Search failed:", error);
    searchStatus.textContent = "Search is unavailable right now.";
    searchShelf.replaceChildren(
      messageState("The catalog did not answer.", "Retry", () => runSearch(query)),
    );
  }

  searchSection.refreshShelf?.();
}

/* -------------------------------------------------------------------------
   Hero
   ------------------------------------------------------------------------- */

function renderHero(meta) {
  heroTitle.textContent = meta.name || "Untitled";
  heroFacts.innerHTML = factsMarkup(meta);
  heroCopy.textContent = meta.description || "";

  const art = meta.background || meta.poster;
  if (art) {
    const image = new Image();
    image.src = art;
    image.alt = "";
    image.width = 1280;
    image.height = 720;
    image.fetchPriority = "high";
    heroMedia.replaceChildren(image);
  }

  heroPlay.disabled = false;
  heroDetails.disabled = false;
  heroPlay.onclick = () => openPlayer(meta, true);
  heroDetails.onclick = () => openPlayer(meta, false);
}

async function loadHero() {
  try {
    const { meta } = await catalog.meta(HERO.type, HERO.id);
    if (!meta) throw new Error("No metadata");
    renderHero({ ...meta, type: meta.type || HERO.type, id: meta.id || HERO.id });
  } catch (error) {
    console.error("Hero failed:", error);
    heroTitle.textContent = "Catalog unavailable";
    heroFacts.innerHTML = "";
    heroCopy.textContent = "The catalog could not be reached. Check your connection and reload the page.";
  }
}

/* -------------------------------------------------------------------------
   Player
   ------------------------------------------------------------------------- */

playerFrame.addEventListener("load", () => {
  if (playerFrame.src && playerFrame.src !== "about:blank") stageStatus.hidden = true;
});

function showStageMessage(text) {
  stageStatus.hidden = false;
  stageStatus.textContent = text;
  playerFrame.src = "about:blank";
}

function loadFrame(url, label) {
  stageStatus.hidden = false;
  stageStatus.textContent = "Loading player…";
  playerFrame.title = `${label} player`;
  playerFrame.src = url;
  playerExternal.href = url;
}

function playEpisode(meta, season, number, autoplay = true) {
  loadFrame(player.episodeUrl(player.idOf(meta), season, number, autoplay), `${meta.name} S${season}E${number}`);
  episodeList.querySelectorAll(".episode").forEach((button) => {
    button.classList.toggle(
      "is-current",
      Number(button.dataset.season) === season && Number(button.dataset.number) === number,
    );
  });
}

function renderEpisodes(meta, autoplay) {
  const videos = (meta.videos || []).filter(
    (video) => Number.isFinite(video.season) && Number.isFinite(video.number) && video.season >= 1,
  );
  if (!videos.length) {
    episodesAside.hidden = true;
    return;
  }

  const seasons = [...new Set(videos.map((video) => video.season))].sort((a, b) => a - b);
  seasonSelect.replaceChildren(
    ...seasons.map((season) => {
      const option = document.createElement("option");
      option.value = String(season);
      option.textContent = `Season ${season}`;
      return option;
    }),
  );

  const paint = (season, play) => {
    const episodes = videos
      .filter((video) => video.season === season)
      .sort((a, b) => a.number - b.number);

    episodeCount.textContent = `${episodes.length} episode${episodes.length === 1 ? "" : "s"}`;

    episodeList.replaceChildren(
      ...episodes.map((video) => {
        const item = document.createElement("li");
        item.innerHTML = `
          <button class="episode" type="button" data-season="${season}" data-number="${video.number}">
            <span class="ep-number">${String(video.number).padStart(2, "0")}</span>
            <span class="ep-name">${esc(video.name || `Episode ${video.number}`)}</span>
            <span class="ep-play" aria-hidden="true">▶</span>
          </button>
        `;
        const button = item.querySelector("button");
        button.addEventListener("click", () => playEpisode(meta, season, video.number, true));
        return item;
      }),
    );

    if (play && episodes.length) playEpisode(meta, season, episodes[0].number, autoplay);
  };

  paint(seasons[0], true);
  seasonSelect.onchange = () => paint(Number(seasonSelect.value), false);
  episodesAside.hidden = false;
  playerInfo.classList.remove("is-single");
}

async function openPlayer(meta, autoplay) {
  currentMeta = meta;
  playerTitle.textContent = meta.name || "Untitled";
  playerFacts.innerHTML = factsMarkup(meta);
  playerOverview.textContent = meta.description || "";

  playerInfo.classList.toggle("is-single", meta.type !== "series");
  episodesAside.hidden = true;
  episodeList.replaceChildren();
  browseView.hidden = true;
  playerView.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.getElementById("back-to-browse").focus({ preventScroll: true });

  recordHistory(meta);
  renderRecent();

  const id = player.idOf(meta);
  if (!id) {
    showStageMessage("No player id is available for this title.");
    return;
  }

  if (meta.type !== "series") {
    loadFrame(player.movieUrl(id, autoplay), meta.name);
    return;
  }

  stageStatus.hidden = false;
  stageStatus.textContent = "Loading episodes…";

  try {
    // Catalog payloads only carry a partial episode sample, so always ask for
    // the full series metadata before building the episode list.
    const data = await catalog.meta("series", meta.id || meta.imdb_id);
    if (!data.meta) throw new Error("No series metadata");
    renderEpisodes(data.meta, autoplay);
  } catch (error) {
    console.error("Episodes failed:", error);
    playEpisode(meta, 1, 1, autoplay);
  }
}

function closePlayer() {
  playerView.hidden = true;
  browseView.hidden = false;
  playerFrame.src = "about:blank";
  stageStatus.hidden = false;
  currentMeta = null;
  window.scrollTo({ top: 0, behavior: "instant" });
  renderRecent();
}

/* -------------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------------- */

document.getElementById("back-to-browse").addEventListener("click", closePlayer);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !playerView.hidden) closePlayer();
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    if (!searchSection.hidden) closeSearch();
    applyFilter(button.dataset.filter);
  });
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(searchInput.value);
});

searchInput.addEventListener("input", () => {
  searchClear.hidden = !searchInput.value;
});

searchClear.addEventListener("click", () => {
  closeSearch();
  searchInput.focus();
});

searchClose.addEventListener("click", () => {
  closeSearch();
  searchInput.focus();
});

searchSection.refreshShelf = wireShelf(searchSection);
loadHero();
buildRows();
renderRecent();

const initialQuery = new URLSearchParams(location.search).get("q");
if (initialQuery) runSearch(initialQuery);
