const API = "https://v3-cinemeta.strem.io";

async function request(path) {
  const response = await fetch(`${API}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Cinemeta responded ${response.status}`);
  }
  return response.json();
}

function scoreOf(meta) {
  const rating = Number.parseFloat(meta?.imdbRating);
  const year = Number.parseInt(
    String(meta?.releaseInfo || meta?.year || "").match(/\d{4}/)?.[0] || "0",
    10
  );
  return { rating: Number.isFinite(rating) ? rating : 0, year: Number.isFinite(year) ? year : 0 };
}

export const catalog = {
  meta(type, id) {
    if (!id) return Promise.reject(new Error("A title id is required"));
    return request(`/meta/${type}/${encodeURIComponent(id)}.json`);
  },

  browse({ type, catalog: kind, genre }) {
    let path = `/catalog/${type}/${kind}`;
    if (genre) path += `/genre=${encodeURIComponent(genre)}`;
    return request(`${path}.json`);
  },

  // A shuffled mix of popular films and series for the rotating billboard.
  async spotlight(limit = 6) {
    const results = await Promise.allSettled([
      request("/catalog/movie/top.json"),
      request("/catalog/series/top.json"),
    ]);
    const pools = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value?.metas || []);
    if (!pools.length) throw new Error("Spotlight is unavailable");

    const picks = [];
    const seen = new Set();
    // Start past the headlines so the billboard is not the same as row one.
    for (let offset = 6; offset < 48 && picks.length < limit; offset += 1) {
      for (const pool of pools) {
        const meta = pool[offset];
        if (!meta?.id || !meta?.name) continue;
        const key = `${meta.type || "movie"}-${meta.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        picks.push(meta);
        if (picks.length >= limit) break;
      }
    }
    return picks;
  },

  async trendingToday(limit = 10) {
    const results = await Promise.allSettled([
      request("/catalog/movie/top.json"),
      request("/catalog/series/top.json"),
    ]);
    if (results.every((result) => result.status === "rejected")) {
      throw new Error("Trending is unavailable");
    }

    const seen = new Set();
    const metas = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const meta of result.value?.metas || []) {
        if (!meta?.id || !meta?.name) continue;
        const key = `${meta.type || "movie"}-${meta.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        metas.push(meta);
      }
    }

    return metas
      .map((meta) => ({ meta, ...scoreOf(meta) }))
      .sort((a, b) => b.rating - a.rating || b.year - a.year)
      .slice(0, limit)
      .map((entry) => entry.meta);
  },

  // Neighbours for the "More like this" shelf: the title's genres first, then
  // the rest of its format, then a few of the other format for variety.
  async related(meta, limit = 14) {
    const type = meta?.type === "series" ? "series" : "movie";
    const other = type === "series" ? "movie" : "series";
    const genres = Array.isArray(meta?.genres)
      ? [...new Set(meta.genres.filter(Boolean))].slice(0, 2)
      : [];

    const queries = [
      ...genres.map((genre) => ({ type, catalog: "top", genre })),
      { type, catalog: "top" },
      ...genres.map((genre) => ({ type: other, catalog: "top", genre })),
      { type: other, catalog: "top" },
    ];

    const results = await Promise.allSettled(
      queries.map((query) => this.browse(query))
    );
    if (results.every((result) => result.status === "rejected")) {
      throw new Error("More like this is unavailable");
    }

    const currentKey = `${type}-${String(meta?.id || meta?.imdb_id || "")}`;
    const seen = new Set([currentKey]);
    const pools = { [type]: [], [other]: [] };

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const pool = pools[queries[index].type];
      const metas = Array.isArray(result.value?.metas) ? result.value.metas : [];
      for (const item of metas) {
        if (!item?.id || !item?.name) continue;
        const key = `${item.type || queries[index].type}-${item.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(item);
      }
    });

    const picks = pools[type].slice(0, Math.ceil(limit * 0.75));
    picks.push(...pools[other].slice(0, limit - picks.length));
    if (picks.length < limit) {
      picks.push(...pools[type].slice(picks.length, limit));
    }
    return picks.slice(0, limit);
  },

  async search(query) {
    const term = encodeURIComponent(query.trim());
    const results = await Promise.allSettled([
      request(`/catalog/movie/top/search=${term}.json`),
      request(`/catalog/series/top/search=${term}.json`),
    ]);
    if (results.every((result) => result.status === "rejected")) {
      throw new Error("Search is unavailable");
    }

    const seen = new Set();
    const metas = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const meta of result.value?.metas || []) {
        if (!meta?.id || seen.has(meta.id)) continue;
        seen.add(meta.id);
        metas.push(meta);
      }
    }
    return metas;
  },
};
