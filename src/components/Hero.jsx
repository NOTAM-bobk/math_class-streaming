import { useEffect, useState } from "react";
import Facts from "./Facts.jsx";
import { PlayIcon } from "./Icons.jsx";

const ROTATE_MS = 8000;

export default function Hero({
  items = [],
  status,
  reduceMotion = false,
  onPlay,
  onDetails,
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const loading = status === "loading";
  const count = items.length;
  const current = count ? index % count : 0;
  const meta = items[current] || null;
  const image = meta?.background || meta?.poster;

  // Move through the featured titles, but never under the pointer, a focused
  // control or a reduced-motion preference.
  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return undefined;
    const timer = window.setTimeout(() => {
      setIndex((value) => (value + 1) % count);
    }, ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [count, index, paused, reduceMotion]);

  return (
    <section
      className="billboard"
      aria-labelledby="hero-title"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="billboard-media" aria-hidden="true">
        {image ? (
          <img
            src={image}
            alt=""
            width="1280"
            height="720"
            fetchPriority="high"
            decoding="async"
          />
        ) : null}
      </div>
      <div className="billboard-scrim" aria-hidden="true" />

      {loading ? (
        <div className="billboard-body">
          <h1 id="hero-title" className="sr-only">
            Loading featured title
          </h1>
          <div className="billboard-loading" aria-hidden="true">
            <span className="sk-pill skeleton" />
            <span className="sk-title skeleton" />
            <span className="sk-facts skeleton" />
            <span className="sk-text skeleton" />
            <span className="sk-text skeleton is-short" />
            <span className="sk-buttons">
              <span className="sk-button skeleton" />
              <span className="sk-button skeleton" />
            </span>
          </div>
          <span className="sr-only" role="status">
            Loading featured title…
          </span>
        </div>
      ) : (
        <div className="billboard-body">
          <p className="hero-eyebrow">
            <span className="hero-dot" aria-hidden="true" />
            Featured {meta?.type === "series" ? "series" : "film"} tonight
          </p>

          <h1 id="hero-title">{meta?.name || "Catalog unavailable"}</h1>

          <Facts meta={meta} />

          <p className="billboard-copy">
            {meta?.description ||
              (status === "error"
                ? "The catalog could not be reached. Check your connection and reload the page."
                : "")}
          </p>

          <div className="billboard-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!meta}
              onClick={() => onPlay(meta)}
            >
              <PlayIcon />
              Play
            </button>

            <button
              type="button"
              className="btn btn-quiet"
              disabled={!meta}
              onClick={() => onDetails(meta)}
            >
              Details
            </button>
          </div>

          {count > 1 ? (
            <div className="hero-dots" role="group" aria-label="Featured titles">
              {items.map((item, itemIndex) => (
                <button
                  key={`${item.type || "movie"}-${item.id}`}
                  type="button"
                  className={`hero-page-dot${
                    itemIndex === current ? " is-active" : ""
                  }`}
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Show ${item.name}`}
                  aria-current={itemIndex === current ? "true" : undefined}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
