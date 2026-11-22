import { useState, useEffect } from "react";
import { PANIC_STORAGE_KEY, getPanicUrl } from "./PanicButton.jsx";
import { PANIC_URL, GAMES_URL } from "../lib/constants.js";
import { XIcon, CheckIcon, ExternalLinkIcon } from "./Icons.jsx";

const PANIC_PRESETS = [
  { label: "Google Classroom", url: "https://classroom.google.com/" },
  { label: "Google Docs", url: "https://docs.google.com/" },
  { label: "Wikipedia", url: "https://www.wikipedia.org/" },
  { label: "Canvas LMS", url: "https://canvas.instructure.com/" },
];

export default function SettingsModal({
  isOpen,
  onClose,
  filter,
  onFilter,
  recentCount = 0,
  onClearRecent,
}) {
  const [currentPanic, setCurrentPanic] = useState(getPanicUrl);
  const [customInput, setCustomInput] = useState(getPanicUrl);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getPanicUrl();
      setCurrentPanic(active);
      setCustomInput(active);
      setSavedNotice(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectPreset = (url) => {
    try {
      localStorage.setItem(PANIC_STORAGE_KEY, url);
      setCurrentPanic(url);
      setCustomInput(url);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch {}
  };

  const handleSaveCustom = (e) => {
    e.preventDefault();
    let url = customInput.trim();
    if (!url) url = PANIC_URL;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      localStorage.setItem(PANIC_STORAGE_KEY, url);
      setCurrentPanic(url);
      setCustomInput(url);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch {}
  };

  return (
    <div
      className="nav-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="nav-modal-card">
        <div className="nav-modal-header">
          <h2 id="settings-modal-title" className="nav-modal-title">
            Settings
          </h2>
          <button
            type="button"
            className="nav-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <XIcon />
          </button>
        </div>

        <div className="nav-modal-body">
          {/* Section: Panic Redirect */}
          <div className="settings-section">
            <h3 className="settings-section-title">Panic Button Destination</h3>
            <p className="settings-section-desc">
              Clicking the red shield or pressing <kbd className="settings-kbd">]</kbd> anywhere instantly sends you to this site.
            </p>

            <div className="settings-presets">
              {PANIC_PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  className={`settings-preset-btn ${
                    currentPanic === preset.url ? "is-active" : ""
                  }`}
                  onClick={() => handleSelectPreset(preset.url)}
                >
                  <span>{preset.label}</span>
                  {currentPanic === preset.url && <CheckIcon />}
                </button>
              ))}
            </div>

            <form className="settings-custom-form" onSubmit={handleSaveCustom}>
              <input
                type="text"
                className="settings-input"
                placeholder="Custom URL (e.g. https://example.com)"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
              <button type="submit" className="settings-save-btn">
                Save
              </button>
            </form>
            {savedNotice && (
              <span className="settings-saved-tag">Saved successfully</span>
            )}
          </div>

          {/* Section: Catalog Filter */}
          {onFilter && (
            <div className="settings-section">
              <h3 className="settings-section-title">Catalog Filter</h3>
              <p className="settings-section-desc">
                Choose which media types appear in the home browse shelves.
              </p>
              <div className="settings-filter-pills">
                {[
                  { id: "all", label: "All Titles" },
                  { id: "movie", label: "Movies Only" },
                  { id: "series", label: "TV Shows Only" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`settings-filter-pill ${
                      filter === item.id ? "is-active" : ""
                    }`}
                    onClick={() => onFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Watch History */}
          {onClearRecent && (
            <div className="settings-section">
              <h3 className="settings-section-title">Watch History</h3>
              <p className="settings-section-desc">
                {recentCount > 0
                  ? `You have ${recentCount} item${recentCount === 1 ? "" : "s"} in your recently watched list.`
                  : "Your recently watched list is currently empty."}
              </p>
              {recentCount > 0 && (
                <button
                  type="button"
                  className="settings-danger-btn"
                  onClick={() => {
                    onClearRecent();
                  }}
                >
                  Clear watch history
                </button>
              )}
            </div>
          )}

          {/* Section: Shortcuts */}
          <div className="settings-section">
            <h3 className="settings-section-title">Keyboard Shortcuts</h3>
            <div className="settings-shortcuts-list">
              <div className="settings-shortcut-row">
                <span>Focus search bar</span>
                <kbd className="settings-kbd">/</kbd>
              </div>
              <div className="settings-shortcut-row">
                <span>Panic exit</span>
                <kbd className="settings-kbd">]</kbd>
              </div>
              <div className="settings-shortcut-row">
                <span>Exit video player / dialogs</span>
                <kbd className="settings-kbd">Esc</kbd>
              </div>
            </div>
          </div>

          {/* External links */}
          <div className="settings-section settings-footer-section">
            <a
              href={GAMES_URL}
              className="settings-link"
              target="_blank"
              rel="noreferrer"
            >
              <span>Back to math_games network</span>
              <ExternalLinkIcon />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
