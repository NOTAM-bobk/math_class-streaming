import { useEffect, useMemo, useState } from "react";
import { catalog } from "../lib/catalog.js";
import { episodeUrl, idOf, movieUrl, PLAYER_API } from "../lib/player.js";
import Facts from "./Facts.jsx";
import { ChevronLeft, PlayIcon } from "./Icons.jsx";

export default function PlayerView({ meta, autoplay, onBack }) {
  const [videos, setVideos] = useState([]);
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [src, setSrc] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  const isSeries = meta?.type === "series";
  const id = idOf(meta);
  const metaId = meta?.id || meta?.imdb_id;

  useEffect(() => {
    let alive = true;
    setVideos([]);
    setSrc("");
    setReady(false);
    setError("");

    if (!id) {
      setError("This title has no playable id.");
      return undefined;
    }

    if (!isSeries) {
      setSrc(movieUrl(id, autoplay));
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

        const first = list[0];
        setVideos(list);
        setSeason(first.season);
        setEpisode(first.number);
        setSrc(episodeUrl(id, first.season, first.number, autoplay));
      })
      .catch(() => {
        if (alive) setError("Episodes could not be loaded.");
      });

    return () => {
      alive = false;
    };
  }, [autoplay, id, isSeries, metaId]);

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
    setEpisode(number);
    setReady(false);
    setSrc(episodeUrl(id, season, number, true));
  };

  if (!meta) return null;

  const status = error
    ? error
    : ready
      ? ""
      : !src && isSeries
        ? "Loading episodes…"
        : "Loading player…";

  return (
    <main id="main" className="player">
      <div className="player-top">
        <button type="button" className="btn btn-quiet btn-sm" onClick={onBack}>
          <ChevronLeft />
          Back to browse
        </button>
        <a
          className="player-source"
          href={src || PLAYER_API}
          target="_blank"
          rel="noreferrer"
        >
          Open in VidFast
        </a>
      </div>

      <div className="stage">
        <iframe
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
            {status}
          </div>
        ) : null}
      </div>

      <p className="player-note">
        Playback is embedded from VidFast. If it stays blank, open it in a new
        tab.
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
