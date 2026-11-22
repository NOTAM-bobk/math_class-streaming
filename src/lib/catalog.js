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
