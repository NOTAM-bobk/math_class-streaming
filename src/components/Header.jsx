import { useEffect, useRef, useState } from "react";
import { CHAT_URL, GAMES_URL } from "../lib/constants.js";
import {
  BookmarkIcon,
  ChevronDown,
  ExternalLinkIcon,
  FilmIcon,
  GamepadIcon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  ShieldAlertIcon,
  XIcon,
} from "./Icons.jsx";
import { triggerPanic, usePanicShortcut } from "./PanicButton.jsx";
import SettingsModal from "./SettingsModal.jsx";

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
  const [toast, setToast] = useState(null);

  const searchRef = useRef(null);
  const brandRef = useRef(null);
  const brandButtonRef = useRef(null);

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

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: "math_class:network",
      text: "Watch movies & TV shows on math_class:network",
      url,
    };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied to clipboard!");
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast("Failed to copy link");
      setTimeout(() => setToast(null), 2500);
    }
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
            aria-haspopup="menu"
            aria-controls="nav-brand-menu"
            title="Switch between unblocked movies and games"
            onClick={handleBrandToggle}
          >
            math_class:network
            <ChevronDown />
          </button>

          {brandOpen ? (
            <div
              id="nav-brand-menu"
              className="nav-dropdown nav-brand-menu"
              role="menu"
              aria-label="math_class network"
            >
              <a
                className="nav-brand-item"
                href="/"
                role="menuitem"
                aria-current="page"
                onClick={goMovies}
              >
                <FilmIcon />
                <span>
                  <strong>Unblocked movies</strong>
                  <small>You're on the movies site</small>
                </span>
              </a>
              <a
                className="nav-brand-item"
                href={GAMES_URL}
                role="menuitem"
                target="_blank"
                rel="noreferrer"
                onClick={() => setBrandOpen(false)}
              >
                <GamepadIcon />
                <span>
                  <strong>Unblocked games</strong>
                  <small>Open math_games in a new tab</small>
                </span>
              </a>
            </div>
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
            title="Share streaming"
            aria-label="Share"
            onClick={handleShare}
          >
            <ShareIcon />
          </button>

          {/* Chat */}
          <a
            className="nav-icon-btn nav-chat-btn"
            href={CHAT_URL}
            target="_blank"
            rel="noreferrer"
            title="Open the math_class chat"
            aria-label="Open chat in a new tab"
          >
            <ExternalLinkIcon />
          </a>

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

      {/* Toast Feedback */}
      {toast && (
        <div className="nav-toast" role="status">
          <span>{toast}</span>
        </div>
      )}

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
