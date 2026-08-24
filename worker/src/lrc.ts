import type { LyricLine } from "./types";

export interface ParsedLyrics {
  timeSynced: boolean;
  lines: LyricLine[];
}

const timestampPattern = /\[(\d+):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const metadataPattern = /^\[[a-zA-Z][a-zA-Z0-9_-]*:.*\]$/;

function fractionToMilliseconds(value = "0"): number {
  return Number(value.padEnd(3, "0").slice(0, 3));
}

export function parseLyrics(raw: string | null | undefined): ParsedLyrics {
  if (!raw?.trim()) return { timeSynced: false, lines: [] };

  const synced: LyricLine[] = [];
  const plain: LyricLine[] = [];

  for (const rawLine of raw.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line || metadataPattern.test(line)) continue;

    const timestamps = [...line.matchAll(timestampPattern)];
    const content = line.replace(timestampPattern, "").trim();
    if (!content) continue;

    if (timestamps.length === 0) {
      plain.push({ content });
      continue;
    }

    for (const match of timestamps) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const offsetMs = (minutes * 60 + seconds) * 1000 + fractionToMilliseconds(match[3]);
      synced.push({ content, offsetMs });
    }
  }

  if (synced.length > 0) {
    synced.sort((a, b) => (a.offsetMs ?? 0) - (b.offsetMs ?? 0));
    return { timeSynced: true, lines: synced };
  }

  return { timeSynced: false, lines: plain };
}

export function alignTranslation(original: LyricLine[], translated: LyricLine[]): string[] {
  const translatedByTime = new Map(
    translated
      .filter((line): line is LyricLine & { offsetMs: number } => line.offsetMs !== undefined)
      .map((line) => [line.offsetMs, line.content])
  );

  return original.map((line, index) => {
    if (line.offsetMs !== undefined) {
      const exact = translatedByTime.get(line.offsetMs);
      if (exact !== undefined) return exact;

      const nearby = translated.find(
        (candidate) => candidate.offsetMs !== undefined && Math.abs(candidate.offsetMs - line.offsetMs!) <= 250
      );
      if (nearby) return nearby.content;
    }
    return translated[index]?.content ?? "";
  });
}
