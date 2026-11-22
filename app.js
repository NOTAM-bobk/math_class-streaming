/* math_class streaming — skeleton bootstrap.
   Catalog entries below are placeholders. Swap `catalog` for a real metadata
   source and wire the stage in `openPlayer` to a video element when playback
   lands. */

const catalog = [
  {
    id: "last-theorem",
    title: "The Last Theorem",
    kind: "Film",
    year: 2026,
    runtime: "2h 08m",
    rating: "PG-13",
    hue: 236,
    flag: "Film",
    overview:
      "A reclusive mathematician finds a proof that rewrites the rules of the game — and the people who want it buried.",
    rows: ["trending", "movies"],
  },
  {
    id: "night-shift",
    title: "Night Shift",
    kind: "Film",
    year: 2025,
    runtime: "1h 47m",
    rating: "R",
    hue: 262,
    flag: "Film",
    overview: "Two night guards keep a derelict arcade alive, one quarter at a time.",
    rows: ["trending", "movies", "continue"],
  },
  {
    id: "delta-9",
    title: "Delta 9",
    kind: "Film",
    year: 2026,
    runtime: "1h 58m",
    rating: "PG-13",
    hue: 200,
    flag: "Film",
    overview: "A routine supply run through the belt goes wrong in exactly one way.",
    rows: ["trending", "movies"],
  },
  {
    id: "chalkboard",
    title: "Chalkboard",
    kind: "Series",
    year: 2025,
    runtime: "3 seasons",
    rating: "TV-14",
    hue: 168,
    flag: "Series",
    overview: "A high school math department fights the district, the calculators and each other.",
    rows: ["trending", "shows"],
  },
  {
    id: "asymptote",
    title: "Asymptote",
    kind: "Series",
    year: 2026,
    runtime: "1 season",
    rating: "TV-MA",
    hue: 212,
    flag: "New",
    overview: "A curve that never touches the line — and the analyst who takes it personally.",
    rows: ["trending", "shows"],
  },
  {
    id: "blackboard-jungle",
    title: "Blackboard Jungle",
    kind: "Film",
    year: 2024,
    runtime: "2h 02m",
    rating: "R",
    hue: 24,
    flag: "Film",
    overview: "Summer school, one projector, and a stack of films the district forgot to ban.",
    rows: ["movies"],
  },
  {
    id: "null-set",
    title: "Null Set",
    kind: "Series",
    year: 2025,
    runtime: "2 seasons",
    rating: "TV-14",
    hue: 286,
    flag: "Series",
    overview: "A missing persons case with no elements at all.",
    rows: ["shows"],
  },
  {
    id: "quarterly",
    title: "Quarterly",
    kind: "Film",
    year: 2023,
    runtime: "1h 39m",
    rating: "PG",
    hue: 44,
    flag: "Film",
    overview: "Four friends, one budget, ninety minutes to spend it.",
    rows: ["movies", "continue"],
  },
  {
    id: "the-curve",
    title: "The Curve",
    kind: "Series",
    year: 2026,
    runtime: "1 season",
    rating: "TV-MA",
    hue: 320,
    flag: "New",
    overview: "Grading on a curve is easy until someone builds a better curve.",
    rows: ["shows"],
  },
  {
    id: "study-hall",
    title: "Study Hall",
    kind: "Film",
    year: 2024,
    runtime: "1h 52m",
    rating: "PG-13",
    hue: 96,
    flag: "Film",
    overview: "Forty minutes of silence, then whatever happens next.",
    rows: ["continue"],
  },
];

const rows = [
  { id: "trending", title: "Trending now", note: "Updated hourly" },
  { id: "movies", title: "Movies", note: "Feature length" },
  { id: "shows", title: "TV shows", note: "Episodic" },
  { id: "continue", title: "Continue watching", note: "Pick up where you left off" },
];

const rowsRoot = document.getElementById("rows");
const browseView = document.getElementById("browse");
const playerView = document.getElementById("player");
const playerTitle = document.getElementById("player-title");
const playerMeta = document.getElementById("player-meta");
const playerKind = document.getElementById("player-kind");
const playerOverview = document.getElementById("player-overview");

function initials(title) {
  return title
    .split(" ")
    .filter((word) => /[a-z0-9]/i.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function makeCard(item) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "card";
  card.dataset.id = item.id;
  card.setAttribute("aria-label", `Open ${item.title}`);
  card.innerHTML = `
    <div class="card-art" style="--h:${item.hue}">
      <span class="card-flag">${item.flag}</span>
      <span class="card-glyph">${initials(item.title)}</span>
    </div>
    <div class="card-body">
      <p class="card-title">${item.title}</p>
      <p class="card-meta">${item.year} &middot; ${item.runtime} &middot; ${item.rating}</p>
    </div>
  `;
  card.addEventListener("click", () => openPlayer(item));
  return card;
}

function renderRows() {
  const fragment = document.createDocumentFragment();

  rows.forEach((row) => {
    const items = catalog.filter((item) => item.rows.includes(row.id));
    if (!items.length) return;

    const section = document.createElement("section");
    section.className = "row";
    section.setAttribute("aria-labelledby", `row-${row.id}`);

    const head = document.createElement("div");
    head.className = "row-head";
    head.innerHTML = `<h2 id="row-${row.id}">${row.title}</h2><p>${row.note}</p>`;

    const grid = document.createElement("div");
    grid.className = "grid";
    items.forEach((item) => grid.append(makeCard(item)));

    section.append(head, grid);
    fragment.append(section);
  });

  rowsRoot.append(fragment);
}

function openPlayer(item) {
  playerKind.textContent = item.kind;
  playerTitle.textContent = item.title;
  playerMeta.innerHTML = `${item.year} &middot; ${item.runtime} &middot; ${item.rating}`;
  playerOverview.textContent = item.overview;

  const stage = document.getElementById("stage");
  stage.style.setProperty("--h", item.hue);

  browseView.hidden = true;
  playerView.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.getElementById("back-to-browse").focus({ preventScroll: true });
}

function closePlayer() {
  playerView.hidden = true;
  browseView.hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
}

document.getElementById("back-to-browse").addEventListener("click", closePlayer);

document.querySelectorAll("[data-open-player]").forEach((button) => {
  button.addEventListener("click", () => openPlayer(catalog[0]));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !playerView.hidden) closePlayer();
});

/* Season tabs are visual state only in the skeleton. */
document.querySelectorAll(".season-tabs .chip").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".season-tabs .chip")
      .forEach((other) => {
        other.classList.toggle("is-active", other === tab);
        other.setAttribute("aria-selected", String(other === tab));
      });
  });
});

/* Episode rows are visual state only in the skeleton. */
document.querySelectorAll(".episode").forEach((episode) => {
  episode.addEventListener("click", () => {
    document
      .querySelectorAll(".episode")
      .forEach((other) => other.classList.toggle("is-current", other === episode));
  });
});

renderRows();
