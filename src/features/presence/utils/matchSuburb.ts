import { atlasSuburbs } from "@/features/glow-atlas/data/suburbs";
import type { AtlasSuburb, AuStateCode } from "@/features/glow-atlas/types";

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Map free-text suburb_area → Atlas suburb id.
 * Exact GPS is never used — name + state only.
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

  const partial = inState.find((s) => {
    const name = normalizeLabel(s.name);
    return needle.includes(name) || name.includes(needle);
  });

  return partial ?? null;
}
