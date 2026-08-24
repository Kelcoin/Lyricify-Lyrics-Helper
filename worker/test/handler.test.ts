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

  it("enforces API_TOKEN when configured", async () => {
    const handler = createHandler([]);
    const request = new Request("https://example.com/v1/lyrics?title=Song&artist=Artist");
    const response = await handler(request, { API_TOKEN: "secret" }, {} as ExecutionContext);
    expect(response.status).toBe(401);
  });
});
