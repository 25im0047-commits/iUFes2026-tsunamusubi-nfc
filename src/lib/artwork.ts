export type ArtworkVariant = "character" | "stamp";
export type GhostArtwork = { src: string; viewBox: string };

export const ARTWORK_WIDTH = 354;
export const ARTWORK_HEIGHT = 472;

// Original PNGs stay unchanged. Viewports include all nontransparent pixels
// plus 8px of padding, so their differing transparent margins do not shrink the art.
// Cat A/red and B/blue are provisional display assignments; see the source audit.
const artworkByGhost: Record<string, {
  slug: string; characterViewBox: string; stampViewBox: string;
}> = {
  "good-01": { slug: "cat-red", characterViewBox: "84 116 182 241", stampViewBox: "51 110 249 247" },
  "good-02": { slug: "cat-blue", characterViewBox: "81 114 210 247", stampViewBox: "48 107 257 257" },
  "good-03": { slug: "spider", characterViewBox: "18 51 318 327", stampViewBox: "48 107 257 257" },
  "good-04": { slug: "franken", characterViewBox: "31 82 311 335", stampViewBox: "48 107 257 257" },
  "good-05": { slug: "witch", characterViewBox: "10 66 332 340", stampViewBox: "48 107 257 257" },
  "good-06": { slug: "mummy", characterViewBox: "83 71 202 331", stampViewBox: "48 107 257 257" },
  "good-07": { slug: "reaper", characterViewBox: "24 58 325 356", stampViewBox: "50 108 253 252" },
  "good-08": { slug: "skeleton", characterViewBox: "31 68 317 337", stampViewBox: "48 107 257 257" },
  "good-09": { slug: "mermaid", characterViewBox: "66 54 220 361", stampViewBox: "48 107 257 257" },
  "bad-01": { slug: "medusa", characterViewBox: "70 49 223 372", stampViewBox: "48 107 257 255" },
  "bad-02": { slug: "vampire", characterViewBox: "55 55 249 363", stampViewBox: "48 107 257 257" },
};

export function getGhostArtwork(
  id: string,
  variant: ArtworkVariant = "character",
): GhostArtwork | undefined {
  const artwork = artworkByGhost[id];
  if (!artwork) return undefined;
  return {
    src: `/ghosts/${variant === "stamp" ? "stamps" : "characters"}/${artwork.slug}.png`,
    viewBox: variant === "stamp" ? artwork.stampViewBox : artwork.characterViewBox,
  };
}
