import { describe, expect, it } from "vitest";
import { alignTranslation, parseLyrics } from "../src/lrc";

describe("parseLyrics", () => {
  it("parses multiple timestamps and sorts line-synced lyrics", () => {
    const result = parseLyrics("[00:10.50][00:12.000]Hello\n[00:05.25]Start\n[ar:Artist]");
    expect(result.timeSynced).toBe(true);
    expect(result.lines).toEqual([
      { content: "Start", offsetMs: 5250 },
      { content: "Hello", offsetMs: 10500 },
      { content: "Hello", offsetMs: 12000 }
    ]);
  });

  it("keeps plain lyrics as unsynced lines", () => {
    expect(parseLyrics("First\n\nSecond")).toEqual({
      timeSynced: false,
      lines: [{ content: "First" }, { content: "Second" }]
    });
  });
});

describe("alignTranslation", () => {
  it("aligns translated lines to matching timestamps", () => {
    const original = parseLyrics("[00:01.00]One\n[00:02.00]Two").lines;
    const translated = parseLyrics("[00:02.00]二\n[00:01.00]一").lines;
    expect(alignTranslation(original, translated)).toEqual(["一", "二"]);
  });
});
