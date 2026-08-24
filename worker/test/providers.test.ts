import { describe, expect, it, vi } from "vitest";
import { LrclibProvider } from "../src/providers/lrclib";
import { NeteaseProvider } from "../src/providers/netease";
import { QQMusicProvider } from "../src/providers/qqmusic";

const query = { title: "Song", artist: "Artist", durationMs: 180_000 };

describe("provider adapters", () => {
  const base64 = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)));

  it("maps LRCLIB line lyrics", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 1, trackName: "Song", artistName: "Artist", albumName: "Album",
      duration: 180, syncedLyrics: "[00:01.00]Line", plainLyrics: "Line", instrumental: false
    }]))) as typeof fetch;
    const result = await new LrclibProvider(fetcher).getLyrics(query);
    expect(result?.lines).toEqual([{ content: "Line", offsetMs: 1000 }]);
  });

  it("rejects unsynced lyrics", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: 1, trackName: "Song", artistName: "Artist", duration: 180,
      syncedLyrics: null, plainLyrics: "First\nSecond", instrumental: false
    }]))) as typeof fetch;
    const result = await new LrclibProvider(fetcher).getLyrics(query);
    expect(result).toBeNull();
  });

  it("maps Netease lyrics and translation", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { songs: [{
        id: 2, name: "Song", artists: [{ name: "Artist" }], duration: 180000,
        album: { name: "Album" }
      }] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        lrc: { lyric: "[00:01.00]Line" }, tlyric: { lyric: "[00:01.00]译文" }
      }))) as typeof fetch;
    const result = await new NeteaseProvider(fetcher).getLyrics(query);
    expect(result?.translation?.lines).toEqual(["译文"]);
  });

  it("decodes QQ Music base64 lyrics", async () => {
    const search = { req_1: { data: { body: { song: { list: [{
      id: "3", mid: "mid", title: "Song", interval: 180,
      singer: [{ name: "Artist" }], album: { title: "Album" }
    }] } } } } };
    const lyric = { code: 0, lyric: base64("[00:01.00]Line"), trans: base64("[00:01.00]译文") };
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(search)))
      .mockResolvedValueOnce(new Response(`MusicJsonCallback_lrc(${JSON.stringify(lyric)})`)) as typeof fetch;
    const result = await new QQMusicProvider(fetcher).getLyrics(query);
    expect(result?.providerLyricsId).toBe("mid");
    expect(result?.lines[0]).toEqual({ content: "Line", offsetMs: 1000 });
  });
});
