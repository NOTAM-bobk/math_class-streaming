import {
  isTextType,
  proxyHeaders,
  rewriteBody,
  targetUrl,
} from "../_rewrite.js";

export const config = { maxDuration: 30 };

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
    res.end("The player proxy could not reach VidFast.");
    return;
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  res.statusCode = upstream.status;
  res.setHeader("content-type", contentType);
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader(
    "cache-control",
    upstream.status === 200
      ? "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
      : "no-store"
  );
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  if (isTextType(contentType)) {
    res.end(rewriteBody(buffer.toString("utf8")));
  } else {
    res.end(buffer);
  }
}
