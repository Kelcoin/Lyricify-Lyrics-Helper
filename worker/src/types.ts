export type ProviderName = "lrclib" | "netease" | "qqmusic";

export interface LyricsQuery {
  title: string;
  artist: string;
  album?: string;
  durationMs?: number;
  spotifyId?: string;
  language?: string;
}

export interface LyricLine {
  content: string;
  offsetMs?: number;
}

export interface LyricsTranslation {
  languageCode: string;
  lines: string[];
}

export interface LyricsResult {
  provider: ProviderName;
  providerDisplayName: string;
  providerLyricsId: string;
  timeSynced: boolean;
  lines: LyricLine[];
  translation?: LyricsTranslation;
}

export interface SearchCandidate {
  id: string;
  title: string;
  artists: string[];
  album?: string;
  durationMs?: number;
  data?: unknown;
}

export interface LyricsProvider {
  name: ProviderName;
  getLyrics(query: LyricsQuery): Promise<LyricsResult | null>;
}

export interface Env {
  API_TOKEN?: string;
  CACHE_TTL_SECONDS?: string;
  PROVIDER_ORDER?: string;
}
