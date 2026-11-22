import { useCallback, useEffect, useRef, useState } from "react";
import { catalog } from "../lib/catalog.js";
import { ChevronLeft, ChevronRight } from "./Icons.jsx";
import Tile from "./Tile.jsx";

const COUNT = 10;

export default function TopTen({ onOpen, isSaved, onToggleSave, index = 0 }) {
  const [state, setState] = useState({ status: "loading", items: [] });
  const [attempt, setAttempt] = useState(0);
  const [edges, setEdges] = useState({ left: false, right: false });
  const shelfRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading", items: [] });
    catalog
      .trendingToday(COUNT)
      .then((items) => {
        if (!alive) return;
        setState({ status: items.length ? "ready" : "empty", items });
      })
      .catch(() => {
        if (alive) setState({ status: "error", items: [] });
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const updateEdges = useCallback(() => {
    const node = shelfRef.current;
    if (!node) return;
    setEdges({
      left: node.scrollLeft > 4,
      right: node.scrollLeft + node.clientWidth < node.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
  }, [state.items.length, updateEdges]);

  useEffect(() => {
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);

  const scroll = (direction) => {
    const node = shelfRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.max(280, node.clientWidth * 0.85),
      behavior: "smooth",
    });
  };

  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  return (
    <section className="row top-ten" style={{ "--i": index }}>
      <div className="shelf-head">
        <div className="shelf-heading">
          <h2>Top 10 today</h2>
          <p className="row-note">Trending right now · {today}</p>
        </div>
        <div className="shelf-actions">
          <span className="rank-pill">Live</span>
          <button
            type="button"
            className="arrow"
            onClick={() => scroll(-1)}
            disabled={!edges.left}
            aria-label="Scroll top 10 left"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="arrow"
            onClick={() => scroll(1)}
            disabled={!edges.right}
            aria-label="Scroll top 10 right"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <div
        className="shelf top-ten-shelf"
        role="group"
        aria-label="Top 10 trending today"
        tabIndex={0}
        ref={shelfRef}
        onScroll={updateEdges}
      >
        {state.status === "loading"
          ? Array.from({ length: COUNT }, (_, position) => (
              <div className="tile is-skeleton" key={position} aria-hidden="true">
                <span className="tile-art skeleton" />
                <span className="sk-line skeleton" />
                <span className="sk-line short skeleton" />
              </div>
            ))
          : null}

        {state.status === "error" ? (
          <div className="shelf-message">
            <p>Trending titles could not load.</p>
            <button
              type="button"
              className="text-btn"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry
            </button>
          </div>
        ) : null}

        {state.status === "empty" ? (
          <div className="shelf-message">
            <p>Nothing is trending yet.</p>
          </div>
        ) : null}

        {state.status === "ready"
          ? state.items.map((meta, position) => (
              <Tile
                key={`${meta.type || "movie"}-${meta.id}`}
                meta={meta}
                rank={position + 1}
                onOpen={onOpen}
                saved={Boolean(isSaved?.(meta))}
                onToggleSave={onToggleSave}
              />
            ))
          : null}
      </div>
    </section>
  );
}
