import { pickBestCandidate } from "../match";
import type { LyricsProvider, LyricsQuery, SearchCandidate } from "../types";
import { browserHeaders, mapRawLyrics, requireOk } from "./shared";

interface LrclibTrack {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

type LrclibCandidate = SearchCandidate & { data: LrclibTrack };

export class LrclibProvider implements LyricsProvider {
  readonly name = "lrclib" as const;
  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args)) {}

  async getLyrics(query: LyricsQuery) {
    const url = new URL("https://lrclib.net/api/search");
    url.searchParams.set("track_name", query.title);
    url.searchParams.set("artist_name", query.artist);
    if (query.album) url.searchParams.set("album_name", query.album);
    if (query.durationMs) url.searchParams.set("duration", String(query.durationMs / 1000));

    const response = await requireOk(await this.fetcher(url, { headers: browserHeaders }));
    const tracks = await response.json<LrclibTrack[]>();
    const candidates: LrclibCandidate[] = tracks.map((track) => ({
      id: String(track.id),
      title: track.trackName,
      artists: track.artistName.split(/,|&|feat\.?|ft\.?/i).map((value) => value.trim()),
      album: track.albumName,
      durationMs: track.duration ? Math.round(track.duration * 1000) : undefined,
      data: track
    }));
    const match = pickBestCandidate(query, candidates);
    if (!match || match.data.instrumental) return null;
    return mapRawLyrics(
      this.name,
      "LRCLIB",
      match.id,
      match.data.syncedLyrics || match.data.plainLyrics
    );
  }
}
