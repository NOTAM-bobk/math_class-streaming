import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import PanicButton from "./components/PanicButton.jsx";
import PlayerView from "./components/PlayerView.jsx";
import SearchResults from "./components/SearchResults.jsx";
import Shelf from "./components/Shelf.jsx";
import { catalog } from "./lib/catalog.js";
import { GAMES_URL, HERO, ROWS } from "./lib/constants.js";
import { relativeTime } from "./lib/format.js";
import { readHistory, recordHistory, writeHistory } from "./lib/history.js";

export default function App() {
  const [filter, setFilter] = useState("all");
  const [input, setInput] = useState("");
  const [search, setSearch] = useState(null);
  const [player, setPlayer] = useState(null);
  const [hero, setHero] = useState({ status: "loading", meta: null });
  const [recent, setRecent] = useState(readHistory);
  const searchToken = useRef(0);

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

  const submitSearch = useCallback(
    async (raw) => {
      const query = String(raw || "").trim();
      if (!query) {
        clearSearch();
        return;
      }

      setPlayer(null);
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

  useEffect(() => {
    const query = new URLSearchParams(window.location.search).get("q");
    if (query) submitSearch(query);
    // Deep-link search runs once on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (next) => {
    if (search) clearSearch();
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
      />

      {player ? (
        <PlayerView
          meta={player.meta}
          autoplay={player.autoplay}
          onBack={closePlayer}
        />
      ) : search ? (
        <SearchResults
          search={search}
          onOpen={openPlayer}
          onClear={clearSearch}
          onRetry={() => submitSearch(search.query)}
        />
      ) : (
        <main id="main">
          <Hero
            meta={hero.meta}
            status={hero.status}
            onPlay={(meta) => openPlayer(meta, true)}
            onDetails={(meta) => openPlayer(meta, false)}
          />
          <div className="rows">
            {filter === "all" && recent.length > 0 ? (
              <Shelf
                title="Recently watched"
                items={recent}
                onOpen={openPlayer}
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

            {visibleRows.map((row) => (
              <Shelf
                key={row.key}
                title={row.title}
                note={row.note}
                def={row}
                onOpen={openPlayer}
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

      <PanicButton />
    </>
  );
}
