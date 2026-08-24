import { pickBestCandidate } from "../match";
import type { LyricsProvider, LyricsQuery, SearchCandidate } from "../types";
import { browserHeaders, mapRawLyrics, requireOk } from "./shared";

interface NeteaseSong {
  id: number | string;
  name: string;
  artists?: Array<{ name: string }>;
  ar?: Array<{ name: string }>;
  duration?: number;
  dt?: number;
  album?: { name: string };
  al?: { name: string };
}

interface NeteaseSearchResponse { result?: { songs?: NeteaseSong[] } }
interface NeteaseLyricsResponse {
  nolyric?: boolean;
  lrc?: { lyric?: string };
  tlyric?: { lyric?: string };
}
type NeteaseCandidate = SearchCandidate & { data: NeteaseSong };

export class NeteaseProvider implements LyricsProvider {
  readonly name = "netease" as const;
  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args)) {}

  async getLyrics(query: LyricsQuery) {
    const searchUrl = new URL("https://music.163.com/api/search/get/web");
    searchUrl.searchParams.set("s", `${query.title} ${query.artist}`);
    searchUrl.searchParams.set("type", "1");
    searchUrl.searchParams.set("offset", "0");
    searchUrl.searchParams.set("limit", "20");
    const headers = { ...browserHeaders, Referer: "https://music.163.com/" };
    const searchResponse = await requireOk(await this.fetcher(searchUrl, { headers }));
    const search = await searchResponse.json<NeteaseSearchResponse>();
    const candidates: NeteaseCandidate[] = (search.result?.songs ?? []).map((song) => ({
      id: String(song.id),
      title: song.name,
      artists: (song.artists ?? song.ar ?? []).map((artist) => artist.name),
      album: song.album?.name ?? song.al?.name,
      durationMs: song.duration ?? song.dt,
      data: song
    }));
    const match = pickBestCandidate(query, candidates);
    if (!match) return null;

    const lyricUrl = new URL("https://music.163.com/api/song/lyric");
    lyricUrl.searchParams.set("id", match.id);
    lyricUrl.searchParams.set("lv", "-1");
    lyricUrl.searchParams.set("kv", "-1");
    lyricUrl.searchParams.set("tv", "-1");
    const lyricResponse = await requireOk(await this.fetcher(lyricUrl, { headers }));
    const lyrics = await lyricResponse.json<NeteaseLyricsResponse>();
    if (lyrics.nolyric) return null;
    return mapRawLyrics(this.name, "Netease Cloud Music", match.id, lyrics.lrc?.lyric, lyrics.tlyric?.lyric, query.language);
  }
}
