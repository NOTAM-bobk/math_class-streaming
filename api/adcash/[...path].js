export const config = { maxDuration: 20 };

const UPSTREAM = "https://acscdn.com";

// "/api/adcash/script/aclib.js?x=1" -> "https://acscdn.com/script/aclib.js?x=1"
function targetUrl(requestUrl) {
  const url = new URL(requestUrl, "https://placeholder.local");
  const path = url.pathname.replace(/^\/api\/adcash/, "") || "/script/aclib.js";
  return `${UPSTREAM}${path.startsWith("/") ? path : `/${path}`}${url.search}`;
}

function proxyHeaders(incoming = {}) {
  return {
    "user-agent":
      incoming["user-agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    accept: incoming.accept || "*/*",
    "accept-language": incoming["accept-language"] || "en-US,en;q=0.9",
    referer: `${UPSTREAM}/`,
  };
}

// Same-origin passthrough for the Adcash CDN, so networks that block
// acscdn.com still get the ad library from our own domain.
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("allow", "GET, HEAD");
    res.end("Method not allowed");
    return;
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl(req.url), {
      method: req.method,
      headers: proxyHeaders(req.headers),
      redirect: "follow",
    });
  } catch {
    res.statusCode = 502;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("The ad proxy could not reach Adcash.");
    return;
  }

  res.statusCode = upstream.status;
  res.setHeader(
    "content-type",
    upstream.headers.get("content-type") || "application/javascript; charset=utf-8"
  );
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader(
    "cache-control",
    upstream.status === 200
      ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
      : "no-store"
  );
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(Buffer.from(await upstream.arrayBuffer()));
}
