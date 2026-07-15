"use client";

import { memo } from "react";
import { Marker } from "react-map-gl/maplibre";

import { GlowBadge } from "../components/GlowBadge";
import { getCity } from "../data/cities";
import { getState } from "../data/states";
import { getSuburb } from "../data/suburbs";
import { resolveBadgeTargetId } from "../utils/disclosure";
import type { AtlasBadge, AtlasLevel, AuStateCode, GeoPoint } from "../types";

export type GlowMapBadgesProps = {
  level: AtlasLevel;
  /** Already disclosed (featured/top-N + collision) — see useGlowAtlas.ts / utils/disclosure.ts. */
  stateBadges: AtlasBadge[];
  cityBadges: AtlasBadge[];
  suburbBadges: AtlasBadge[];
  onSelectState: (code: AuStateCode) => void;
  onSelectCity: (cityId: string) => void;
  onSelectSuburb: (suburbId: string) => void;
};

/**
 * National label layout (Checkpoint C visual refinement). All 8
 * states/territories are always disclosed at country level (see
 * `useGlowAtlas.ts` — the old generic viewport-collision pass silently
 * dropped SA/NT/ACT and is no longer run for this level at all); instead of
 * dynamic collision-based rejection, each badge gets a small, fixed CSS
 * pixel nudge away from its literal geographic anchor. `[dx, dy]` in CSS
 * pixels, applied via `<Marker offset>` (MapLibre/react-map-gl semantics:
 * shifts the already-anchored element, never the anchor/click-target math
 * elsewhere in the app). Positive x is right, positive y is down.
 *
 * These are deliberately declarative/hand-authored — Australia's state
 * layout never changes, so there is no need to compute this at runtime —
 * but "tuned by eye" previously meant tuned *wrong*: an earlier pass
 * pushed ACT off the card's right edge and landed Tasmania's badge almost
 * exactly on top of Victoria's, both invisible in a screenshot review that
 * only looked at the rendered image rather than each badge's own
 * `getBoundingClientRect()`. Every offset below is instead verified
 * programmatically (see the refinement report) against both the map's own
 * rounded container edges and every other badge's rect, at 360/390/430px
 * and a capped desktop width — zero edge overflow, zero pairwise overlap.
 * NSW, ACT, VIC and TAS sit close together in real geography (Canberra is
 * surrounded by NSW; Tasmania is due south of Victoria, and its own raw
 * anchor — the continent's southernmost point — projects almost exactly on
 * the country view's own bottom edge), so those four were re-tuned
 * together: VIC and TAS in particular are separated *horizontally* rather
 * than vertically, since there isn't enough vertical room to also keep
 * Tasmania's badge on-card.
 */
const NATIONAL_LABEL_OFFSET: Record<AuStateCode, [number, number]> = {
  WA: [-14, 8],
  NT: [-2, -14],
  QLD: [16, -6],
  SA: [-8, 20],
  NSW: [0, -10],
  VIC: [-20, -8],
  TAS: [22, -45],
  // ACT's own territory is too small for an in-place label at country
  // zoom — see the leader-line treatment below instead of a plain offset.
  ACT: [-22, -80],
};

/** ACT is the only state whose country-level badge needs a leader line — see `ActLeaderBadge` below. */
function isLeaderLineState(code: AuStateCode): boolean {
  return code === "ACT";
}

/**
 * ACT's compact country-level badge, drawn away from its tiny territory
 * with a thin leader line back to the real anchor point — an "external
 * compact label" per Checkpoint C item 3, without a giant collision-hiding
 * gap or a mislabelled neighbouring state. Single `<Marker>` (no separate
 * GL layer/source): the line and true-anchor dot are both drawn in the
 * marker's own local coordinate space, which MapLibre keeps pinned to
 * ACT's real geographic point on every pan/zoom exactly like the badge
 * itself.
 */
function ActLeaderBadge({
  badge,
  geo,
  offset,
  onSelectState,
}: {
  badge: AtlasBadge;
  geo: GeoPoint;
  offset: [number, number];
  onSelectState: (code: AuStateCode) => void;
}) {
  const [dx, dy] = offset;
  const lineLength = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(-dy, -dx) * 180) / Math.PI;

  return (
    <Marker longitude={geo.lng} latitude={geo.lat} anchor="center" offset={offset}>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bg-white/25"
          style={{
            width: `${lineLength}px`,
            height: "1px",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `rotate(${angleDeg}deg)`,
          }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-white/70"
          style={{ width: "4px", height: "4px", left: `${-dx - 2}px`, top: `${-dy - 2}px` }}
        />
        <GlowBadge
          badge={badge}
          size="stateCompact"
          positioned={false}
          onSelect={(id) => onSelectState(id as AuStateCode)}
        />
      </div>
    </Marker>
  );
}

