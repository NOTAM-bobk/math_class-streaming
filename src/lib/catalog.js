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
