import { atlasSuburbs } from "../../glow-atlas/data/suburbs.ts";
import type { AtlasSuburb, AuStateCode } from "../../glow-atlas/types.ts";

export function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when `needle` appears inside `haystack` as a run of whole words,
 * never as a partial-word substring — e.g. "bay" must not match inside
 * "bayswater".
 */
function containsWordSequence(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Map free-text suburb_area → Atlas suburb id.
 * Exact GPS is never used — name + state only.
 *
 * An exact normalized match wins outright. Otherwise every suburb whose
 * normalized name is a whole-word match against the label (in either
 * direction) is a candidate, and the longest normalized name wins: the
 * longest match is the most specific one, so a short, generic suburb name
 * can no longer silently shadow a longer, more precise one just because it
 * happens to come first in the data array (the previous `find()`-based
 * first-match-wins behaviour).
 */
export function matchAtlasSuburb(
  state: AuStateCode,
  suburbArea: string | null | undefined,
): AtlasSuburb | null {
  if (!suburbArea) return null;

  const needle = normalizeLabel(suburbArea);
  if (!needle) return null;

  const inState = atlasSuburbs.filter((s) => s.state === state);

  const exact = inState.find((s) => normalizeLabel(s.name) === needle);
  if (exact) return exact;

  let best: AtlasSuburb | null = null;
  let bestNameLength = -1;

  for (const suburb of inState) {
    const name = normalizeLabel(suburb.name);
    const isMatch =
      containsWordSequence(needle, name) || containsWordSequence(name, needle);
    if (!isMatch) continue;

    if (name.length > bestNameLength) {
      best = suburb;
      bestNameLength = name.length;
    }
  }

  return best;
}
