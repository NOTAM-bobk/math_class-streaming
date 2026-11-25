import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CopyIcon, XIcon } from "./Icons.jsx";

export default function ShareDialog({ open, onClose, url, title }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const inputRef = useRef(null);
  const copyRef = useRef(null);
  const openerRef = useRef(null);
  const timer = useRef(0);

  // Keep the latest onClose without re-running the open effect on every render.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    setCopied(false);
    setFailed(false);
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      // Capture and stop here so Escape closes the popup only, never the player.
      event.preventDefault();
      event.stopPropagation();
      closeRef.current?.();
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKeyDown, true);
    document.body.style.overflow = "hidden";
    copyRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer.current);
      openerRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const selectLink = (event) => event.currentTarget.select();

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        inputRef.current?.select();
        document.execCommand("copy");
      }
      setCopied(true);
      setFailed(false);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setFailed(true);
    }
  };

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const shareNative = async () => {
    try {
      await navigator.share({
        title: title || "math_class:network",
        url,
      });
      closeRef.current?.();
    } catch (error) {
      if (error?.name !== "AbortError") setFailed(true);
    }
  };

  return createPortal(
    <div
      className="share-layer"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current?.();
      }}
    >
      <div
        className="share-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
      >
        <header className="share-head">
          <div>
            <h2 id="share-title">Share</h2>
            <p className="share-subject">{title || "math_class:network"}</p>
          </div>
          <button
            type="button"
            className="nav-modal-close"
            onClick={() => closeRef.current?.()}
            aria-label="Close share dialog"
          >
            <XIcon />
          </button>
        </header>

        <div className="share-body">
          <label className="sr-only" htmlFor="share-url">
            Page link
          </label>
          <div className="share-field">
            <input
              id="share-url"
              ref={inputRef}
              className="share-input"
              type="text"
              value={url}
              readOnly
              spellCheck={false}
              onFocus={selectLink}
            />
            <button
              ref={copyRef}
              type="button"
              className="share-copy"
              onClick={copyLink}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <p className="share-status" role="status">
            {failed
              ? "The clipboard is blocked here — select the link and copy it."
              : copied
                ? "Link copied to the clipboard."
                : "Anyone with this link can open the page."}
          </p>

          {canShare ? (
            <button
              type="button"
              className="share-native"
              onClick={shareNative}
            >
              Share with another app
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
