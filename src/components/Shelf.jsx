import { useCallback, useEffect, useRef, useState } from "react";
import { catalog } from "../lib/catalog.js";
import { PAGE_SIZE } from "../lib/constants.js";
import { yearOf } from "../lib/format.js";
import { ChevronLeft, ChevronRight } from "./Icons.jsx";
import Tile from "./Tile.jsx";

function Skeletons() {
  return Array.from({ length: 7 }, (_, index) => (
    <div className="tile is-skeleton" key={index} aria-hidden="true">
      <span className="tile-art skeleton" />
      <span className="sk-line skeleton" />
      <span className="sk-line short skeleton" />
    </div>
  ));
}

export default function Shelf({
  title,
  note,
  def,
  items,
  status = "ready",
  emptyMessage,
  onOpen,
  action,
  metaText,
  onRetry,
}) {
  const [remote, setRemote] = useState({
    status: def ? "loading" : "ready",
    items: [],
  });
  const [attempt, setAttempt] = useState(0);
  const shelfRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    if (!def) return undefined;

    let alive = true;
    setRemote({ status: "loading", items: [] });

    catalog
      .browse(def)
      .then((data) => {
        if (!alive) return;
        let metas = Array.isArray(data?.metas)
          ? data.metas.filter((meta) => meta?.id && meta?.name)
          : [];
        if (def.catalog === "year") {
          metas = metas.filter((meta) => yearOf(meta).startsWith(def.genre));
        }
        metas = metas.slice(0, PAGE_SIZE);
        setRemote({ status: metas.length ? "ready" : "empty", items: metas });
      })
      .catch(() => {
        if (alive) setRemote({ status: "error", items: [] });
      });

    return () => {
      alive = false;
    };
  }, [def, attempt]);

  const currentStatus = def ? remote.status : status;
  const list = def ? remote.items : items || [];

  const updateEdges = useCallback(() => {
    const node = shelfRef.current;
    if (!node) return;
    setEdges({
      left: node.scrollLeft > 4,
      right: node.scrollLeft + node.clientWidth < node.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    updateEdges();
  }, [list.length, updateEdges]);

  useEffect(() => {
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);

  const scroll = (direction) => {
    const node = shelfRef.current;
    if (!node) return;
    node.scrollBy({
      left: direction * Math.max(260, node.clientWidth * 0.85),
      behavior: "smooth",
    });
  };

  const retry = () => {
    if (def) setAttempt((value) => value + 1);
    else onRetry?.();
  };

  return (
    <section className="row" data-type={def?.type || "mixed"}>
      <div className="shelf-head">
        <div className="shelf-heading">
          <h2>{title}</h2>
          {note ? <p className="row-note">{note}</p> : null}
        </div>
        <div className="shelf-actions">
          {action}
          <button
            type="button"
            className="arrow"
            onClick={() => scroll(-1)}
            disabled={!edges.left}
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="arrow"
            onClick={() => scroll(1)}
            disabled={!edges.right}
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <div
        className="shelf"
        role="group"
        aria-label={title}
        tabIndex={0}
        ref={shelfRef}
        onScroll={updateEdges}
      >
        {currentStatus === "loading" ? <Skeletons /> : null}

        {currentStatus === "error" ? (
          <div className="shelf-message">
            <p>This shelf could not load.</p>
            <button type="button" className="text-btn" onClick={retry}>
              Retry
            </button>
          </div>
        ) : null}

        {currentStatus === "empty" ? (
          <div className="shelf-message">
            <p>{emptyMessage || "Nothing here yet."}</p>
          </div>
        ) : null}

        {currentStatus === "ready"
          ? list.map((meta, index) => (
              <Tile
                key={`${meta.type}-${meta.id}-${index}`}
                meta={meta}
                onOpen={onOpen}
                metaText={metaText ? metaText(meta) : ""}
              />
            ))
          : null}
      </div>
    </section>
  );
}
