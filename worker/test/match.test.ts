import { describe, expect, it } from "vitest";
import { pickBestCandidate } from "../src/match";

describe("pickBestCandidate", () => {
  const query = { title: "Song (feat. Guest)", artist: "Main Artist", durationMs: 200_000 };

  it("prefers normalized title, artist, and duration matches", () => {
    const result = pickBestCandidate(query, [
      { id: "wrong", title: "Different", artists: ["Main Artist"], durationMs: 200_000 },
      { id: "right", title: "Song", artists: ["Main Artist"], durationMs: 201_000 }
    ]);
    expect(result?.id).toBe("right");
  });

  it("rejects unrelated candidates", () => {
    expect(pickBestCandidate(query, [
      { id: "wrong", title: "Other", artists: ["Nobody"], durationMs: 50_000 }
    ])).toBeNull();
  });
});
