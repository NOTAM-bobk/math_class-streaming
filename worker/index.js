// Cloudflare Workers entry for math_class:network. It serves the built site
// from ./dist and keeps the two same-origin proxies the app expects:
// /embed/* for the VidFast player and /api/adcash/* for the ad library.

import {
  isTextType,
  proxyHeaders,
  rewriteBody,
  targetUrl,
} from "../api/_rewrite.js";
import adcash from "./adcash.js";

async function embed(request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl(request.url), {
      method: request.method,
      headers: proxyHeaders(Object.fromEntries(request.headers)),
      redirect: "follow",
    });
  } catch {
    return new Response("The player proxy could not reach VidFast.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  const headers = new Headers({
    "content-type": contentType,
    "access-control-allow-origin": "*",
    "cache-control":
      upstream.status === 200
        ? "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
        : "no-store",
  });

  if (request.method === "HEAD") {
    return new Response(null, { status: upstream.status, headers });
  }

  const body = isTextType(contentType)
    ? rewriteBody(await upstream.text())
    : await upstream.arrayBuffer();

  return new Response(body, { status: upstream.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/embed" || url.pathname.startsWith("/embed/")) {
      return embed(request);
    }

    if (url.pathname.startsWith("/api/adcash/")) {
      return adcash.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  },
};
