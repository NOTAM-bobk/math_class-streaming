/* math_class streaming — catalog bootstrap.

   Hero: pinned to one title by id (IMDb `tt…`). Cinemeta is keyed on IMDb ids, so
   a TMDB id needs resolving first (e.g. TMDB /movie/{id}/external_ids) before it
   can be swapped in here.
   Rows: fetched by category from Cinemeta, the keyless Stremio metadata addon.
   Playback remains a shell — nothing streams yet. */

const API = "https://v3-cinemeta.strem.io";
const PAGE_SIZE = 12;

/** Default hero title: Inception. Swap the id to feature something else. */
const HERO = { type: "movie", id: "tt1375666" };

/** Category rows. `genre` is either a genre or, for the `year` catalog, a year. */
const ROWS = [
  { key: "trending", title: "Trending now", note: "What everyone is watching", type: "movie", catalog: "top" },
  { key: "new", title: "New releases", note: "2026 · feature films", type: "movie", catalog: "year", genre: "2026" },
  { key: "shows", title: "TV shows", note: "Start a series tonight", type: "series", catalog: "top" },
  { key: "scifi", title: "Sci-fi", note: "Genre · Sci-Fi", type: "movie", catalog: "top", genre: "Sci-Fi" },
];

const rowsRoot = document.getElementById("rows");
const browseView = document.getElementById("browse");
const playerView = document.getElementById("player");
const playerInfo = document.getElementById("player-info");
const playerTitle = document.getElementById("player-title");
const playerMeta = document.getElementById("player-meta");
const playerKind = document.getElementById("player-kind");
const playerOverview = document.getElementById("player-overview");
const episodesAside = document.getElementById("episodes");
const episodeList = document.getElementById("episode-list");
const episodeCount = document.getElementById("episode-count");

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

const yearOf = (meta) => meta.releaseInfo || meta.year || "";

function genresOf(meta) {
  return (meta.genres || meta.genre || []).slice(0, 3);
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
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return hash;
}

