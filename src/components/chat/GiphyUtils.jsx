/**
 * Normaliza URLs do Giphy para URL direta do GIF
 * Suporta:
 *   https://giphy.com/gifs/slug-ID
 *   https://media.giphy.com/media/ID/giphy.gif
 *   https://media0.giphy.com/media/ID/giphy.gif
 *   https://i.giphy.com/media/ID/giphy.gif
 *   https://i.giphy.com/ID.gif
 */

const GIPHY_DOMAINS = ["giphy.com", "media.giphy.com", "i.giphy.com"];

function isGiphyUrl(url) {
  try {
    const u = new URL(url);
    return GIPHY_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

function extractGiphyId(url) {
  try {
    const u = new URL(url);

    // https://i.giphy.com/ABCDEFG.gif  or  /media/ABCDEFG/giphy.gif
    // https://media0.giphy.com/media/ABCDEFG/giphy.gif
    const pathParts = u.pathname.split("/").filter(Boolean);

    // /media/<id>/giphy.gif  or  /media/<id>/200.gif  etc.
    const mediaIdx = pathParts.indexOf("media");
    if (mediaIdx !== -1 && pathParts[mediaIdx + 1]) {
      return pathParts[mediaIdx + 1];
    }

    // /gifs/some-slug-ABCDEFG  — ID is the last segment after last dash
    const gifsIdx = pathParts.indexOf("gifs");
    if (gifsIdx !== -1 && pathParts[gifsIdx + 1]) {
      const slug = pathParts[gifsIdx + 1];
      const parts = slug.split("-");
      return parts[parts.length - 1];
    }

    // i.giphy.com/ABCDEFG.gif
    const last = pathParts[pathParts.length - 1];
    if (last && last.endsWith(".gif")) {
      return last.replace(".gif", "");
    }
  } catch {}
  return null;
}

/**
 * Returns normalized direct GIF URL or null if not a Giphy link.
 */
export function normalizeGiphyUrl(urlString) {
  const trimmed = urlString.trim();
  if (!isGiphyUrl(trimmed)) return null;
  const id = extractGiphyId(trimmed);
  if (!id) return null;
  return `https://i.giphy.com/media/${id}/giphy.gif`;
}

/**
 * Given the full text typed by the user:
 * - If the text is ONLY a Giphy URL (trimmed), return the normalized GIF URL.
 * - Otherwise return null (treat as plain text).
 */
export function detectGiphyMessage(text) {
  const trimmed = text.trim();
  // Only a URL (no spaces = pure link)
  if (!trimmed.includes(" ") && isGiphyUrl(trimmed)) {
    return normalizeGiphyUrl(trimmed);
  }
  return null;
}