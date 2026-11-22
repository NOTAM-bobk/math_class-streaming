// Cloudflare Worker that puts the Adcash library, its format scripts, zone
// config, ad calls and beacons behind this site's own origin.
//
// Serve it on <your-domain>/api/adcash/* (see wrangler.jsonc). The page only
// starts using these routes once /api/adcash/script/aclib.js returns the
// library, so the site keeps loading Adcash directly when this Worker is not
// deployed, not routed, or failing.

const CDN = "https://acscdn.com";

// Hosts Adcash's library talks to: the script CDN, the ad server that answers
// zone config and ad calls, and the engagement tracker.
const AD_HOSTS = [
  "acscdn.com",
  "adcash.com",
  "rapidadexchange.com",
  "usrpubtrck.com",
];

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TEXT_TYPES = /javascript|ecmascript|json|text\/|xml/i;

function hostAllowed(host) {
  const name = String(host || "").toLowerCase();
  return AD_HOSTS.some(
    (allowed) => name === allowed || name.endsWith(`.${allowed}`)
  );
}

// "/api/adcash/script/aclib.js"          -> https://acscdn.com/script/aclib.js
// "/api/adcash/rapidadexchange.com/ad/x" -> https://rapidadexchange.com/ad/x
function upstreamFor(url) {
  const parts = url.pathname.replace(/^\/api\/adcash\/?/, "").split("/");
  let host = CDN;
  if (parts.length > 1 && parts[0].includes(".")) {
    if (!hostAllowed(parts[0])) return null;
    host = `https://${parts.shift().toLowerCase()}`;
  }
  const path = `/${parts.filter(Boolean).join("/")}`;
  const target = path === "/" ? "/script/aclib.js" : path;
  return `${host}${target}${url.search}`;
}

// Point URLs inside proxied scripts and configs back at this Worker, so nested
// requests from the library keep the same origin too.
function rewriteBody(text, origin) {
  return text.replace(
    /(?:https?:)?\/\/([a-z0-9.-]+)(?=[/"'\s?#\\]|$)/gi,
    (match, host) => {
      if (!hostAllowed(host)) return match;
      return `${origin}/api/adcash/${host.toLowerCase()}`;
    }
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/adcash/")) {
      return new Response("Not found", { status: 404 });
    }
    if (!["GET", "HEAD", "POST"].includes(request.method)) {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD, POST" },
      });
    }

    const target = upstreamFor(url);
    if (!target) {
      return new Response("Host not allowed", { status: 403 });
    }
    const upstreamOrigin = new URL(target).origin;

    const headers = new Headers({
      "user-agent": request.headers.get("user-agent") || DEFAULT_UA,
      accept: request.headers.get("accept") || "*/*",
      "accept-language":
        request.headers.get("accept-language") || "en-US,en;q=0.9",
      referer: `${upstreamOrigin}/`,
      origin: upstreamOrigin,
    });
    const requestType = request.headers.get("content-type");
    if (requestType) headers.set("content-type", requestType);

    // Format scripts change rarely, so let the edge cache them; zone config and
    // ad calls must always be live.
    const cache = caches.default;
    // Key on the public URL: the rewritten body contains this site's origin, so
    // two hostnames must not share an entry.
    const cacheKey = new Request(url.toString(), { method: "GET" });
    const cacheable =
      request.method === "GET" && url.pathname.includes("/script/");
    if (cacheable) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    let upstream;
    try {
      upstream = await fetch(target, {
        method: request.method,
        headers,
        body:
          request.method === "POST" ? await request.arrayBuffer() : undefined,
        redirect: "follow",
      });
    } catch (error) {
      return new Response("The ad proxy could not reach Adcash.", {
        status: 502,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const contentType =
      upstream.headers.get("content-type") ||
      "application/javascript; charset=utf-8";
    const responseHeaders = new Headers({
      "content-type": contentType,
      "x-content-type-options": "nosniff",
      "access-control-allow-origin": "*",
      "cache-control":
        cacheable && upstream.ok
          ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
          : "no-store",
    });

    if (request.method === "HEAD") {
      return new Response(null, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    const body =
      TEXT_TYPES.test(contentType) && upstream.ok
        ? rewriteBody(await upstream.text(), url.origin)
        : await upstream.arrayBuffer();

    const nullBody = upstream.status === 204 || upstream.status === 304;
    const response = new Response(nullBody ? null : body, {
      status: upstream.status,
      headers: responseHeaders,
    });
    if (cacheable && upstream.ok) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  },
};
