import type { AtlasBadge } from "../types.ts";

export const MAX_CITY_BADGES = 5;
export const MAX_SUBURB_BADGES = 4;

/** Map-space distance (%) under which cities merge into one area badge */
export const CITY_CLUSTER_DISTANCE = 2.8;

/**
 * Approximate badge footprint in viewport % for collision checks, derived
 * from the actual pill sizes in `GlowBadge.tsx` (~92px city/state pills,
 * ~88px suburb pills on a ~360px-wide map card — see `sizeStyles` there).
 * `minDx`/`minDy` are derived FROM the footprint (not independent magic
 * numbers) so two kept badges are geometrically guaranteed not to overlap.
 */
export const BADGE_COLLISION = {
  city: { halfWidth: 12.8, halfHeight: 4.2 },
  suburb: { halfWidth: 12.2, halfHeight: 4.2 },
  /** Extra breathing room over the raw non-overlap distance */
  paddingFactor: 1.1,
} as const;

function collisionThresholds(footprint: { halfWidth: number; halfHeight: number }): {
  minDx: number;
  minDy: number;
} {
  return {
    minDx: footprint.halfWidth * 2 * BADGE_COLLISION.paddingFactor,
    minDy: footprint.halfHeight * 2 * BADGE_COLLISION.paddingFactor,
  };
}

/**
 * Top-chrome exclusion — keep badges clear of the breadcrumb / back button
 * row at the top of the card, which the projection/inset math previously
 * didn't know about.
 */
export const TOP_CHROME_EXCLUSION_Y = 16;

export type DisclosureResult = {
  /** Badges to render as glass pills */
  badges: AtlasBadge[];
  /** Map-space anchors that should only appear as unlabeled lights */
  lightOnly: AtlasBadge[];
};

