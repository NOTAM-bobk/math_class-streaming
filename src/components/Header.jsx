import { useEffect, useRef, useState } from "react";
import { CHAT_URL, GAMES_URL } from "../lib/constants.js";
import {
  BookmarkIcon,
  ChevronDown,
  ExternalLinkIcon,
  FilmIcon,
  GamepadIcon,
  MessageIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  ShieldAlertIcon,
  XIcon,
} from "./Icons.jsx";
import { triggerPanic, usePanicShortcut } from "./PanicButton.jsx";
import SettingsModal from "./SettingsModal.jsx";
import ShareDialog from "./ShareDialog.jsx";

export default function Header({
  filter = "all",
  onFilter,
  query = "",
  onQueryChange,
  onSubmit,
  onClear,
  onHome,
  recentCount = 0,
  onClearRecent,
  watchlistCount = 0,
  watchlistActive = false,
  onWatchlist,
  settings,
  onUpdateSetting,
  progressCount = 0,
  onClearProgress,
  installAvailable = false,
  installed = false,
  onInstall,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [share, setShare] = useState(null);

  const searchRef = useRef(null);
  const brandRef = useRef(null);
  const brandButtonRef = useRef(null);
  const brandItemRef = useRef(null);

  // Global panic shortcut ']'
  usePanicShortcut();

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target;
        if (
          target &&
          (target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        ) {
          return;
        }
        event.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Brand menu: dismiss on outside press or Escape.
  useEffect(() => {
    if (!brandOpen) return undefined;
    brandItemRef.current?.focus();
    const onPointerDown = (event) => {
      if (brandRef.current && !brandRef.current.contains(event.target)) {
        setBrandOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setBrandOpen(false);
      brandButtonRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [brandOpen]);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleBrandToggle = () => setBrandOpen((open) => !open);

  const goMovies = (event) => {
    event.preventDefault();
    setBrandOpen(false);
    setSearchOpen(false);
    if (onHome) onHome();
    else if (onClear) onClear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openShare = () => {
    setShare({
      url: window.location.href,
      title: document.title.replace(/\s+—\s+math_class:network$/, "").trim(),
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(query);
  };

  const handleSearchEscape = (e) => {
    if (e.key !== "Escape") return;
    if (query) {
      e.preventDefault();
      onClear();
      return;
    }
    setSearchOpen(false);
  };

  const searchVisible = searchOpen || Boolean(query);

  return (
    <header className="nav-wrapper">
      <div
        className={`solid-3d-panel${searchVisible ? " is-search-open" : ""}`}
      >
        {/* Left: Brand + network menu */}
        <div className="nav-brand-wrap" ref={brandRef}>
          <button
            type="button"
            ref={brandButtonRef}
            className={`nav-brand-pill${brandOpen ? " is-open" : ""}`}
            aria-expanded={brandOpen}
            aria-controls="nav-sites-menu"
            title="Switch between math_class sites"
            onClick={handleBrandToggle}
          >
            <span className="nav-brand-word">
              math_class<span className="nav-brand-colon">:</span>network
            </span>
            <ChevronDown />
          </button>

          {brandOpen ? (
            <nav
              id="nav-sites-menu"
              className="nav-sites-menu"
              aria-label="math_class sites"
            >
              <p className="nav-sites-label">Sites</p>
              <ul className="nav-sites">
                <li>
                  <a
                    ref={brandItemRef}
                    className="nav-site is-current"
                    href="/"
                    aria-current="page"
                    onClick={goMovies}
                  >
                    <span className="nav-site-icon">
                      <FilmIcon />
                    </span>
                    <span className="nav-site-copy">
                      <strong>Movies</strong>
                      <small>Films and series</small>
                    </span>
                    <span className="nav-site-mark">Current</span>
                  </a>
                </li>
                <li>
                  <a
                    className="nav-site"
                    href={GAMES_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setBrandOpen(false)}
                  >
                    <span className="nav-site-icon">
                      <GamepadIcon />
                    </span>
                    <span className="nav-site-copy">
                      <strong>Games</strong>
                      <small>Unblocked browser games</small>
                    </span>
                    <span className="nav-site-mark" aria-hidden="true">
                      <ExternalLinkIcon />
                    </span>
                    <span className="sr-only">Opens in a new tab</span>
                  </a>
                </li>
                <li>
                  <a
                    className="nav-site"
                    href={CHAT_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setBrandOpen(false)}
                  >
                    <span className="nav-site-icon">
                      <MessageIcon />
                    </span>
                    <span className="nav-site-copy">
                      <strong>Chat</strong>
                      <small>The network's chat room</small>
                    </span>
                    <span className="nav-site-mark" aria-hidden="true">
                      <ExternalLinkIcon />
                    </span>
                    <span className="sr-only">Opens in a new tab</span>
                  </a>
                </li>
              </ul>
            </nav>
          ) : null}
        </div>

        {/* Center: Search input with / shortcut */}
        <div className="nav-search-container">
          <form
            className="nav-search-form"
            role="search"
            onSubmit={handleSearchSubmit}
          >
            <label htmlFor="nav-game-search" className="sr-only">
              Search movies and shows
            </label>
            <div className="nav-search-icon">
              <SearchIcon />
            </div>
            <input
              id="nav-game-search"
              ref={searchRef}
              type="search"
              name="q"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleSearchEscape}
              placeholder="Search titles…"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              className="nav-search-input"
            />
            {query ? (
              <button
                type="button"
                className="nav-search-clear"
                onClick={() => {
                  onClear();
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <XIcon />
              </button>
            ) : (
              <kbd className="nav-search-kbd">/</kbd>
            )}
          </form>
        </div>

        {/* Right: Actions */}
        <div className="nav-actions">
          {/* My List Button */}
          <button
            type="button"
            className={`nav-icon-btn${watchlistActive ? " is-active" : ""}`}
            title="My List — saved titles"
            aria-label={`My List, ${watchlistCount} saved title${
              watchlistCount === 1 ? "" : "s"
            }`}
            aria-pressed={watchlistActive}
            onClick={onWatchlist}
          >
            <BookmarkIcon filled={watchlistActive} />
            {watchlistCount > 0 ? (
              <span className="nav-count">
                {watchlistCount > 9 ? "9+" : watchlistCount}
              </span>
            ) : null}
          </button>

          {/* Search toggle (small screens) */}
          <button
            type="button"
            className="nav-icon-btn nav-search-toggle"
            title={searchVisible ? "Hide search" : "Search titles"}
            aria-label={searchVisible ? "Hide search" : "Search titles"}
            aria-expanded={searchVisible}
            onClick={() => setSearchOpen((open) => !open)}
          >
            {searchVisible ? <XIcon /> : <SearchIcon />}
          </button>

          {/* Share Button */}
          <button
            type="button"
            className="nav-icon-btn nav-share-btn"
            title="Share this page"
            aria-label="Share this page"
            onClick={openShare}
          >
            <ShareIcon />
          </button>

          {/* Settings Button */}
          <button
            type="button"
            className="nav-icon-btn"
            title="Settings & Panic Controls"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon />
          </button>

          {/* Panic Button (Red Circle Shield) */}
          <button
            type="button"
            className="nav-panic-btn"
            title="Panic: press ] to leave immediately"
            aria-label="Panic: leave site"
            aria-keyshortcuts="]"
            onClick={triggerPanic}
          >
            <ShieldAlertIcon />
          </button>
        </div>
      </div>

      <ShareDialog
        open={Boolean(share)}
        onClose={() => setShare(null)}
        url={share?.url || ""}
        title={share?.title || "math_class:network"}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        filter={filter}
        onFilter={onFilter}
        recentCount={recentCount}
        onClearRecent={onClearRecent}
        settings={settings}
        onUpdateSetting={onUpdateSetting}
        progressCount={progressCount}
        onClearProgress={onClearProgress}
        installAvailable={installAvailable}
        installed={installed}
        onInstall={onInstall}
      />
    </header>
  );
}
