import { pickBestCandidate } from "../match";
import type { LyricsProvider, LyricsQuery, SearchCandidate } from "../types";
import { browserHeaders, decodeBase64Utf8, mapRawLyrics, requireOk } from "./shared";

interface KGTrack { hash: string; songname: string; singername?: string; album_name?: string; duration?: number }
interface KGSearch { data?: { info?: KGTrack[] } }
interface KGCandidate extends SearchCandidate { data: KGTrack }
interface KGLyricCandidate { id: string; accesskey: string }
interface KGLyricSearch { candidates?: KGLyricCandidate[] }
interface KGDownload { content?: string; lyrics?: string }

export class KugouProvider implements LyricsProvider {
  readonly name = "kugou" as const;
  constructor(private readonly fetcher: typeof fetch = (...args) => fetch(...args)) {}

  async getLyrics(query: LyricsQuery) {
    const headers = { ...browserHeaders, Referer: "https://www.kugou.com/" };
    const searchUrl = new URL("https://mobileservice.kugou.com/api/v3/search/song");
    searchUrl.search = new URLSearchParams({ keyword: `${query.title} ${query.artist}`, page: "1", pagesize: "20" }).toString();
    const search = await (await requireOk(await this.fetcher(searchUrl, { headers }))).json<KGSearch>();
    const candidates: KGCandidate[] = (search.data?.info ?? []).map((track) => ({
      id: track.hash,
      title: track.songname,
      artists: (track.singername ?? "").split(/,|&| feat\.? /i).map((value) => value.trim()),
      album: track.album_name,
      durationMs: track.duration ? track.duration * 1000 : undefined,
      data: track
    }));
    const match = pickBestCandidate(query, candidates);
    if (!match) return null;

    const lyricSearchUrl = new URL("https://lyrics.kugou.com/search");
    lyricSearchUrl.search = new URLSearchParams({
      ver: "1", man: "yes", client: "pc", keyword: `${query.title} ${query.artist}`,
      duration: String(Math.round((match.data.duration ?? 0) * 1000)), hash: match.id
    }).toString();
    const lyricSearch = await (await requireOk(await this.fetcher(lyricSearchUrl, { headers }))).json<KGLyricSearch>();
    const candidate = lyricSearch.candidates?.find((item) => item.accesskey);
    if (!candidate) return null;

    const downloadUrl = new URL("https://lyrics.kugou.com/download");
    downloadUrl.search = new URLSearchParams({
      ver: "1", client: "pc", fmt: "lrc", id: candidate.id, accesskey: candidate.accesskey, language: "english"
    }).toString();
    const downloaded = await (await requireOk(await this.fetcher(downloadUrl, { headers }))).json<KGDownload>();
    const rawLyrics = decodeBase64Utf8(downloaded.content ?? downloaded.lyrics);
    return mapRawLyrics(this.name, "Kugou Music", match.id, rawLyrics, undefined, query.language);
  }
}