function sortByCountDesc(badges: AtlasBadge[]): AtlasBadge[] {
  return [...badges].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

function distance(a: AtlasBadge, b: AtlasBadge): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Merge nearby badges into a single “{Name} area” cluster.
 * Highest-count badge becomes the label seed; counts are summed.
 * Absorbed members (non-seed) are returned for light-only rendering.
 */
export function clusterNearbyBadges(
  badges: AtlasBadge[],
  maxDistance: number = CITY_CLUSTER_DISTANCE,
): { badges: AtlasBadge[]; absorbed: AtlasBadge[] } {
  const sorted = sortByCountDesc(badges);
  const used = new Set<string>();
  const clusters: AtlasBadge[] = [];
  const absorbed: AtlasBadge[] = [];

  for (const seed of sorted) {
    if (used.has(seed.id)) continue;

    const members = [seed];
    used.add(seed.id);

    for (const other of sorted) {
      if (used.has(other.id)) continue;
      if (distance(seed, other) <= maxDistance) {
        members.push(other);
        used.add(other.id);
      }
    }

    if (members.length === 1) {
      clusters.push(seed);
      continue;
    }

    const total = members.reduce((sum, m) => sum + m.count, 0);
    const cx =
      members.reduce((sum, m) => sum + m.x * m.count, 0) / Math.max(1, total);
    const cy =
      members.reduce((sum, m) => sum + m.y * m.count, 0) / Math.max(1, total);

    clusters.push({
      id: `cluster-${seed.id}`,
      label: `${seed.label} area`,
      count: total,
      x: cx,
      y: cy,
    });

    for (const member of members) {
      if (member.id !== seed.id) absorbed.push(member);
    }
  }

  return { badges: clusters, absorbed };
}

/**
 * Derive a preferred-id order directly from each badge's own
 * `featured`/`featuredPriority` data (see `cities.ts`/`suburbs.ts`), instead
 * of a hardcoded per-state allowlist. Any state/city can opt in by setting
 * `featured: true` on its data — no new code branch required.
 */
export function deriveFeaturedIds(badges: AtlasBadge[]): string[] {
  return badges
    .filter((b) => b.featured)
    .sort((a, b) => {
      const pa = a.featuredPriority ?? Number.MAX_SAFE_INTEGER;
      const pb = b.featuredPriority ?? Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
      return b.count - a.count;
    })
    .map((b) => b.id);
}

/**
 * Prefer an allowlist (in order), then fill remaining slots by count.
 */
export function pickPreferredThenTop(
  badges: AtlasBadge[],
  preferredIds: readonly string[],
  max: number,
): DisclosureResult {
  const byId = new Map(badges.map((b) => [b.id, b]));
  const selected: AtlasBadge[] = [];
  const selectedIds = new Set<string>();

  for (const id of preferredIds) {
    if (selected.length >= max) break;
    const badge = byId.get(id);
    if (badge) {
      selected.push(badge);
      selectedIds.add(id);
    }
  }

  const remaining = sortByCountDesc(
    badges.filter((b) => !selectedIds.has(b.id)),
  );

  for (const badge of remaining) {
    if (selected.length >= max) break;
    selected.push(badge);
    selectedIds.add(badge.id);
  }

  return {
    badges: selected,
    lightOnly: badges.filter((b) => !selectedIds.has(b.id)),
  };
}

/**
 * State-level city disclosure:
 * featured-then-top N → cluster nearby → collision filter.
 * `preferredIds` can still be passed explicitly (e.g. for tests); when
 * omitted it is derived from each badge's own `featured` data.
 */
export function discloseCityBadges(
  badges: AtlasBadge[],
  options: {
    max?: number;
    preferredIds?: readonly string[];
    clusterDistance?: number;
  } = {},
): DisclosureResult {
  const max = options.max ?? MAX_CITY_BADGES;
  const preferred = options.preferredIds ?? deriveFeaturedIds(badges);

  const picked = preferred.length
    ? pickPreferredThenTop(badges, preferred, max)
    : (() => {
        const sorted = sortByCountDesc(badges);
        return {
          badges: sorted.slice(0, max),
          lightOnly: sorted.slice(max),
        };
      })();

  const { badges: clustered, absorbed } = clusterNearbyBadges(
    picked.badges,
    options.clusterDistance ?? CITY_CLUSTER_DISTANCE,
  );

  // Cap again after clustering (clusters can reduce count)
  const capped = sortByCountDesc(clustered).slice(0, max);
  const cappedIds = new Set(capped.map((b) => b.id));
  const clusterRejected = clustered.filter((b) => !cappedIds.has(b.id));

  return {
    badges: capped,
    lightOnly: [...picked.lightOnly, ...absorbed, ...clusterRejected],
  };
}

/**
 * City-level suburb disclosure:
 * featured-then-top N → collision filter (no area clustering).
 */
export function discloseSuburbBadges(
  badges: AtlasBadge[],
  options: {
    max?: number;
    preferredIds?: readonly string[];
  } = {},
): DisclosureResult {
  const max = options.max ?? MAX_SUBURB_BADGES;
  const preferred = options.preferredIds ?? deriveFeaturedIds(badges);

  if (preferred.length) {
    return pickPreferredThenTop(badges, preferred, max);
  }

  const sorted = sortByCountDesc(badges);
  return {
    badges: sorted.slice(0, max),
    lightOnly: sorted.slice(max),
  };
}

/**
 * Country-level state disclosure: every awake state is shown — there are at
 * most eight, a fixed set of real geographic anchors, never a dynamic
 * top-N problem the way city/suburb disclosure is. Unlike
 * `discloseCityBadges`/`discloseSuburbBadges`, this never runs
 * `applyViewportCollision` — an active state/territory must never be
 * silently demoted to an unlabelled light. The MapLibre renderer instead
 * resolves any visual overlap with a national, declarative per-state pixel
 * nudge (+ an ACT leader line) at render time — see `NATIONAL_LABEL_OFFSET`
 * in `map/GlowMapBadges.tsx`.
 */
export function discloseStateBadges(badges: AtlasBadge[]): DisclosureResult {
  return { badges, lightOnly: [] };
}

/**
 * Collision check using pre-projected viewport coordinates, returning
 * original map-space badges for kept / rejected sets. `footprint` selects
 * the real pill size for this badge tier so the derived minDx/minDy
 * actually reflect what's rendered — replaces the old independent
 * `minDx`/`minDy` magic numbers.
 */
export function applyViewportCollision(
  badges: AtlasBadge[],
  project: (badge: AtlasBadge) => { x: number; y: number },
  opts?: {
    minDx?: number;
    minDy?: number;
    footprint?: { halfWidth: number; halfHeight: number };
  },
): DisclosureResult {
  const derived = collisionThresholds(opts?.footprint ?? BADGE_COLLISION.city);
  const minDx = opts?.minDx ?? derived.minDx;
  const minDy = opts?.minDy ?? derived.minDy;

  const projected = badges.map((badge) => {
    const point = project(badge);
    return { badge, x: point.x, y: point.y, count: badge.count };
  });

  const sorted = [...projected].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.badge.label.localeCompare(b.badge.label);
  });

  const kept: typeof projected = [];
  const rejected: typeof projected = [];

  for (const item of sorted) {
    const overlaps = kept.some(
      (other) =>
        Math.abs(item.x - other.x) < minDx &&
        Math.abs(item.y - other.y) < minDy,
    );
    if (overlaps) rejected.push(item);
    else kept.push(item);
  }

  return {
    badges: kept.map((k) => k.badge),
    lightOnly: rejected.map((r) => r.badge),
  };
}

/** Resolve cluster-* badge ids back to the seed city/suburb id */
export function resolveBadgeTargetId(badgeId: string): string {
  return badgeId.startsWith("cluster-") ? badgeId.slice("cluster-".length) : badgeId;
}
