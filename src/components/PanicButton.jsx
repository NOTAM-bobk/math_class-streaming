import { useEffect, useCallback } from "react";
import { PANIC_URL } from "../lib/constants.js";
import { ShieldAlertIcon } from "./Icons.jsx";

export const PANIC_STORAGE_KEY = "mathclass_panic_url";

export function getPanicUrl() {
  try {
    return (
      localStorage.getItem(PANIC_STORAGE_KEY) ||
      localStorage.getItem("polytrack_panic_url") ||
      PANIC_URL
    );
  } catch {
    return PANIC_URL;
  }
}

export function triggerPanic() {
  const target = getPanicUrl();
  try {
    window.location.replace(target);
  } catch {
    window.location.assign(target);
  }
}

export function usePanicShortcut() {
  const onKeyDown = useCallback((event) => {
    if (event.key !== "]" || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (
      target &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
    ) {
      return;
    }
    event.preventDefault();
    triggerPanic();
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);
}

export default function PanicButton({ className = "" }) {
  usePanicShortcut();

  return (
    <button
      type="button"
      className={`nav-panic-btn ${className}`.trim()}
      title="Panic: press ] anywhere to leave this site instantly"
      aria-keyshortcuts="]"
      aria-label="Panic: leave this site"
      onClick={triggerPanic}
    >
      <ShieldAlertIcon />
    </button>
  );
}
