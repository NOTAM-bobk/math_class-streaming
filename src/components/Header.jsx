import { GAMES_URL } from "../lib/constants.js";
import { ChevronLeft, SearchIcon, XIcon } from "./Icons.jsx";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Shows" },
];

export default function Header({
  filter,
  onFilter,
  query,
  onQueryChange,
  onSubmit,
  onClear,
}) {
  return (
    <header className="nav">
      <a className="brand" href="/" aria-label="math_class streaming home">
        <img
          className="brand-logo"
          src="/app-icon.svg"
          alt=""
          width="30"
          height="30"
        />
        <span className="brand-name">
          math_class <em>streaming</em>
        </span>
      </a>

      <a
        className="games-link"
        href={GAMES_URL}
        aria-label="Back to the math_class unblocked games website"
      >
        <ChevronLeft />
        <span className="games-long">Back to math_class</span>
        <span className="games-short">Games</span>
      </a>

      <div className="filters" role="group" aria-label="Filter titles by type">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="filter"
            aria-pressed={filter === item.value}
            onClick={() => onFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <form
        className="search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(query);
        }}
      >
        <SearchIcon />
        <label className="sr-only" htmlFor="search-input">
          Search movies and shows
        </label>
        <input
          id="search-input"
          type="search"
          placeholder="Search titles…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        {query ? (
          <button
            type="button"
            className="search-clear"
            onClick={onClear}
            aria-label="Clear search"
          >
            <XIcon />
          </button>
        ) : null}
      </form>
    </header>
  );
}
