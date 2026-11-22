import { useState, useRef, useEffect } from "react";
import {
  SearchIcon,
  XIcon,
  ShareIcon,
  SettingsIcon,
  ShieldAlertIcon,
  BookmarkIcon,
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
  const [toast, setToast] = useState(null);

  const searchRef = useRef(null);

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
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleBrandClick = (e) => {
    e.preventDefault();
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

  return (
    <header className="nav-wrapper">
      <div className="solid-3d-panel">
        {/* Left: Brand pill */}
        <a
          href="/"
          className="nav-brand-pill"
          onClick={handleBrandClick}
          aria-label="math_class:network home"
          title="math_class:network"
        >
          math_class:network
        </a>

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
              onKeyDown={(e) => {
                if (e.key === "Escape" && query) {
                  e.preventDefault();
                  onClear();
                }
              }}
              placeholder="search infinite amount of titles"
              autoComplete="off"
              spellCheck={false}
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

          {/* Share Button */}
          <button
            type="button"
            className="nav-icon-btn"
            title="Share streaming"
            aria-label="Share"
            onClick={handleShare}
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
