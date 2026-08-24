import { describe, expect, it, vi } from "vitest";
import { createHandler } from "../src/handler";
import type { LyricsProvider } from "../src/types";

function provider(name: LyricsProvider["name"], result: Awaited<ReturnType<LyricsProvider["getLyrics"]>>): LyricsProvider {
  return { name, getLyrics: vi.fn().mockResolvedValue(result) };
}

describe("Worker API", () => {
  it("serves a static service information page at the root", async () => {
    const response = await createHandler([])(new Request("https://example.com/"), {}, {} as ExecutionContext);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(body).toContain("Lyricify Lyrics API");
    expect(body).toContain("GET /v1/lyrics");
    expect(body).toContain("Authorization: Bearer");
  });

  it("validates required query parameters", async () => {
    const response = await createHandler([])(new Request("https://example.com/v1/lyrics"), {}, {} as ExecutionContext);
    expect(response.status).toBe(400);
  });

  it("falls back in provider order and returns a stable response", async () => {
    const first = provider("lrclib", null);
    const second = provider("netease", {
      provider: "netease",
      providerDisplayName: "Netease Cloud Music",
      providerLyricsId: "42",
      timeSynced: true,
      lines: [{ content: "Line", offsetMs: 1000 }]
    });
    const handler = createHandler([first, second]);
    const request = new Request("https://example.com/v1/lyrics?title=Song&artist=Artist&spotifyId=abc");
    const response = await handler(request, { CACHE_TTL_SECONDS: "0" }, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ provider: "netease", timeSynced: true });
    expect(first.getLyrics).toHaveBeenCalledOnce();
    expect(second.getLyrics).toHaveBeenCalledOnce();
  });

  it("prefers a translated result when a language is requested", async () => {
    const originalOnly = provider("lrclib", {
      provider: "lrclib", providerDisplayName: "LRCLIB", providerLyricsId: "1",
      timeSynced: true, lines: [{ content: "Original", offsetMs: 1000 }]
    });
    const translated = provider("netease", {
      provider: "netease", providerDisplayName: "Netease Cloud Music", providerLyricsId: "2",
      timeSynced: true, lines: [{ content: "Original", offsetMs: 1000 }],
      translation: { languageCode: "zh", lines: ["译文"] }
    });
    const handler = createHandler([originalOnly, translated]);
    const request = new Request(
      "https://example.com/v1/lyrics?title=Song&artist=Artist&language=zh&providers=lrclib,netease"
    );
    const response = await handler(request, { CACHE_TTL_SECONDS: "0" }, {} as ExecutionContext);
    expect(await response.json()).toMatchObject({ provider: "netease", translation: { lines: ["译文"] } });
    expect(originalOnly.getLyrics).toHaveBeenCalledOnce();
    expect(translated.getLyrics).toHaveBeenCalledOnce();
  });

  it("ignores translations in a different language", async () => {
    const wrongLanguage = provider("netease", {
      provider: "netease", providerDisplayName: "Netease Cloud Music", providerLyricsId: "1",
      timeSynced: true, lines: [{ content: "Original", offsetMs: 1000 }],
      translation: { languageCode: "ja", lines: ["別の言語"] }
    });
    const chinese = provider("qqmusic", {
      provider: "qqmusic", providerDisplayName: "QQ Music", providerLyricsId: "2",
      timeSynced: true, lines: [{ content: "Original", offsetMs: 1000 }],
      translation: { languageCode: "zh-CN", lines: ["译文"] }
    });
    const response = await createHandler([wrongLanguage, chinese])(
      new Request("https://example.com/v1/lyrics?title=Song&artist=Artist&language=zh"),
      { CACHE_TTL_SECONDS: "0" }, {} as ExecutionContext
    );
    expect(await response.json()).toMatchObject({ provider: "qqmusic" });
  });

  it("does not cache an original-only fallback for a language request", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("caches", { default: {
      match: vi.fn().mockResolvedValue(undefined), put
    } });
    try {
      const originalOnly = provider("lrclib", {
        provider: "lrclib", providerDisplayName: "LRCLIB", providerLyricsId: "1",
        timeSynced: true, lines: [{ content: "Original", offsetMs: 1000 }]
      });
      const response = await createHandler([originalOnly])(
        new Request("https://example.com/v1/lyrics?title=Song&artist=Artist&language=zh"),
        { CACHE_TTL_SECONDS: "86400" }, { waitUntil: vi.fn() } as unknown as ExecutionContext
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(put).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("bounds all provider lookups to one timeout window", async () => {
    vi.useFakeTimers();
    try {
      const never = new Promise<null>(() => {});
      const slowOne: LyricsProvider = { name: "lrclib", getLyrics: vi.fn(() => never) };
      const slowTwo: LyricsProvider = { name: "netease", getLyrics: vi.fn(() => never) };
      const chinese = provider("qqmusic", {
        provider: "qqmusic", providerDisplayName: "QQ Music", providerLyricsId: "2",
        timeSynced: true, lines: [{ content: "Original", offsetMs: 1000 }],
        translation: { languageCode: "zh", lines: ["译文"] }
      });
      let settled = false;
      const responsePromise = createHandler([slowOne, slowTwo, chinese])(
        new Request("https://example.com/v1/lyrics?title=Song&artist=Artist&language=zh"),
        { CACHE_TTL_SECONDS: "0" }, {} as ExecutionContext
      ).then((response) => { settled = true; return response; });
      await vi.advanceTimersByTimeAsync(8_001);
      expect(settled).toBe(true);
      expect(await responsePromise.then((response) => response.json())).toMatchObject({ provider: "qqmusic" });
    } finally {
      vi.useRealTimers();
    }
  });

    it("enforces API_TOKEN when configured", async () => {
    const handler = createHandler([]);
    const request = new Request("https://example.com/v1/lyrics?title=Song&artist=Artist");
    const response = await handler(request, { API_TOKEN: "secret" }, {} as ExecutionContext);
    expect(response.status).toBe(401);
  });
});
