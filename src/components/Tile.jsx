import { genresOf, hueOf, initials, yearOf } from "../lib/format.js";
import { PlayIcon } from "./Icons.jsx";

export default function Tile({ meta, onOpen, metaText = "" }) {
  const year = yearOf(meta);
  const genre = genresOf(meta)[0] || (meta.type === "series" ? "Series" : "Film");

  return (
    <button
      type="button"
      className="tile"
      onClick={() => onOpen(meta, true)}
      aria-label={`Play ${meta.name}${year ? ` (${year})` : ""}`}
    >
      <span className="tile-art" style={{ "--h": hueOf(meta.id) }}>
        <span className="tile-initials" aria-hidden="true">
          {initials(meta.name)}
        </span>
        {meta.poster ? (
          <img
            src={meta.poster}
            alt=""
            width="300"
            height="450"
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        <span className="tile-play" aria-hidden="true">
          <PlayIcon />
        </span>
      </span>
      <span className="tile-title">{meta.name}</span>
      <span className="tile-meta">
        {metaText ? (
          <span>{metaText}</span>
        ) : (
          <>
            {year ? <span>{year}</span> : null}
            {genre ? <span>{genre}</span> : null}
          </>
        )}
      </span>
    </button>
  );
}
