import { formatRuntime, genresOf, runtimeOf, yearOf } from "../lib/format.js";

export default function Facts({ meta }) {
  if (!meta) return null;

  const rating = meta.imdbRating;
  const year = yearOf(meta);
  const runtime = formatRuntime(runtimeOf(meta));
  const genres = genresOf(meta);

  if (!rating && !year && !runtime && genres.length === 0) return null;

  return (
    <div className="facts">
      {rating ? (
        <span className="score">
          <strong>{rating}</strong>
          <span>IMDb</span>
        </span>
      ) : null}
      {year ? <span>{year}</span> : null}
      {runtime ? <span>{runtime}</span> : null}
      {genres.length > 0 ? <span>{genres.join(", ")}</span> : null}
    </div>
  );
}
