import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import PlayerView from "./components/PlayerView.jsx";
import SearchResults from "./components/SearchResults.jsx";
import Shelf from "./components/Shelf.jsx";
import TopTen from "./components/TopTen.jsx";
import WatchlistView from "./components/WatchlistView.jsx";
import { BookmarkIcon } from "./components/Icons.jsx";
import { catalog } from "./lib/catalog.js";
import { GAMES_URL, HERO, ROWS } from "./lib/constants.js";
import { relativeTime } from "./lib/format.js";
import { readHistory, recordHistory, writeHistory } from "./lib/history.js";
import {
  isSaved as isInWatchlist,
  readWatchlist,
  toggleWatchlist,
} from "./lib/watchlist.js";

export default function App() {
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("browse");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState(null);
  const [player, setPlayer] = useState(null);
  const [hero, setHero] = useState({ status: "loading", meta: null });
  const [recent, setRecent] = useState(readHistory);
  const [watchlist, setWatchlist] = useState(readWatchlist);
  const [toast, setToast] = useState(null);
  const searchToken = useRef(0);
  const toastTimer = useRef(0);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    let alive = true;
    catalog
      .meta(HERO.type, HERO.id)
      .then(({ meta }) => {
        if (alive) setHero({ status: "ready", meta });
      })
      .catch(() => {
        if (alive) setHero({ status: "error", meta: null });
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && player) {
        setPlayer(null);
        window.scrollTo(0, 0);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [player]);

  const openPlayer = useCallback((meta, autoplay = true) => {
    if (!meta) return;
    setRecent(recordHistory(meta));
    setPlayer({ meta, autoplay });
    window.scrollTo(0, 0);
  }, []);

  const closePlayer = useCallback(() => {
    setPlayer(null);
    window.scrollTo(0, 0);
  }, []);

  const clearSearch = useCallback(() => {
    searchToken.current += 1;
    setSearch(null);
    setInput("");
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo(0, 0);
  }, []);

  const goHome = useCallback(() => {
    setPlayer(null);
    setView("browse");
    clearSearch();
    setFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [clearSearch]);

  const showWatchlist = useCallback(() => {
    setPlayer(null);
    setView("watchlist");
    clearSearch();
    window.scrollTo(0, 0);
  }, [clearSearch]);

  const browse = useCallback(() => {
    setView("browse");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const saved = useCallback(
    (meta) => isInWatchlist(watchlist, meta),
    [watchlist]
  );

  const toggleSave = useCallback(
    (meta) => {
      if (!meta) return;
      const next = toggleWatchlist(watchlist, meta);
      setWatchlist(next);
      const nowSaved = isInWatchlist(next, meta);
      notify(
        nowSaved
          ? `Added “${meta.name}” to My List`
          : `Removed “${meta.name}” from My List`
      );
    },
    [notify, watchlist]
  );

  const submitSearch = useCallback(
    async (raw) => {
      const query = String(raw || "").trim();
      if (!query) {
        clearSearch();
        return;
      }

      setPlayer(null);
      setView("browse");
      setInput(query);
      setSearch({ query, status: "loading", items: [], message: "Searching…" });
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}?q=${encodeURIComponent(query)}`
      );
      window.scrollTo(0, 0);

      const token = searchToken.current + 1;
      searchToken.current = token;
      try {
        const metas = await catalog.search(query);
        if (token !== searchToken.current) return;
        const shown = metas.slice(0, 30);
        setSearch({
          query,
          status: metas.length ? "ready" : "empty",
          items: shown,
          message: metas.length
            ? metas.length > shown.length
              ? `${shown.length} of ${metas.length} results`
              : `${metas.length} result${metas.length === 1 ? "" : "s"}`
            : "No matches.",
        });
      } catch {
        if (token !== searchToken.current) return;
        setSearch({
          query,
          status: "error",
          items: [],
          message: "Search is unavailable right now.",
        });
      }
    },
    [clearSearch]
  );

  const playRandom = useCallback(async () => {
    try {
      const topMovies = await catalog.browse({ type: "movie", catalog: "top" });
      const metas = topMovies?.metas || [];
      if (metas.length > 0) {
        const pick = metas[Math.floor(Math.random() * metas.length)];
        openPlayer(pick, true);
        return;
      }
    } catch {}

    const candidateRow = ROWS[Math.floor(Math.random() * ROWS.length)];
    if (candidateRow) {
      try {
        const res = await catalog.browse(candidateRow);
        const metas = res?.metas || [];
        if (metas.length) {
          openPlayer(metas[Math.floor(Math.random() * metas.length)], true);
        }
      } catch {}
    }
  }, [openPlayer]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) submitSearch(query);
    // Deep-link search runs once on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (next) => {
    if (search) clearSearch();
    setView("browse");
    setFilter(next);
  };

  const clearRecent = () => {
    if (!window.confirm("Clear your recently watched list?")) return;
    writeHistory([]);
    setRecent([]);
  };

  const visibleRows =
    filter === "all" ? ROWS : ROWS.filter((row) => row.type === filter);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <Header
        filter={filter}
        onFilter={changeFilter}
        query={input}
        onQueryChange={setInput}
        onSubmit={submitSearch}
        onClear={clearSearch}
        onRandom={playRandom}
        onHome={goHome}
        recentCount={recent.length}
        onClearRecent={clearRecent}
        watchlistCount={watchlist.length}
        watchlistActive={view === "watchlist" && !player && !search}
        onWatchlist={showWatchlist}
      />

      {player ? (
        <PlayerView
          meta={player.meta}
          autoplay={player.autoplay}
          onBack={closePlayer}
          saved={saved(player.meta)}
          onToggleSave={toggleSave}
        />
      ) : search ? (
        <SearchResults
          search={search}
          onOpen={openPlayer}
          onClear={clearSearch}
          onRetry={() => submitSearch(search.query)}
          isSaved={saved}
          onToggleSave={toggleSave}
        />
      ) : view === "watchlist" ? (
        <WatchlistView
          items={watchlist}
          onOpen={openPlayer}
          onToggleSave={toggleSave}
          onBrowse={browse}
        />
      ) : (
        <main id="main" className="view-enter">
          <Hero
            meta={hero.meta}
            status={hero.status}
            saved={saved(hero.meta)}
            onPlay={(meta) => openPlayer(meta, true)}
            onDetails={(meta) => openPlayer(meta, false)}
            onToggleSave={toggleSave}
          />
          <div className="rows">
            {filter === "all" ? (
              <TopTen
                index={0}
                onOpen={openPlayer}
                isSaved={saved}
                onToggleSave={toggleSave}
              />
            ) : null}

            {filter === "all" && recent.length > 0 ? (
              <Shelf
                title="Recently watched"
                items={recent}
                onOpen={openPlayer}
                isSaved={saved}
                onToggleSave={toggleSave}
                index={1}
                metaText={(item) => `Watched ${relativeTime(item.watchedAt)}`}
                action={
                  <button
                    type="button"
                    className="row-clear"
                    onClick={clearRecent}
                  >
                    Clear history
                  </button>
                }
              />
            ) : null}

            {visibleRows.map((row, index) => (
              <Shelf
                key={row.key}
                title={row.title}
                note={row.note}
                def={row}
                onOpen={openPlayer}
                isSaved={saved}
                onToggleSave={toggleSave}
                index={index + (filter === "all" ? 2 : 1)}
              />
            ))}
          </div>
        </main>
      )}

      <footer className="footer">
        <p>
          <strong>math_class streaming</strong> is part of the{" "}
          <a href={GAMES_URL}>math_class unblocked games</a> network.
        </p>
        <p className="footer-note">
          Catalog from Cinemeta. Playback embedded from VidFast.
        </p>
      </footer>

      {toast ? (
        <div className="app-toast" role="status">
          <BookmarkIcon filled />
          <span>{toast}</span>
        </div>
      ) : null}
    </>
  );
}