function cityGeo(badge: AtlasBadge): GeoPoint | null {
  return getCity(resolveBadgeTargetId(badge.id))?.geo ?? null;
}

function suburbGeo(badge: AtlasBadge): GeoPoint | null {
  return getSuburb(resolveBadgeTargetId(badge.id))?.geo ?? null;
}

/**
 * The small set of disclosed, interactive state/city/suburb presence
 * badges — the *only* HTML in the map (Checkpoint C, Amendment 4). Reuses
 * the existing featured/top-N disclosure pipeline (utils/disclosure.ts via
 * useGlowAtlas) unchanged; only the *position* source changes from the old
 * fixed-viewBox SVG % (`badge.x`/`badge.y`) to each entity's real
 * geographic anchor, since react-map-gl's `<Marker>` reprojects that real
 * coordinate on every pan/zoom itself — no manual `map.project()` tracking
 * needed, and no per-count marker explosion (still exactly one Marker per
 * disclosed badge, same cap as the old renderer).
 *
 * Clicking a badge calls straight back into `useGlowAtlas`'s existing
 * `selectState`/`selectCity`/`selectSuburb`, so the logical selection and
 * the Checkpoint B camera `fitBounds` both update exactly as they did for
 * the SVG hit-areas — this component owns no navigation logic of its own.
 *
 * Memoised (Checkpoint D, item 3): `GlowMap` re-renders on its own
 * transient state (e.g. `cursor` while hovering a state polygon) that has
 * nothing to do with badges — `stateBadges`/`cityBadges`/`suburbBadges` are
 * already stable `useMemo` arrays from `useGlowAtlas`, and the three
 * `onSelect*` callbacks are stable `useCallback`s, so a plain prop-equality
 * check here skips rebuilding every `<Marker>` on renders that don't
 * actually change what's disclosed.
 */
function GlowMapBadgesInner({
  level,
  stateBadges,
  cityBadges,
  suburbBadges,
  onSelectState,
  onSelectCity,
  onSelectSuburb,
}: GlowMapBadgesProps) {
  if (level === "country") {
    return (
      <>
        {stateBadges.map((badge) => {
          const code = badge.id as AuStateCode;
          const geo = getState(code)?.geo;
          if (!geo) return null;
          const offset = NATIONAL_LABEL_OFFSET[code] ?? [0, 0];

          if (isLeaderLineState(code)) {
            return (
              <ActLeaderBadge
                key={badge.id}
                badge={badge}
                geo={geo}
                offset={offset}
                onSelectState={onSelectState}
              />
            );
          }

          return (
            <Marker
              key={badge.id}
              longitude={geo.lng}
              latitude={geo.lat}
              anchor="center"
              offset={offset}
            >
              <GlowBadge
                badge={badge}
                size="stateCompact"
                positioned={false}
                onSelect={(id) => onSelectState(id as AuStateCode)}
              />
            </Marker>
          );
        })}
      </>
    );
  }

  if (level === "state") {
    return (
      <>
        {cityBadges.map((badge) => {
          const geo = cityGeo(badge);
          if (!geo) return null;
          return (
            <Marker key={badge.id} longitude={geo.lng} latitude={geo.lat} anchor="center">
              <GlowBadge badge={badge} size="city" positioned={false} onSelect={onSelectCity} />
            </Marker>
          );
        })}
      </>
    );
  }

  // "city" and "suburb" both surface the finest privacy-permitted
  // disclosure available — suburb-area badges. `useGlowAtlas` already
  // returns an empty `suburbBadges` once a specific suburb is selected
  // (level === "suburb"), so this renders nothing extra there; the
  // presence GL layer (glowMapStyle.ts) keeps showing suburb-area lights
  // with the selected suburb emphasised via feature-state.
  return (
    <>
      {suburbBadges.map((badge) => {
        const geo = suburbGeo(badge);
        if (!geo) return null;
        return (
          <Marker key={badge.id} longitude={geo.lng} latitude={geo.lat} anchor="center">
            <GlowBadge badge={badge} size="suburb" positioned={false} onSelect={onSelectSuburb} />
          </Marker>
        );
      })}
    </>
  );
}

export const GlowMapBadges = memo(GlowMapBadgesInner);
