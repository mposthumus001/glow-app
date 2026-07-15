/**
 * The PMTiles basemap is supporting geographic context only — the local
 * Glow states GeoJSON (see ../data/geo/) always renders regardless of this
 * status. This helper decides whether to surface a subtle "simplified map"
 * line, never a blank canvas or an alarming error state.
 */

export type BasemapStatus = "ok" | "context-unavailable";

export type BasemapStatusInput = {
  /** The configured PMTiles URL, or null/undefined when unset. */
  pmtilesUrl: string | null | undefined;
  /** True once the PMTiles source/style has failed to load. */
  loadFailed: boolean;
};

export type BasemapStatusResult = {
  status: BasemapStatus;
  /** Subtle, non-alarming copy — null when the PMTiles context layer is fine. */
  message: string | null;
};

const FALLBACK_MESSAGE = "Showing simplified map";

export function resolveBasemapStatus({
  pmtilesUrl,
  loadFailed,
}: BasemapStatusInput): BasemapStatusResult {
  const configured = Boolean(pmtilesUrl && pmtilesUrl.trim());

  if (!configured || loadFailed) {
    return { status: "context-unavailable", message: FALLBACK_MESSAGE };
  }

  return { status: "ok", message: null };
}
