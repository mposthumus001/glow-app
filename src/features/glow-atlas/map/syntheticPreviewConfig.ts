/**
 * Synthetic Atlas Preview — configuration only. No generation, no MapLibre,
 * no React here; this is the one place that reads the public env flags, so
 * every other module (the generator, GlowMap, GlowAtlas's disclosure text)
 * agrees on the same enabled/count decision without duplicating the parsing.
 *
 * Truthfulness (see syntheticAtlasData.ts's header): this module only ever
 * decides *whether* the preview may render and *how many* ambient points it
 * may generate — it has no access to, and never touches, real presence data.
 */

/** Default point count when the count env var is unset. ~5,000 as requested. */
export const SYNTHETIC_PREVIEW_DEFAULT_COUNT = 5000;

/**
 * Hard ceiling regardless of what the env var requests — keeps a misconfigured
 * deployment from asking the browser to generate/render an unbounded number
 * of WebGL points. 8,000 is comfortably above the requested ~5,000 while
 * staying well within what a single GeoJSON `circle`/`heatmap` source layer
 * renders smoothly (see the perf notes in docs/GlowAtlas.md).
 */
export const SYNTHETIC_PREVIEW_MAX_COUNT = 8000;

/**
 * Calm, explicit disclosure shown outside the map canvas whenever the
 * preview is enabled (item 7). Deliberately avoids "parents awake", "live
 * users", or any other phrase implying real activity — see
 * syntheticAtlasData.ts for the full truthfulness rationale.
 */
export const SYNTHETIC_PREVIEW_DISCLOSURE_TEXT =
  "Atlas preview · Simulated community density";

export type SyntheticPreviewConfig = {
  enabled: boolean;
  /** Always a positive integer clamped to `SYNTHETIC_PREVIEW_MAX_COUNT`. */
  pointCount: number;
};

/**
 * `enabled` is a plain boolean read of `NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW`
 * — no `NODE_ENV` branching. That single rule already satisfies every
 * environment the spec describes: local dev is "configurable" because the
 * developer sets the flag themselves in `.env.local`; preview/beta is
 * "enabled when explicitly set" because that's exactly what setting it to
 * `true` does; production stays "disabled by default" because an unset (or
 * any non-`true`) value always resolves to `false`. No environment ever
 * turns this on implicitly.
 *
 * Parameters are plain strings, not an `env` object, and default to a
 * *direct*, literal `process.env.NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW...`
 * expression — deliberately, not `process.env` indexed dynamically through
 * a variable. Next.js/Turbopack only statically inlines `NEXT_PUBLIC_*`
 * values into the client bundle when it can see that exact literal
 * `process.env.NEXT_PUBLIC_X` text at the call site; reading through an
 * `env: NodeJS.ProcessEnv = process.env` parameter (this file's first draft)
 * compiles correctly server-side but silently resolves to `undefined` in
 * the browser bundle, since indexing `env.NEXT_PUBLIC_X` at runtime is
 * invisible to that static analysis — see GlowMap.tsx's `PMTILES_URL`
 * constant for the same established, working pattern this now matches.
 */
export function resolveSyntheticPreviewConfig(
  flagValue: string | undefined = process.env.NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW,
  countValue: string | undefined = process.env.NEXT_PUBLIC_ATLAS_SYNTHETIC_PREVIEW_COUNT,
): SyntheticPreviewConfig {
  const flag = (flagValue ?? "").trim().toLowerCase();
  const enabled = flag === "true" || flag === "1";

  const rawCount = Number(countValue);
  const requestedCount =
    Number.isFinite(rawCount) && rawCount > 0
      ? Math.floor(rawCount)
      : SYNTHETIC_PREVIEW_DEFAULT_COUNT;

  return {
    enabled,
    pointCount: Math.min(requestedCount, SYNTHETIC_PREVIEW_MAX_COUNT),
  };
}
