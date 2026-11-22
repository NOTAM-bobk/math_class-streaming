export const UPSTREAM = "https://vidfast.vc";
export const PREFIX = "/embed";

const TEXT_TYPES = /text\/html|javascript|ecmascript|text\/css|application\/json/i;

export function isTextType(contentType = "") {
  return TEXT_TYPES.test(contentType);
}

// Rewrite VidFast's root-absolute asset URLs so they stay on our proxy origin.
export function rewriteBody(text) {
  return text
    .replace(/https?:\/\/vidfast\.vc(?=[/"'\\\s]|$)/gi, PREFIX)
    .replace(
      /((?:src|href|poster|action|data-src|srcset|srcSet)=["'])\/(?![\/]|embed\/)/g,
      "$1/embed/"
    )
    .replace(/url\(\s*(["']?)\/(?![\/]|embed\/)/g, (match, quote) => {
      return `url(${quote}/embed/`;
    })
    .replace(
      /(["'`])\/(_next|api|movie|tv|images|assets|fonts|favicon\.ico|4k\.png|globe\.png)\//g,
      "$1/embed/$2/"
    );
}

export function targetUrl(requestUrl) {
  const url = new URL(requestUrl, "https://placeholder.local");
  let path = url.pathname.replace(/^\/(?:api\/)?embed/, "") || "/";
  if (!path.startsWith("/") || path.startsWith("//")) path = "/";
  return `${UPSTREAM}${path}${url.search}`;
}

export function proxyHeaders(incoming = {}) {
  const headers = {
    "user-agent":
      incoming["user-agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    accept: incoming.accept || "*/*",
    "accept-language": incoming["accept-language"] || "en-US,en;q=0.9",
    referer: "https://vidfast.vc/",
  };
  if (incoming.range) headers.range = incoming.range;
  return headers;
}
