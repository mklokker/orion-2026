/**
 * Utilitários para detecção e renderização de GIFs do Giphy.
 *
 * Suporta todos os formatos:
 *   https://giphy.com/gifs/slug-ID
 *   https://media.giphy.com/media/ID/giphy.gif
 *   https://media0.giphy.com/media/v1.TOKEN/ID/giphy.gif
 *   https://media4.giphy.com/media/v1.Y2lkPTc5.../ID/giphy.gif
 *   https://i.giphy.com/media/ID/giphy.gif
 *   https://i.giphy.com/ID.gif
 */

/**
 * Verifica se a URL pertence ao domínio giphy.com.
 */
function isGiphyUrl(url) {
  try {
    const { hostname } = new URL(url);
    // Aceita: giphy.com, media.giphy.com, media1..media9.giphy.com, i.giphy.com
    return hostname === "giphy.com" || hostname.endsWith(".giphy.com");
  } catch {
    return false;
  }
}

/**
 * Verifica se a URL é um link direto para um GIF do Giphy.
 * Aceita qualquer URL de giphy.com cujo path contenha /media/ e termine em .gif
 * OU o formato i.giphy.com/<id>.gif
 */
function isDirectGiphyGif(url) {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.endsWith(".giphy.com") && hostname !== "giphy.com") return false;

    const lower = pathname.toLowerCase();
    // Termina em /giphy.gif, /200.gif, etc. com /media/ no path
    if (lower.includes("/media/") && lower.endsWith(".gif")) return true;
    // i.giphy.com/<id>.gif
    if (hostname === "i.giphy.com" && lower.endsWith(".gif")) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Extrai o GIF ID de uma URL do Giphy.
 * Para o formato v1: /.../media/v1.TOKEN/GIF_ID/giphy.gif → GIF_ID
 * Para formato simples: /media/GIF_ID/giphy.gif → GIF_ID
 */
export function extractGiphyId(url) {
  try {
    const { hostname, pathname } = new URL(url);
    const parts = pathname.split("/").filter(Boolean);

    const mediaIdx = parts.indexOf("media");
    if (mediaIdx !== -1) {
      // Coletar segmentos após "media"
      const afterMedia = parts.slice(mediaIdx + 1);

      // Remove o último segmento se for um arquivo .gif (ex: giphy.gif)
      const filtered = afterMedia.filter(p => !p.toLowerCase().endsWith(".gif"));

      // O ID real é o último segmento não-gif
      // Para formato v1: ["v1.TOKEN", "GIF_ID"] → GIF_ID
      // Para formato simples: ["GIF_ID"] → GIF_ID
      if (filtered.length > 0) {
        return filtered[filtered.length - 1];
      }
    }

    // /gifs/some-slug-ID → último segmento após último hífen
    const gifsIdx = parts.indexOf("gifs");
    if (gifsIdx !== -1 && parts[gifsIdx + 1]) {
      const slugParts = parts[gifsIdx + 1].split("-");
      return slugParts[slugParts.length - 1];
    }

    // i.giphy.com/<id>.gif
    const last = parts[parts.length - 1];
    if (last && last.toLowerCase().endsWith(".gif")) {
      return last.replace(/\.gif$/i, "");
    }
  } catch {}
  return null;
}

/**
 * Retorna a URL direta do GIF para renderização.
 * Prioriza usar a URL original se já for um link direto (.gif).
 * Caso contrário, tenta construir a URL via ID.
 */
export function resolveGiphyGifUrl(urlString) {
  const trimmed = urlString.trim();
  if (!isGiphyUrl(trimmed)) return null;

  // Se já é uma URL direta de GIF, use-a sem modificar
  if (isDirectGiphyGif(trimmed)) return trimmed;

  // Caso seja uma página de GIF (giphy.com/gifs/...), extrai o ID e constrói URL
  const id = extractGiphyId(trimmed);
  if (id) return `https://i.giphy.com/media/${id}/giphy.gif`;

  return null;
}

/**
 * Analisa o texto digitado pelo usuário:
 * - Se o texto (após trim) for APENAS uma URL do Giphy que resolve para um GIF → retorna a gifUrl
 * - Caso contrário, retorna null
 */
export function detectGiphyMessage(text) {
  const trimmed = text.trim();
  // Sem espaços = link puro
  if (!trimmed || trimmed.includes(" ")) return null;
  return resolveGiphyGifUrl(trimmed);
}

// Alias retrocompatível
export const normalizeGiphyUrl = resolveGiphyGifUrl;