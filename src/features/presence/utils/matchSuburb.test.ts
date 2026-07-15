import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { matchAtlasSuburb, normalizeLabel } from "./matchSuburb.ts";

describe("normalizeLabel", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    assert.equal(normalizeLabel("  Bondi, NSW!! "), "bondi nsw");
  });
});

describe("matchAtlasSuburb", () => {
  it("matches an exact (case/punctuation-insensitive) suburb name", () => {
    const match = matchAtlasSuburb("NSW", "Bondi");
    assert.equal(match?.id, "syd-bondi");
  });

  it("matches when the label has extra words around the suburb name", () => {
    const match = matchAtlasSuburb("NSW", "Bondi, NSW");
    assert.equal(match?.id, "syd-bondi");
  });

  it("never matches across states", () => {
    assert.equal(matchAtlasSuburb("VIC", "Bondi"), null);
  });

  it("returns null for a label with no suburb match", () => {
    assert.equal(matchAtlasSuburb("NSW", "Nowhere Special"), null);
  });

  it("returns null for empty/whitespace-only labels", () => {
    assert.equal(matchAtlasSuburb("NSW", ""), null);
    assert.equal(matchAtlasSuburb("NSW", "   "), null);
    assert.equal(matchAtlasSuburb("NSW", null), null);
    assert.equal(matchAtlasSuburb("NSW", undefined), null);
  });

  it("never matches a suburb name as a partial word (word-boundary safety)", () => {
    // "cbd" is a real NSW suburb name (syd-cbd), but it must not match just
    // because the raw label happens to contain those letters in sequence
    // inside an unrelated single word — only a whole-word occurrence counts.
    assert.equal(matchAtlasSuburb("NSW", "sydcbdarea"), null);
  });

  it("prefers the longest/most-specific match over the first array match — regression for the old first-match-wins bug", () => {
    // QLD's suburb list is, in declaration order: CBD, South Bank,
    // Fortitude Valley, Chermside. A label containing both "cbd" and
    // "fortitude valley" as whole words must resolve to the longer, more
    // specific "Fortitude Valley" — not silently fall back to the generic
    // "CBD" entry just because it appears first in the data array.
    const match = matchAtlasSuburb("QLD", "Fortitude Valley CBD");
    assert.equal(match?.id, "bne-fortitude");
  });

  it("still resolves a lone generic label to its match when there is no more specific candidate", () => {
    const match = matchAtlasSuburb("QLD", "Brisbane CBD");
    assert.equal(match?.id, "bne-cbd");
  });
});
