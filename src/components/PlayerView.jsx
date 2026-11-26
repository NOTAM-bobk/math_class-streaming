import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { catalog } from "../lib/catalog.js";
import { formatMinutes, formatPosition } from "../lib/format.js";
import { directUrl, idOf, PLAYER_API } from "../lib/player.js";
import {
  SOURCES,
  SOURCE_IDS,
  buildSourceUrl,
  canPlaySource,
  sourceLabel,
} from "../lib/sources.js";
import {
  clearProgressEntry,
  getProgress,
  resumeSeconds,
  saveProgress,
} from "../lib/progress.js";
import { themeHex } from "../lib/settings.js";
import Facts from "./Facts.jsx";
import Shelf from "./Shelf.jsx";
import { BookmarkIcon, ChevronLeft, PlayIcon, RotateIcon } from "./Icons.jsx";

function parseProgressMessage(raw) {
  let payload = raw;
  if (typeof raw === "string") {
    try {
      payload = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;
  const body =
    payload.data && typeof payload.data === "object" ? payload.data : payload;
  const position = Number(
    body.currentTime ?? body.current_time ?? body.position ?? body.time
  );
  if (!Number.isFinite(position)) return null;
  const duration = Number(body.duration);
  return {
    position: Math.max(0, position),
    duration: Number.isFinite(duration) ? duration : 0,
  };
}

function isPlayerOrigin(origin) {
  if (!origin) return false;
  if (origin === window.location.origin) return true;
  return /^https:\/\/([a-z0-9-]+\.)?vidfast\.(vc|pro|net|io|in|me|pm|xyz)$/i.test(
    origin
  );
}

export default function PlayerView({
  meta,
  autoplay,
  onBack,
  saved = false,
  onToggleSave,
  settings,
  onProgressSaved,
  onPickSource,
  onOpen,
  progressFor,
}) {
  const remember = settings?.rememberProgress !== false;
  const proxy = settings?.proxyPlayer !== false;
  const theme = themeHex(settings?.playerTheme);
  const wantsAutoplay = autoplay && settings?.autoplay !== false;

  const [videos, setVideos] = useState([]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [resumeAt, setResumeAt] = useState(0);
  const [sourceId, setSourceId] = useState(() =>
    SOURCE_IDS.includes(settings?.source) ? settings.source : "cinesrc"
  );
  const [failedSources, setFailedSources] = useState([]);
  const [sourceNotice, setSourceNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [related, setRelated] = useState({ status: "loading", items: [] });
  const [relatedAttempt, setRelatedAttempt] = useState(0);

  const iframeRef = useRef(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const remoteRef = useRef(false);
  const lastPersist = useRef(0);
  const lastAppSync = useRef(0);
  const loadedRef = useRef(false);

  const isSeries = meta?.type === "series";
  const id = idOf(meta);
  const metaId = meta?.id || meta?.imdb_id;

  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const persist = useCallback(
    (value, total) => {
      if (!remember || !meta?.id || !Number.isFinite(value) || value < 5) return;
      saveProgress(meta, {
        position: value,
        duration: total || durationRef.current,
        season: isSeries ? season : undefined,
        episode: isSeries ? episode : undefined,
      });
      if (Date.now() - lastAppSync.current > 12000) {
        lastAppSync.current = Date.now();
        onProgressSaved?.();
      }
    },
    [remember, meta, isSeries, season, episode, onProgressSaved]
  );

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  useEffect(
    () => () => {
      const pos = positionRef.current;
      if (pos > 5) persistRef.current?.(pos, durationRef.current);
      onProgressSaved?.();
    },
    [onProgressSaved]
  );

  // Reset per title; the embed URL itself is built by the source effect below,
  // so changing sources never needs to reload the episode list.
  useEffect(() => {
    let alive = true;
    setVideos([]);
    setFailedSources([]);
    setSourceNotice("");
    setReady(false);
    setError("");
    setPosition(0);
    setDuration(0);
    setResumeAt(0);
    positionRef.current = 0;
    remoteRef.current = false;

    if (!id) {
      setError("This title has no playable id.");
      return undefined;
    }

    if (!isSeries) {
      const start = remember ? resumeSeconds(getProgress(meta)) : 0;
      setResumeAt(start);
      setPosition(start);
      positionRef.current = start;
      return undefined;
    }

    catalog
      .meta("series", metaId)
      .then(({ meta: full }) => {
        if (!alive) return;
        const list = (Array.isArray(full?.videos) ? full.videos : [])
          .filter(
            (video) =>
              Number.isFinite(video.season) &&
              video.season >= 1 &&
              Number.isFinite(video.number)
          )
          .sort((a, b) => a.season - b.season || a.number - b.number);

        if (!list.length) {
          setError("No episodes were listed for this series.");
          return;
        }

        const mostRecent = list
          .map((video) => ({
            video,
            entry: getProgress(meta, video.season, video.number),
          }))
          .filter((item) => item.entry?.updatedAt)
          .sort((a, b) => b.entry.updatedAt - a.entry.updatedAt)[0];

        const first = mostRecent?.video || list[0];
        const start = remember
          ? resumeSeconds(getProgress(meta, first.season, first.number))
          : 0;

        setVideos(list);
        setSeason(first.season);
        setEpisode(first.number);
        setResumeAt(start);
        setPosition(start);
        positionRef.current = start;
      })
      .catch(() => {
        if (alive) setError("Episodes could not be loaded.");
      });

    return () => {
      alive = false;
    };
  }, [id, isSeries, meta, metaId, remember]);

  useEffect(() => {
    if (!id) return;
    if (isSeries && (!videos.length || !season || !episode)) return;
    const start =
      positionRef.current > 45 ? Math.floor(positionRef.current) : resumeAt;
    const url = buildSourceUrl({
      source: sourceId,
      meta,
      season: isSeries ? season : null,
      episode: isSeries ? episode : null,
      startAt: start,
      autoplay: wantsAutoplay,
      theme,
      proxy,
    });
    loadedRef.current = false;
    setReady(false);
    if (!url) {
      setSourceNotice(
        `${sourceLabel(sourceId)} cannot play this title — trying the next source.`
      );
      setFailedSources((prev) =>
        prev.includes(sourceId) ? prev : [...prev, sourceId]
      );
      return;
    }
    setError("");
    setSrc(url);
  }, [
    attempt,
    episode,
    id,
    isSeries,
    meta,
    proxy,
    resumeAt,
    season,
    sourceId,
    theme,
    videos.length,
    wantsAutoplay,
  ]);

  // Walk down the list whenever the chosen source is marked broken.
  useEffect(() => {
    if (!failedSources.includes(sourceId)) return;
    const next = SOURCES.find(
      (source) =>
        !failedSources.includes(source.id) && canPlaySource(source, meta)
    );
    if (next) {
      setSourceId(next.id);
      return;
    }
    setError(
      "No source could load this title. Pick another source or open it in a new tab."
    );
  }, [failedSources, meta, sourceId]);

  // A cross-origin frame that never fires load counts as a dead source.
  useEffect(() => {
    if (!src || ready) return undefined;
    const pending = sourceId;
    const timer = window.setTimeout(() => {
      if (loadedRef.current) return;
      setSourceNotice(
        `${sourceLabel(pending)} did not load — switching source.`
      );
      setFailedSources((prev) =>
        prev.includes(pending) ? prev : [...prev, pending]
      );
    }, 9000);
    return () => window.clearTimeout(timer);
  }, [ready, sourceId, src]);

  useEffect(() => {
    const onMessage = (event) => {
      const frame = iframeRef.current;
      if (!isPlayerOrigin(event.origin)) return;
      if (frame && event.source && event.source !== frame.contentWindow) return;
      const sample = parseProgressMessage(event.data);
      if (!sample) return;
      remoteRef.current = true;
      setPosition(sample.position);
      if (sample.duration) setDuration(sample.duration);
      if (remember && Date.now() - lastPersist.current > 5000) {
        lastPersist.current = Date.now();
        persist(sample.position, sample.duration || durationRef.current);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [persist, remember]);

  useEffect(() => {
    if (!remember || position < 5) return undefined;
    const timer = window.setTimeout(
      () => persist(position, duration),
      1500
    );
    return () => window.clearTimeout(timer);
  }, [position, duration, persist, remember]);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = window.setInterval(() => {
      if (remoteRef.current) return;
      if (document.visibilityState !== "visible") return;
      setPosition((prev) => {
        const next = prev + 5;
        if (durationRef.current > 0 && next > durationRef.current) {
          return durationRef.current;
        }
        return next;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [ready]);

  const seasons = useMemo(
    () => [...new Set(videos.map((video) => video.season))].sort((a, b) => a - b),
    [videos]
  );

  const seasonEpisodes = useMemo(
    () =>
      videos
        .filter((video) => video.season === season)
        .sort((a, b) => a.number - b.number),
    [season, videos]
  );

  const pickEpisode = (number) => {
    const start = remember ? resumeSeconds(getProgress(meta, season, number)) : 0;
    setEpisode(number);
    setResumeAt(start);
    setPosition(start);
    positionRef.current = start;
    setDuration(0);
    setReady(false);
    remoteRef.current = false;
  };

  const startOver = () => {
    clearProgressEntry(
      meta,
      isSeries ? season : undefined,
      isSeries ? episode : undefined
    );
    positionRef.current = 0;
    setResumeAt(0);
    setPosition(0);
    setDuration(0);
    setReady(false);
    remoteRef.current = false;
    setAttempt((value) => value + 1);
    onProgressSaved?.();
  };

  const changeSource = (next) => {
    if (!SOURCE_IDS.includes(next)) return;
    setSourceId(next);
    setFailedSources((prev) => prev.filter((entry) => entry !== next));
    setSourceNotice("");
    setError("");
    setReady(false);
    loadedRef.current = false;
    onPickSource?.(next);
  };

  const tryNextSource = () => {
    const index = SOURCES.findIndex((source) => source.id === sourceId);
    const order = [...SOURCES.slice(index + 1), ...SOURCES.slice(0, index)];
    const next = order.find(
      (source) => source.id !== sourceId && canPlaySource(source, meta)
    );
    if (!next) {
      setSourceNotice("No other source can play this title.");
      return;
    }
    changeSource(next.id);
    setSourceNotice(`Trying ${next.label}.`);
  };

  useEffect(() => {
    if (!meta?.id) return undefined;
    let alive = true;
    setRelated({ status: "loading", items: [] });
    catalog
      .related(meta, 14)
      .then((items) => {
        if (!alive) return;
        setRelated({ status: items.length ? "ready" : "empty", items });
      })
      .catch(() => {
        if (alive) setRelated({ status: "error", items: [] });
      });
    return () => {
      alive = false;
    };
  }, [meta, relatedAttempt]);

  if (!meta) return null;

  const dateLabel = (() => {
    if (meta.releaseInfo) return meta.releaseInfo;
    const released = meta.released ? new Date(meta.released) : null;
    if (released && !Number.isNaN(released.getTime())) {
      return released.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    return "";
  })();

  const people = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [String(value)] : [];
  };
  const details = [
    { label: "Director", values: people(meta.director || meta.directors) },
    { label: "Writer", values: people(meta.writer || meta.writers) },
    { label: "Cast", values: people(meta.cast || meta.actors).slice(0, 6) },
  ]
    .filter((item) => item.values.length > 0)
    .map((item) => ({ label: item.label, value: item.values.join(", ") }));
  if (meta.awards) details.push({ label: "Awards", value: meta.awards });

  const status = error
    ? error
    : ready
      ? ""
      : !src && isSeries
        ? "Loading episodes…"
        : "Loading player…";

  const percent =
    duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;

  return (
    <main id="main" className="player">
      <div className="player-head">
        <button
          type="button"
          className="player-back"
          onClick={onBack}
          aria-label="Back to browse"
          title="Back to browse"
        >
          <ChevronLeft />
        </button>

        <div className="player-heading">
          <h1>{meta.name}</h1>
          <p className="player-kicker">
            {[isSeries ? "Series" : "Film", dateLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="player-actions">
          {onToggleSave ? (
            <button
              type="button"
              className={`btn btn-quiet btn-sm${saved ? " is-saved" : ""}`}
              aria-pressed={saved}
              onClick={() => onToggleSave(meta)}
            >
              <BookmarkIcon filled={saved} />
              {saved ? "In My List" : "My List"}
            </button>
          ) : null}
          <a
            className="player-source"
            href={directUrl(src) || PLAYER_API}
            target="_blank"
            rel="noreferrer"
          >
            Open {sourceLabel(sourceId)} in a new tab
          </a>
        </div>
      </div>

      <div className="sourcebar">
        <label className="sourcebar-field">
          <span>Source</span>
          <select
            value={sourceId}
            onChange={(event) => changeSource(event.target.value)}
          >
            {SOURCES.map((source) => (
              <option
                key={source.id}
                value={source.id}
                disabled={!canPlaySource(source, meta)}
              >
                {source.label}
                {failedSources.includes(source.id) ? " — failed" : ""}
                {canPlaySource(source, meta) ? "" : " — no id"}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="player-link" onClick={tryNextSource}>
          <RotateIcon />
          Try next source
        </button>
        {sourceNotice ? (
          <p className="sourcebar-note" role="status">
            {sourceNotice}
          </p>
        ) : null}
      </div>

      <p className="player-note">
        Playing from {sourceLabel(sourceId)}.{" "}
        {sourceId === "vidfast" && proxy
          ? "Playback is proxied through math_class:network so it still loads on restricted networks."
          : "Playback is embedded directly from the provider."}{" "}
        If it stays blank, try the next source.
      </p>

      {resumeAt > 45 ? (
        <div className="player-resume" role="status">
          <RotateIcon />
          <span>Resumed at {formatPosition(resumeAt)}</span>
          <button
            type="button"
            className="player-resume-reset"
            onClick={startOver}
          >
            Start over
          </button>
        </div>
      ) : null}

      <div className="stage">
        <iframe
          key={`${sourceId}-${attempt}-${season}-${episode}`}
          ref={iframeRef}
          src={src || "about:blank"}
          title={`${meta.name} player${
            isSeries ? ` season ${season} episode ${episode}` : ""
          }`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          onLoad={(event) => {
            if (event.currentTarget.src.includes("about:blank")) return;
            loadedRef.current = true;
            setReady(true);
            setSourceNotice("");
            setError("");
          }}
        />
        {status ? (
          <div className="stage-status" role="status">
            {error ? null : <span className="spinner" aria-hidden="true" />}
            <span>{status}</span>
          </div>
        ) : null}
      </div>

      {position > 0 ? (
        <div className="player-meter">
          <span className="player-meter-label">
            {formatPosition(position)}
            {duration > 0 ? ` of ${formatMinutes(duration / 60)}` : " watched"}
          </span>
          <span className="player-meter-track" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        </div>
      ) : null}

      <div
        className={`player-info${
          isSeries && seasonEpisodes.length ? "" : " is-single"
        }`}
      >
        <div className="player-copy">
          <Facts meta={meta} hideYear />

          {meta.description ? (
            <p className="overview">{meta.description}</p>
          ) : null}

          {details.length > 0 ? (
            <dl className="player-extras">
              {details.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {isSeries && seasonEpisodes.length > 0 ? (
          <aside className="episodes" aria-label="Episodes">
            <div className="episodes-head">
              <h2>Episodes</h2>
              <label className="season-picker">
                <span className="sr-only">Season</span>
                <select
                  value={season}
                  onChange={(event) => setSeason(Number(event.target.value))}
                >
                  {seasons.map((number) => (
                    <option key={number} value={number}>
                      Season {number}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="episode-count">
              {seasonEpisodes.length} episode
              {seasonEpisodes.length === 1 ? "" : "s"}
            </p>
            <ul className="episode-list">
              {seasonEpisodes.map((video) => (
                <li key={`${video.season}-${video.number}`}>
                  <button
                    type="button"
                    className={`episode${
                      video.number === episode ? " is-current" : ""
                    }`}
                    onClick={() => pickEpisode(video.number)}
                  >
                    <span className="ep-number">
                      {String(video.number).padStart(2, "0")}
                    </span>
                    <span className="ep-name">
                      {video.name || `Episode ${video.number}`}
                    </span>
                    <span className="ep-play" aria-hidden="true">
                      <PlayIcon />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>

      <div className="player-more">
        <Shelf
          title="More like this"
          items={related.items}
          status={related.status}
          emptyMessage="No similar titles were found."
          onOpen={onOpen}
          onRetry={() => setRelatedAttempt((value) => value + 1)}
          progressFor={progressFor}
          index={1}
        />
      </div>
    </main>
  );
}
