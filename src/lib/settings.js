import { SOURCE_IDS } from "./sources.js";

const SETTINGS_KEY = "math_class_streaming_settings";

export const PLAYER_THEMES = [
  { id: "amber", label: "Amber", hex: "E8B25F" },
  { id: "ice", label: "Ice", hex: "7DD3FC" },
  { id: "violet", label: "Violet", hex: "B69CFF" },
  { id: "mint", label: "Mint", hex: "6EE7B7" },
];

export const DEFAULT_SETTINGS = {
  proxyPlayer: true,
  autoplay: true,
  rememberProgress: true,
  reduceMotion: false,
  playerTheme: "amber",
  source: "vidfast",
};

export function readSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const theme = PLAYER_THEMES.some((item) => item.id === parsed?.playerTheme)
      ? parsed.playerTheme
      : DEFAULT_SETTINGS.playerTheme;
    return {
      proxyPlayer:
        typeof parsed?.proxyPlayer === "boolean"
          ? parsed.proxyPlayer
          : DEFAULT_SETTINGS.proxyPlayer,
      autoplay:
        typeof parsed?.autoplay === "boolean"
          ? parsed.autoplay
          : DEFAULT_SETTINGS.autoplay,
      rememberProgress:
        typeof parsed?.rememberProgress === "boolean"
          ? parsed.rememberProgress
          : DEFAULT_SETTINGS.rememberProgress,
      reduceMotion:
        typeof parsed?.reduceMotion === "boolean"
          ? parsed.reduceMotion
          : DEFAULT_SETTINGS.reduceMotion,
      playerTheme: theme,
      source: SOURCE_IDS.includes(parsed?.source)
        ? parsed.source
        : DEFAULT_SETTINGS.source,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private mode; defaults still apply.
  }
}

export function themeHex(id) {
  return (PLAYER_THEMES.find((theme) => theme.id === id) || PLAYER_THEMES[0]).hex;
}

export function applySettings(settings) {
  const root = document.documentElement;
  root.dataset.motion = settings.reduceMotion ? "reduced" : "full";
  root.style.setProperty("--player-accent", `#${themeHex(settings.playerTheme)}`);
}
