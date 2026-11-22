import Facts from "./Facts.jsx";
import { PlayIcon } from "./Icons.jsx";

export default function Hero({ meta, status, onPlay, onDetails }) {
  const loading = status === "loading";
  const image = meta?.background || meta?.poster;

  return (
    <section className="billboard" aria-labelledby="hero-title">
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

      <div className="billboard-body">
        <h1 id="hero-title">
          {meta?.name || (loading ? "Loading…" : "Catalog unavailable")}
        </h1>

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
    </section>
  );
}
