import { pickBestCandidate } from "../match";
import type { LyricsProvider, LyricsQuery, SearchCandidate } from "../types";
import { browserHeaders, decodeBase64Utf8, mapRawLyrics, requireOk } from "./shared";

interface QQSong {
  id: string | number;
  mid: string;
  title?: string;
  songname?: string;
  interval?: number;
  singer?: Array<{ name: string }>;
  album?: { title?: string; name?: string };
}

interface QQSearchResponse {
  req_1?: { data?: { body?: { song?: { list?: QQSong[] } } } };
}

interface QQLegacySearchResponse {
  data?: { song?: { list?: QQSong[] } };
}

interface QQLyricsResponse { lyric?: string; trans?: string }
interface QQLyricsEnvelope { req_1?: { data?: QQLyricsResponse } }
type QQCandidate = SearchCandidate & { data: QQSong };

function stripParenthetical(value: string): string {
  return value.replace(/\s*[（(][^）)]*[）)]/g, "").trim();
}

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
    let songs = search.req_1?.data?.body?.song?.list ?? [];
    if (songs.length === 0) {
      const fallbackUrl = new URL("https://c.y.qq.com/soso/fcgi-bin/client_search_cp");
      fallbackUrl.search = new URLSearchParams({
        format: "json", platform: "yqq.json", ct: "24", needNewCode: "1",
        w: `${query.title} ${query.artist}`, cur_page: "1", sin: "0", ein: "19"
      }).toString();
      const fallbackResponse = await requireOk(await this.fetcher(fallbackUrl, { headers }));
      const fallback = await fallbackResponse.json<QQLegacySearchResponse>();
      songs = fallback.data?.song?.list ?? [];
    }
    const candidates: QQCandidate[] = songs.map((song) => ({
      id: song.mid || String(song.id),
      title: stripParenthetical(song.title ?? song.songname ?? ""),
      artists: (song.singer ?? []).map((artist) => stripParenthetical(artist.name)),
      album: song.album?.title ?? song.album?.name,
      durationMs: song.interval ? song.interval * 1000 : undefined,
      data: song
    }));
    if (candidates.length === 0) throw new Error("QQ search returned no candidates");
    const match = pickBestCandidate(query, candidates);
    if (!match) throw new Error("QQ search candidate did not meet match threshold");

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
    let lyrics = envelope.req_1?.data;
    if (!lyrics?.lyric) {
      const legacyUrl = new URL("https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg");
      legacyUrl.search = new URLSearchParams({
        callback: "MusicJsonCallback_lrc", songmid: match.data.mid,
        format: "jsonp", platform: "yqq", needNewCode: "0"
      }).toString();
      const legacyResponse = await requireOk(await this.fetcher(legacyUrl, { headers }));
      const jsonp = await legacyResponse.text();
      const json = jsonp.match(/^[^(]*\((.*)\)\s*;?$/s)?.[1] ?? jsonp;
      lyrics = JSON.parse(json) as QQLyricsResponse;
    }
    if (!lyrics?.lyric) throw new Error("QQ lyric response missing lyric");
    const result = mapRawLyrics(
      this.name,
      "QQ Music",
      match.id,
      decodeBase64Utf8(lyrics.lyric),
      decodeBase64Utf8(lyrics.trans),
      query.language
    );
    if (!result) throw new Error("QQ lyric response has no synced lines");
    return result;
  }
}