async function api(path) {
  const response = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Cinemeta responded ${response.status}`);
  return response.json();
}

function catalogPath(def) {
  const extra = def.genre ? `/genre=${encodeURIComponent(def.genre)}` : "";
  return `/catalog/${def.type}/${def.catalog}${extra}.json`;
}

/* -------------------------------------------------------------------------
   Hero
   ------------------------------------------------------------------------- */

function heroMetaLine(meta) {
  const parts = [yearOf(meta), meta.runtime, genresOf(meta).join(" / ")].filter(Boolean).map((part) => `<span>${esc(part)}</span>`);
  const markup = parts.join('<span class="sep"></span>');
  const rating = meta.imdbRating ? `<span class="badge">${esc(meta.imdbRating)} IMDb</span>` : "";
  return `${markup}${rating}`;
}

function renderHero(meta) {
  document.getElementById("billboard-title").textContent = meta.name || "Untitled";
  document.getElementById("hero-kicker").textContent = meta.type === "series" ? "Featured series" : "Featured film";
  document.getElementById("hero-meta").innerHTML = heroMetaLine(meta);
  document.getElementById("hero-copy").textContent = meta.description || "";

  const art = meta.background || meta.poster;
  if (art) {
    const image = new Image();
    image.alt = "";
    image.src = art;
    image.fetchPriority = "high";
    document.getElementById("hero-media").replaceChildren(image);
  }

  const play = document.getElementById("hero-play");
  play.disabled = false;
  play.onclick = () => openPlayer(meta);
}

function heroFailed() {
  document.getElementById("billboard-title").textContent = "Catalog unavailable";
  document.getElementById("hero-kicker").textContent = "Featured";
  document.getElementById("hero-copy").textContent = "The metadata service could not be reached, so the featured title has no id to load.";
  document.getElementById("hero-meta").innerHTML = "";
  document.getElementById("hero-play").disabled = true;
}

async function loadHero() {
  try {
    const data = await api(`/meta/${HERO.type}/${HERO.id}.json`);
    if (!data.meta) throw new Error("No meta in response");
    renderHero({ ...data.meta, type: data.meta.type || HERO.type, id: data.meta.id || HERO.id });
  } catch (error) {
    console.error("Hero failed:", error);
    heroFailed();
  }
}

/* -------------------------------------------------------------------------
   Cards
   ------------------------------------------------------------------------- */

function makeCard(meta) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.setAttribute("aria-label", `Open ${meta.name}${yearOf(meta) ? ` (${yearOf(meta)})` : ""}`);

  const rating = meta.imdbRating ? `<span class="card-rating">${esc(meta.imdbRating)}</span>` : "";
  const poster = meta.poster
    ? `<img class="card-poster" src="${esc(meta.poster)}" alt="" loading="lazy" decoding="async">`
    : "";

  card.innerHTML = `
    <div class="card-art" style="--h:${hueOf(meta)}">
      <span class="card-glyph" aria-hidden="true">${esc(initials(meta.name))}</span>
      ${poster}
      ${rating}
    </div>
    <div class="card-body">
      <p class="card-title">${esc(meta.name)}</p>
      <p class="card-meta">${esc([yearOf(meta), meta.runtime].filter(Boolean).join(" · ") || (meta.type === "series" ? "Series" : "Film"))}</p>
    </div>
  `;

  card.querySelector("img")?.addEventListener("error", (event) => event.target.remove(), { once: true });
  card.addEventListener("click", () => openPlayer(meta));
  return card;
}

/* -------------------------------------------------------------------------
   Rows
   ------------------------------------------------------------------------- */

function skeletonCards(count) {
  return Array.from({ length: count }, () => `
    <div class="card is-skeleton" aria-hidden="true">
      <div class="card-art skeleton"></div>
      <div class="card-body">
        <span class="sk-line skeleton"></span>
        <span class="sk-line skeleton short"></span>
      </div>
    </div>
  `).join("");
}

function buildRow(def) {
  const section = document.createElement("section");
  section.className = "row";
  section.id = `row-${def.key}`;
  section.innerHTML = `
    <div class="row-head">
      <h2>${esc(def.title)}</h2>
      <p>${esc(def.note)}</p>
    </div>
    <div class="grid" aria-busy="true">${skeletonCards(6)}</div>
  `;
  return section;
}

function errorBlock(def, retry) {
  const block = document.createElement("div");
  block.className = "row-error";
  block.innerHTML = `<p>Couldn’t load ${esc(def.title.toLowerCase())}.</p>`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "link-btn";
  button.textContent = "Retry";
  button.addEventListener("click", retry);
  block.append(button);
  return block;
}

async function loadRow(def) {
  const section = document.getElementById(`row-${def.key}`);
  const grid = section.querySelector(".grid");
  grid.setAttribute("aria-busy", "true");

  try {
    const data = await api(catalogPath(def));
    const metas = (data.metas || []).slice(0, PAGE_SIZE);
    if (!metas.length) throw new Error("Empty catalog");
    grid.classList.remove("is-error");
    grid.replaceChildren(...metas.map(makeCard));
  } catch (error) {
    console.error(`Row "${def.key}" failed:`, error);
    grid.classList.add("is-error");
    grid.replaceChildren(errorBlock(def, () => loadRow(def)));
  } finally {
    grid.removeAttribute("aria-busy");
  }
}

function buildRows() {
  const fragment = document.createDocumentFragment();
  ROWS.forEach((def) => fragment.append(buildRow(def)));
  rowsRoot.append(fragment);
  rowsRoot.removeAttribute("aria-busy");
  ROWS.forEach(loadRow);
}

/* -------------------------------------------------------------------------
   Player
   ------------------------------------------------------------------------- */

function setStageArt(meta) {
  document.getElementById("stage-media").replaceChildren();
  const art = meta.background || meta.poster;
  if (!art) return;
  const image = new Image();
  image.alt = "";
  image.src = art;
  document.getElementById("stage-media").append(image);
}

function renderPlayer(meta) {
  playerKind.textContent = meta.type === "series" ? "Series" : "Film";
  playerTitle.textContent = meta.name || "Untitled";
  playerMeta.innerHTML = heroMetaLine(meta);
  playerOverview.textContent = meta.description || "";
  setStageArt(meta);
}

function renderEpisodes(meta) {
  const videos = (meta.videos || []).filter((video) => Number.isFinite(video.season) && Number.isFinite(video.number));
  if (!videos.length) {
    episodesAside.hidden = true;
    playerInfo.classList.add("is-single");
    return;
  }

  const season = Math.min(...videos.map((video) => video.season));
  const episodes = videos
    .filter((video) => video.season === season)
    .sort((a, b) => a.number - b.number)
    .slice(0, 12);

  episodeCount.textContent = `Season ${season} · ${episodes.length} episodes`;

  episodeList.replaceChildren(
    ...episodes.map((video, index) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <button class="episode${index === 0 ? " is-current" : ""}" type="button">
          <span class="ep-num">${esc(String(video.number).padStart(2, "0"))}</span>
          <span class="ep-text">
            <strong>${esc(video.name || `Episode ${video.number}`)}</strong>
            <small>${esc(video.season !== undefined ? `S${video.season} E${video.number}` : "")}</small>
          </span>
          <span class="ep-bar" aria-hidden="true"></span>
        </button>
      `;
      item.querySelector("button").addEventListener("click", (event) => {
        episodeList.querySelectorAll(".episode").forEach((other) => other.classList.remove("is-current"));
        event.currentTarget.classList.add("is-current");
      });
      return item;
    }),
  );

  episodesAside.hidden = false;
  playerInfo.classList.remove("is-single");
}

async function openPlayer(meta) {
  const item = {
    ...meta,
    id: meta.id || meta.imdb_id,
    type: meta.type || "movie",
  };

  playerInfo.classList.toggle("is-single", item.type !== "series");
  episodesAside.hidden = true;
  episodeList.replaceChildren();

  renderPlayer(item);
  browseView.hidden = true;
  playerView.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.getElementById("back-to-browse").focus({ preventScroll: true });

  if (item.type !== "series" || !item.id) return;

  try {
    const data = await api(`/meta/series/${item.id}.json`);
    if (data.meta) renderEpisodes(data.meta);
  } catch (error) {
    console.error("Episodes failed:", error);
  }
}

function closePlayer() {
  playerView.hidden = true;
  browseView.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* -------------------------------------------------------------------------
   Boot
   ------------------------------------------------------------------------- */

document.getElementById("back-to-browse").addEventListener("click", closePlayer);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !playerView.hidden) closePlayer();
});

loadHero();
buildRows();
