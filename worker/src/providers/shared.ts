import { alignTranslation, parseLyrics } from "../lrc";
import type { LyricsResult, ProviderName } from "../types";

export const browserHeaders = {
  "User-Agent": "Lyricify-Lyrics-Helper-Worker/0.1 (+https://github.com/Kelcoin/Lyricify-Lyrics-Helper)",
  "Accept": "application/json, text/plain, */*"
};

export async function requireOk(response: Response): Promise<Response> {
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
  return response;
}

export function mapRawLyrics(
  provider: ProviderName,
  providerDisplayName: string,
  providerLyricsId: string,
  lyrics: string | null | undefined,
  translatedLyrics?: string | null,
  languageCode = "zh"
): LyricsResult | null {
  const parsed = parseLyrics(lyrics);
  if (!parsed.timeSynced || parsed.lines.length === 0) return null;

  const translation = parseLyrics(translatedLyrics);
  return {
    provider,
    providerDisplayName,
    providerLyricsId,
    timeSynced: parsed.timeSynced,
    lines: parsed.lines,
    ...(translation.lines.length > 0
      ? { translation: { languageCode, lines: alignTranslation(parsed.lines, translation.lines) } }
      : {})
  };
}

export function decodeBase64Utf8(value?: string | null): string | null {
  if (!value) return null;
  try {
    const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
