import { formatPosition, genresOf, hueOf, initials, yearOf } from "../lib/format.js";
import { progressRatio } from "../lib/progress.js";
import { BookmarkIcon, PlayIcon } from "./Icons.jsx";

export default function Tile({
  meta,
  onOpen,
  metaText = "",
  saved = false,
  onToggleSave,
  progress = null,
  rank,
}) {
  const year = yearOf(meta);
  const genre = genresOf(meta)[0] || (meta.type === "series" ? "Series" : "Film");
  const label = `Play ${meta.name}${year ? ` (${year})` : ""}`;
  const watched = progressRatio(progress);
  const resumeLabel = progress?.position
    ? ` · ${formatPosition(progress.position)} watched`
    : "";

  return (
    <article className={`tile${rank ? " is-ranked" : ""}`}>
      <div className="tile-art" style={{ "--h": hueOf(meta.id) }}>
        <button
          type="button"
          className="tile-open"
          onClick={() => onOpen(meta, true)}
          aria-label={`${label}${resumeLabel}`}
        >
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
        </button>

        {rank ? (
          <span className="tile-rank" aria-hidden="true">
            {rank}
          </span>
        ) : null}

        {watched > 0.004 ? (
          <span
            className={`tile-progress${watched >= 0.96 ? " is-done" : ""}`}
            aria-hidden="true"
          >
            <span style={{ width: `${Math.min(100, watched * 100)}%` }} />
          </span>
        ) : null}

        {onToggleSave ? (
          <button
            type="button"
            className={`tile-save${saved ? " is-saved" : ""}`}
            aria-pressed={saved}
            aria-label={
              saved
                ? `Remove ${meta.name} from My List`
                : `Add ${meta.name} to My List`
            }
            title={saved ? "Remove from My List" : "Add to My List"}
            onClick={() => onToggleSave(meta)}
          >
            <BookmarkIcon filled={saved} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="tile-info"
        onClick={() => onOpen(meta, true)}
        tabIndex={-1}
      >
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
    </article>
  );
}
