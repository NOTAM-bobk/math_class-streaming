import Facts from "./Facts.jsx";
import { PlayIcon } from "./Icons.jsx";

export default function Hero({
  meta,
  status,
  onPlay,
  onDetails,
  onHoverChange,
}) {
  const loading = status === "loading";
  const image = meta?.background || meta?.poster;

  return (
    <section
      className="billboard"
      aria-labelledby="hero-title"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocus={() => onHoverChange?.(true)}
      onBlur={() => onHoverChange?.(false)}
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
        </div>
      )}
    </section>
  );
}
