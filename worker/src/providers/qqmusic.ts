import { pickBestCandidate } from "../match";
import type { LyricsProvider, LyricsQuery, SearchCandidate } from "../types";
import { browserHeaders, decodeBase64Utf8, mapRawLyrics, requireOk } from "./shared";

interface QQSong {
  id: string | number;
  mid: string;
  title: string;
  interval?: number;
  singer?: Array<{ name: string }>;
  album?: { title?: string; name?: string };
}

interface QQSearchResponse {
  req_1?: { data?: { body?: { song?: { list?: QQSong[] } } } };
}

interface QQLyricsResponse { lyric?: string; trans?: string }
interface QQLyricsEnvelope { req_1?: { data?: QQLyricsResponse } }
type QQCandidate = SearchCandidate & { data: QQSong };

export class QQMusicProvider implements LyricsProvider {
  readonly name = "qqmusic" as const;
  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args)) {}

  async getLyrics(query: LyricsQuery) {
    const body = {
      req_1: {
        method: "DoSearchForQQMusicDesktop",
        module: "music.search.SearchCgiService",
        param: { num_per_page: "20", page_num: "1", query: `${query.title} ${query.artist}`, search_type: 0 }
      }
    };
    const headers = { ...browserHeaders, "Content-Type": "application/json", Referer: "https://c.y.qq.com/" };
    const searchResponse = await requireOk(await this.fetcher("https://u.y.qq.com/cgi-bin/musicu.fcg", {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    }));
    const search = await searchResponse.json<QQSearchResponse>();
    const candidates: QQCandidate[] = (search.req_1?.data?.body?.song?.list ?? []).map((song) => ({
      id: song.mid || String(song.id),
      title: song.title,
      artists: (song.singer ?? []).map((artist) => artist.name),
      album: song.album?.title ?? song.album?.name,
      durationMs: song.interval ? song.interval * 1000 : undefined,
      data: song
    }));
    const match = pickBestCandidate(query, candidates);
    if (!match) return null;

    const lyricUrl = new URL("https://u.y.qq.com/cgi-bin/musicu.fcg");
    const lyricResponse = await requireOk(await this.fetcher(lyricUrl, {
      method: "POST",
      headers: { ...headers, Referer: "https://y.qq.com/" },
      body: JSON.stringify({
        req_1: {
          module: "music.musichallSong.PlayLyricInfo",
          method: "GetPlayLyricInfo",
          param: { songmid: match.data.mid, songtype: 0 }
        }
      })
    }));
    const envelope = await lyricResponse.json<QQLyricsEnvelope>();
    const lyrics = envelope.req_1?.data;
    if (!lyrics) return null;
    return mapRawLyrics(
      this.name,
      "QQ Music",
      match.id,
      decodeBase64Utf8(lyrics.lyric),
      decodeBase64Utf8(lyrics.trans),
      query.language
    );
  }
}
