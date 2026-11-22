export const config = { maxDuration: 30 };

const CDN = "https://acscdn.com";

// Hosts Adcash's library talks to: the script CDN, the ad server that answers
// zone config and ad calls, and the engagement tracker.
const AD_HOSTS = [
  "acscdn.com",
  "adcash.com",
  "rapidadexchange.com",
  "usrpubtrck.com",
];

function hostAllowed(host) {
  const name = String(host || "").toLowerCase();
  return AD_HOSTS.some(
    (allowed) => name === allowed || name.endsWith(`.${allowed}`)
  );
}

// "/api/adcash/script/aclib.js"          -> https://acscdn.com/script/aclib.js
// "/api/adcash/rapidadexchange.com/ad/x" -> https://rapidadexchange.com/ad/x
function upstreamFor(requestUrl) {
  const url = new URL(requestUrl, "https://placeholder.local");
  const parts = url.pathname.replace(/^\/api\/adcash\/?/, "").split("/");
  let host = CDN;
  if (parts.length > 1 && parts[0].includes(".") && hostAllowed(parts[0])) {
    host = `https://${parts.shift().toLowerCase()}`;
  }
  const path = `/${parts.filter(Boolean).join("/")}`;
  const target = path === "/" ? "/script/aclib.js" : path;
  return { host, url: `${host}${target}${url.search}` };
}

function isTextType(contentType = "") {
  return /javascript|ecmascript|json|text\/|xml/i.test(contentType);
}

// Point URLs inside proxied scripts and configs back at this proxy, so nested
// requests from the ad library keep the same origin too.
function rewriteBody(text, origin) {
  return text.replace(
    /(?:https?:)?\/\/([a-z0-9.-]+)(?=[/"'\s?#\\]|$)/gi,
    (match, host) => {
      if (!hostAllowed(host)) return match;
      return `${origin}/api/adcash/${host.toLowerCase()}`;
    }
  );
}

function proxyHeaders(incoming = {}, host) {
  const headers = {
    "user-agent":
      incoming["user-agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    accept: incoming.accept || "*/*",
    "accept-language": incoming["accept-language"] || "en-US,en;q=0.9",
    referer: `${host}/`,
    origin: host,
  };
  if (incoming["content-type"]) headers["content-type"] = incoming["content-type"];
  return headers;
}

function requestBody(req) {
  if (req.method !== "POST") return undefined;
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return JSON.stringify(req.body);
  return undefined;
}

function originOf(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return host ? `${proto}://${host}` : "";
}

// Same-origin passthrough for everything the Adcash library requests: the
// library itself, its format scripts, zone config and impression beacons.
export default async function handler(req, res) {
  if (!["GET", "HEAD", "POST"].includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("allow", "GET, HEAD, POST");
    res.end("Method not allowed");
    return;
  }

  const { host, url } = upstreamFor(req.url);
  const body = requestBody(req);

  let upstream;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers: proxyHeaders(req.headers, host),
      body,
      redirect: "follow",
    });
  } catch {
    res.statusCode = 502;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("The ad proxy could not reach Adcash.");
    return;
  }

  const contentType =
    upstream.headers.get("content-type") || "application/javascript; charset=utf-8";
  res.statusCode = upstream.status;
  res.setHeader("content-type", contentType);
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader(
    "cache-control",
    upstream.status === 200 && url.includes("/script/")
      ? "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
      : "no-store"
  );
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (isTextType(contentType) && upstream.status === 200) {
    res.end(rewriteBody(buffer.toString("utf8"), originOf(req)));
  } else {
    res.end(buffer);
  }
}
