import type { LyricsQuery, SearchCandidate } from "./types";

export function normalizeMetadata(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[（(\[].*?(?:feat\.?|ft\.?|with).*?[）)\]]/gi, "")
    .replace(/\s+(?:feat\.?|ft\.?|with)\s+.*$/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function similarity(left: string, right: string): number {
  const a = normalizeMetadata(left);
  const b = normalizeMetadata(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length);

  const leftSet = new Set([...a]);
  const rightSet = new Set([...b]);
  const overlap = [...leftSet].filter((character) => rightSet.has(character)).length;
  return (2 * overlap) / (leftSet.size + rightSet.size);
}

function scoreCandidate(query: LyricsQuery, candidate: SearchCandidate): number {
  const title = similarity(query.title, candidate.title);
  const artist = Math.max(0, ...candidate.artists.map((value) => similarity(query.artist, value)));
  const duration = query.durationMs && candidate.durationMs
    ? Math.max(0, 1 - Math.abs(query.durationMs - candidate.durationMs) / 15_000)
    : 0.5;
  const album = query.album && candidate.album ? similarity(query.album, candidate.album) : 0.5;
  return title * 0.55 + artist * 0.25 + duration * 0.15 + album * 0.05;
}

export function pickBestCandidate<T extends SearchCandidate>(query: LyricsQuery, candidates: T[]): T | null {
  const ranked = candidates
    .map((candidate) => ({ candidate, score: scoreCandidate(query, candidate) }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score >= 0.62 ? ranked[0].candidate : null;
}
