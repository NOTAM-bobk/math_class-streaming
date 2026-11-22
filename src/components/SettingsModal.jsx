import { useEffect, useRef, useState } from "react";
import { PANIC_STORAGE_KEY, getPanicUrl } from "./PanicButton.jsx";
import { PANIC_URL, GAMES_URL } from "../lib/constants.js";
import { PLAYER_THEMES } from "../lib/settings.js";
import {
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  XIcon,
} from "./Icons.jsx";

const PANIC_PRESETS = [
  { label: "Google Classroom", url: "https://classroom.google.com/" },
  { label: "Google Docs", url: "https://docs.google.com/" },
  { label: "Wikipedia", url: "https://www.wikipedia.org/" },
  { label: "Canvas LMS", url: "https://canvas.instructure.com/" },
];

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`settings-switch${checked ? " is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span className="settings-switch-thumb" aria-hidden="true" />
    </button>
  );
}

function Row({ title, desc, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-copy">
        <strong>{title}</strong>
        {desc ? <span>{desc}</span> : null}
      </div>
      {children}
    </div>
  );
}

export default function SettingsModal({
  isOpen,
  onClose,
  filter,
  onFilter,
  recentCount = 0,
  onClearRecent,
  settings,
  onUpdateSetting,
  progressCount = 0,
  onClearProgress,
  installAvailable = false,
  installed = false,
  onInstall,
}) {
  const [currentPanic, setCurrentPanic] = useState(getPanicUrl);
  const [customInput, setCustomInput] = useState(getPanicUrl);
  const [savedNotice, setSavedNotice] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const active = getPanicUrl();
      setCurrentPanic(active);
      setCustomInput(active);
      setSavedNotice(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
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
      className="settings-layer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <header className="settings-sheet-head">
          <div>
            <p className="eyebrow">math_class:network</p>
            <h2 id="settings-modal-title">Settings</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="nav-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <XIcon />
          </button>
        </header>

        <div className="settings-sheet-body">
          <section className="settings-group" aria-labelledby="settings-playback">
            <h3 id="settings-playback" className="settings-group-title">
              Playback
            </h3>

            <Row
              title="Vercel proxy"
              desc="Streams VidFast through this site so the player still works when vidfast.vc is blocked."
            >
              <Toggle
                checked={settings.proxyPlayer}
                onChange={(value) => onUpdateSetting("proxyPlayer", value)}
                label="Stream through the Vercel proxy"
              />
            </Row>

            <Row
              title="Autoplay"
              desc="Start the title as soon as it opens."
            >
              <Toggle
                checked={settings.autoplay}
                onChange={(value) => onUpdateSetting("autoplay", value)}
                label="Autoplay titles"
              />
            </Row>

            <Row
              title="Remember progress"
              desc="Save where you stopped, to the minute, and resume there next time."
            >
              <Toggle
                checked={settings.rememberProgress}
                onChange={(value) => onUpdateSetting("rememberProgress", value)}
                label="Remember playback progress"
              />
            </Row>

            <div className="settings-subblock">
              <span className="settings-subtitle">Player colour</span>
              <div className="settings-swatches">
                {PLAYER_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`settings-swatch${
                      settings.playerTheme === theme.id ? " is-active" : ""
                    }`}
                    onClick={() => onUpdateSetting("playerTheme", theme.id)}
                    aria-pressed={settings.playerTheme === theme.id}
                    aria-label={`${theme.label} player colour`}
                  >
                    <span style={{ background: `#${theme.hex}` }} />
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="settings-group" aria-labelledby="settings-look">
            <h3 id="settings-look" className="settings-group-title">
              Look &amp; feel
            </h3>
            <Row
              title="Reduce motion"
              desc="Turn off entrance animations, shimmer and hover transitions."
            >
              <Toggle
                checked={settings.reduceMotion}
                onChange={(value) => onUpdateSetting("reduceMotion", value)}
                label="Reduce motion"
              />
            </Row>
          </section>

          {onFilter ? (
            <section className="settings-group" aria-labelledby="settings-catalog">
              <h3 id="settings-catalog" className="settings-group-title">
                Catalog
              </h3>
              <p className="settings-group-desc">
                Choose which media types appear in the browse shelves.
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
            </section>
          ) : null}

          <section className="settings-group" aria-labelledby="settings-data">
            <h3 id="settings-data" className="settings-group-title">
              Watch data
            </h3>
            <Row
              title="Watch history"
              desc={
                recentCount > 0
                  ? `${recentCount} title${recentCount === 1 ? "" : "s"} in your recently watched list.`
                  : "Nothing watched recently."
              }
            >
              {recentCount > 0 && onClearRecent ? (
                <button
                  type="button"
                  className="settings-danger-btn"
                  onClick={onClearRecent}
                >
                  Clear
                </button>
              ) : null}
            </Row>
            <Row
              title="Playback progress"
              desc={
                progressCount > 0
                  ? `${progressCount} title${progressCount === 1 ? "" : "s"} with a saved position, stored on this device.`
                  : "No saved playback positions yet."
              }
            >
              {progressCount > 0 && onClearProgress ? (
                <button
                  type="button"
                  className="settings-danger-btn"
                  onClick={onClearProgress}
                >
                  Reset
                </button>
              ) : null}
            </Row>
          </section>

          <section className="settings-group" aria-labelledby="settings-app">
            <h3 id="settings-app" className="settings-group-title">
              Install
            </h3>
            <Row
              title={installed ? "App installed" : "Install math_class:network"}
              desc={
                installed
                  ? "It opens like a normal app, works offline and keeps your list and progress."
                  : "Add it to your device for full-screen playback, offline shell and one-tap access."
              }
            >
              {installed ? (
                <span className="settings-installed">
                  <CheckIcon /> Ready
                </span>
              ) : installAvailable ? (
                <button
                  type="button"
                  className="settings-install-btn"
                  onClick={onInstall}
                >
                  <DownloadIcon />
                  Install
                </button>
              ) : (
                <span className="settings-hint">
                  Use your browser's “Install app” menu
                </span>
              )}
            </Row>
          </section>

          <section className="settings-group" aria-labelledby="settings-panic">
            <h3 id="settings-panic" className="settings-group-title">
              Panic destination
            </h3>
            <p className="settings-group-desc">
              The red shield and <kbd className="settings-kbd">]</kbd> instantly
              send you here.
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
          </section>

          <section className="settings-group" aria-labelledby="settings-keys">
            <h3 id="settings-keys" className="settings-group-title">
              Keyboard shortcuts
            </h3>
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
                <span>Exit player / close this panel</span>
                <kbd className="settings-kbd">Esc</kbd>
              </div>
            </div>
          </section>

          <section className="settings-group settings-footer-section">
            <a
              href={GAMES_URL}
              className="settings-link"
              target="_blank"
              rel="noreferrer"
            >
              <span>Back to the math_class network</span>
              <ExternalLinkIcon />
            </a>
          </section>
        </div>
      </aside>
    </div>
  );
}
