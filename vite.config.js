import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  isTextType,
  proxyHeaders,
  rewriteBody,
  targetUrl,
} from "./api/_rewrite.js";
import adcashHandler from "./api/adcash/[...path].js";

function embedProxy() {
  return {
    name: "vidfast-embed-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/embed")) return next();
        try {
          const upstream = await fetch(targetUrl(req.url), {
            headers: proxyHeaders(req.headers),
          });
          const contentType =
            upstream.headers.get("content-type") || "application/octet-stream";
          const buffer = Buffer.from(await upstream.arrayBuffer());
          res.statusCode = upstream.status;
          res.setHeader("content-type", contentType);
          res.setHeader("cache-control", "no-store");
          res.end(
            isTextType(contentType)
              ? rewriteBody(buffer.toString("utf8"))
              : buffer
          );
        } catch {
          res.statusCode = 502;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("The player proxy could not reach VidFast.");
        }
      });
    },
  };
}

// Mirror the Vercel Adcash proxy in `vite dev`, so the ad library and its
// sub-scripts load on the same origin locally too.
function adcashProxy() {
  return {
    name: "adcash-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        if (req.url.startsWith("/script/")) {
          req.url = `/api/adcash${req.url}`;
        }
        if (!req.url.startsWith("/api/adcash/")) return next();
        await adcashHandler(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), embedProxy(), adcashProxy()],
});
