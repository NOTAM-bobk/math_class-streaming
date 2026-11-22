import { useState, useRef, useEffect, useCallback } from "react";
import { GAMES_URL } from "../lib/constants.js";
import {
  SearchIcon,
  XIcon,
  BellIcon,
  ShareIcon,
  SettingsIcon,
  ShieldAlertIcon,
  MoreHorizontalIcon,
  ShuffleIcon,
  ExternalLinkIcon,
  CheckIcon,
  BookmarkIcon,
} from "./Icons.jsx";
import { triggerPanic, usePanicShortcut } from "./PanicButton.jsx";
import SettingsModal from "./SettingsModal.jsx";

const NOTIFICATIONS = [
  {
    id: "catalog",
    title: "700+ Titles Available",
    desc: "Stream full movies and series with fast playback and zero sign-in required.",
    tag: "Library",
  },
  {
    id: "shortcuts",
    title: "Keyboard Shortcuts",
    desc: "Press [/] to search anytime, []] for instant panic exit, and [Esc] to exit player.",
    tag: "Tips",
  },
  {
    id: "vidfast",
    title: "Fast Embedded Player",
    desc: "Multi-season and episode navigation powered by Cinemeta & VidFast.",
    tag: "Player",
  },
];

export default function Header({
  filter = "all",
  onFilter,
  query = "",
  onQueryChange,
  onSubmit,
  onClear,
  onRandom,
  onHome,
  recentCount = 0,
  onClearRecent,
  watchlistCount = 0,
  watchlistActive = false,
  onWatchlist,
}) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [toast, setToast] = useState(null);

  const searchRef = useRef(null);
  const headerRef = useRef(null);

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

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setNotificationsOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
      title: "math_games streaming",
      text: "Watch 700+ movies & TV shows on math_games streaming",
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
    <header className="nav-wrapper" ref={headerRef}>
      <div className="solid-3d-panel">
        {/* Left: Brand pill */}
        <a
          href="/"
          className="nav-brand-pill"
          onClick={handleBrandClick}
          aria-label="math_games streaming home"
          title="math_games streaming"
        >
          math_games
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
              placeholder="Search 700+ titles"
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

          {/* Notifications Button */}
          <div className="nav-action-wrapper">
            <button
              type="button"
              className="nav-icon-btn"
              title="Notifications & Updates"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setMoreOpen(false);
                setHasUnread(false);
              }}
            >
              <BellIcon />
              {hasUnread && <span className="nav-indicator-dot" />}
            </button>

            {notificationsOpen && (
              <div
                className="nav-dropdown nav-notifications-dropdown"
                role="region"
                aria-label="Notifications"
              >
                <div className="nav-dropdown-head">
                  <span className="nav-dropdown-title">Updates & Tips</span>
                  <span className="nav-badge">News</span>
                </div>
                <div className="nav-notifications-list">
                  {NOTIFICATIONS.map((item) => (
                    <div key={item.id} className="nav-notification-card">
                      <div className="nav-notification-top">
                        <strong className="nav-notification-title">
                          {item.title}
                        </strong>
                        <span className="nav-notification-tag">{item.tag}</span>
                      </div>
                      <p className="nav-notification-desc">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
            onClick={() => {
              setSettingsOpen(true);
              setNotificationsOpen(false);
              setMoreOpen(false);
            }}
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

          {/* More Actions Button */}
          <div className="nav-action-wrapper">
            <button
              type="button"
              className="nav-icon-btn"
              title="More actions"
              aria-label="More actions"
              aria-expanded={moreOpen}
              onClick={() => {
                setMoreOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
            >
              <MoreHorizontalIcon />
            </button>

            {moreOpen && (
              <div
                className="nav-dropdown nav-more-dropdown"
                role="menu"
                aria-label="More actions"
              >
                {onRandom && (
                  <button
                    type="button"
                    role="menuitem"
                    className="nav-menu-item"
                    onClick={() => {
                      setMoreOpen(false);
                      onRandom();
                    }}
                  >
                    <ShuffleIcon />
                    <span>Random title</span>
                  </button>
                )}

                {onWatchlist && (
                  <button
                    type="button"
                    role="menuitem"
                    className="nav-menu-item"
                    onClick={() => {
                      setMoreOpen(false);
                      onWatchlist();
                    }}
                  >
                    <BookmarkIcon filled={watchlistActive} />
                    <span>My List ({watchlistCount})</span>
                  </button>
                )}

                {onFilter && (
                  <>
                    <div className="nav-menu-divider" />
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-menu-item"
                      onClick={() => {
                        setMoreOpen(false);
                        onFilter("all");
                      }}
                    >
                      <span>Filter: All Titles</span>
                      {filter === "all" && <CheckIcon />}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-menu-item"
                      onClick={() => {
                        setMoreOpen(false);
                        onFilter("movie");
                      }}
                    >
                      <span>Filter: Movies</span>
                      {filter === "movie" && <CheckIcon />}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="nav-menu-item"
                      onClick={() => {
                        setMoreOpen(false);
                        onFilter("series");
                      }}
                    >
                      <span>Filter: TV Shows</span>
                      {filter === "series" && <CheckIcon />}
                    </button>
                    <div className="nav-menu-divider" />
                  </>
                )}

                <a
                  href={GAMES_URL}
                  className="nav-menu-item"
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                >
                  <ExternalLinkIcon />
                  <span>Back to math_games</span>
                </a>

                {recentCount > 0 && onClearRecent && (
                  <button
                    type="button"
                    role="menuitem"
                    className="nav-menu-item"
                    onClick={() => {
                      setMoreOpen(false);
                      onClearRecent();
                    }}
                  >
                    <span>Clear watch history</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  className="nav-menu-item"
                  onClick={() => {
                    setMoreOpen(false);
                    setSettingsOpen(true);
                  }}
                >
                  <SettingsIcon />
                  <span>Settings</span>
                </button>
              </div>
            )}
          </div>
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
      />
    </header>
  );
}
