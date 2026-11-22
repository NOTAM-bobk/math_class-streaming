import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { catalog } from "../lib/catalog.js";
import { formatMinutes, formatPosition } from "../lib/format.js";
import {
  directUrl,
  episodeUrl,
  idOf,
  movieUrl,
  PLAYER_API,
} from "../lib/player.js";
import {
  clearProgressEntry,
  getProgress,
  resumeSeconds,
  saveProgress,
} from "../lib/progress.js";
import { themeHex } from "../lib/settings.js";
import Facts from "./Facts.jsx";
import { titlePath } from "../lib/routes.js";
import {
  BookmarkIcon,
  ChevronLeft,
  PlayIcon,
  RotateIcon,
  ShareIcon,
} from "./Icons.jsx";

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
  const [copied, setCopied] = useState(false);

  const iframeRef = useRef(null);
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const remoteRef = useRef(false);
  const lastPersist = useRef(0);
  const lastAppSync = useRef(0);

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

  useEffect(() => {
    let alive = true;
    setReady(false);
    setError("");
    setVideos([]);
    setPosition(0);
    setDuration(0);
    setResumeAt(0);
    remoteRef.current = false;

    if (!id) {
      setError("This title has no playable id.");
      return undefined;
    }

    if (!isSeries) {
      const start = remember ? resumeSeconds(getProgress(meta)) : 0;
      setResumeAt(start);
      setPosition(start);
      setSrc(
        movieUrl(id, {
          autoplay: wantsAutoplay,
          startAt: start,
          theme,
          proxy,
        })
      );
      return undefined;
    }

    setSrc("");
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
        setSrc(
          episodeUrl(id, first.season, first.number, {
            autoplay: wantsAutoplay,
            startAt: start,
            theme,
            proxy,
          })
        );
      })
      .catch(() => {
        if (alive) setError("Episodes could not be loaded.");
      });

    return () => {
      alive = false;
    };
  }, [
    id,
    isSeries,
    meta,
    metaId,
    proxy,
    remember,
    theme,
    wantsAutoplay,
  ]);

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
    setReady(false);
    setResumeAt(start);
    setPosition(start);
    setDuration(0);
    remoteRef.current = false;
    setSrc(
      episodeUrl(id, season, number, {
        autoplay: wantsAutoplay,
        startAt: start,
        theme,
        proxy,
      })
    );
  };

  const startOver = () => {
    clearProgressEntry(
      meta,
      isSeries ? season : undefined,
      isSeries ? episode : undefined
    );
    setResumeAt(0);
    setPosition(0);
    setDuration(0);
    setReady(false);
    remoteRef.current = false;
    setSrc(
      isSeries
        ? episodeUrl(id, season, episode, { autoplay: true, theme, proxy })
        : movieUrl(id, { autoplay: true, theme, proxy })
    );
    onProgressSaved?.();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        new URL(titlePath(meta), window.location.origin).toString()
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!meta) return null;

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
      <div className="player-top">
        <button type="button" className="btn btn-quiet btn-sm" onClick={onBack}>
          <ChevronLeft />
          Back to browse
        </button>
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
          <button
            type="button"
            className={`player-link${copied ? " is-copied" : ""}`}
            onClick={copyLink}
          >
            <ShareIcon />
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a
            className="player-source"
            href={directUrl(src) || PLAYER_API}
            target="_blank"
            rel="noreferrer"
          >
            Open in VidFast
          </a>
          <span className="sr-only" role="status">
            {copied ? "Title link copied" : ""}
          </span>
        </div>
      </div>

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
          ref={iframeRef}
          src={src || "about:blank"}
          title={`${meta.name} player${
            isSeries ? ` season ${season} episode ${episode}` : ""
          }`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          onLoad={(event) => {
            if (!event.currentTarget.src.includes("about:blank")) setReady(true);
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
          <span className="player-meter-track" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
          <span className="player-meter-label">
            {formatPosition(position)}
            {duration > 0 ? ` of ${formatMinutes(duration / 60)}` : " watched"}
          </span>
        </div>
      ) : null}

      <p className="player-note">
        {proxy
          ? "Playback is proxied through math_class:network so it still loads on restricted networks."
          : "Playback is embedded directly from VidFast."}{" "}
        If it stays blank, open it in VidFast.
      </p>

      <div
        className={`player-info${
          isSeries && seasonEpisodes.length ? "" : " is-single"
        }`}
      >
        <div className="player-copy">
          <h1>{meta.name}</h1>
          <Facts meta={meta} />
          {meta.description ? (
            <p className="overview">{meta.description}</p>
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
    </main>
  );
}
