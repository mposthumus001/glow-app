import type { AtlasBadge } from "../types";

export const MAX_CITY_BADGES = 5;
export const MAX_SUBURB_BADGES = 4;

/** Preferred Victoria city badges (in priority order) */
export const VIC_PREFERRED_CITY_IDS = [
  "melbourne",
  "geelong",
  "bendigo",
  "ballarat",
  "mildura",
] as const;

/** Preferred Melbourne suburb badges */
export const MELBOURNE_PREFERRED_SUBURB_IDS = [
  "mel-box-hill",
  "mel-preston",
  "mel-st-kilda",
  "mel-frankston",
] as const;

/** Map-space distance (%) under which cities merge into one area badge */
export const CITY_CLUSTER_DISTANCE = 2.8;

/**
 * Approximate badge footprint in viewport % for collision checks.
 * Tuned for ~92px pills on a ~360px-wide map card.
 */
export const BADGE_COLLISION = {
  halfWidth: 13,
  halfHeight: 4.5,
  /** Minimum centre-to-centre gap (viewport %) */
  minDx: 16,
  minDy: 7,
} as const;

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
 * Greedy collision filter in viewport space.
 * Higher-count badges win; overlapping lower-count badges become light-only.
 */
export function resolveCollisions(
  badges: AtlasBadge[],
  opts: {
    minDx?: number;
    minDy?: number;
  } = {},
): DisclosureResult {
  const minDx = opts.minDx ?? BADGE_COLLISION.minDx;
  const minDy = opts.minDy ?? BADGE_COLLISION.minDy;
  const sorted = sortByCountDesc(badges);
  const kept: AtlasBadge[] = [];
  const rejected: AtlasBadge[] = [];

  for (const badge of sorted) {
    const overlaps = kept.some(
      (other) =>
        Math.abs(badge.x - other.x) < minDx &&
        Math.abs(badge.y - other.y) < minDy,
    );

    if (overlaps) {
      rejected.push(badge);
    } else {
      kept.push(badge);
    }
  }

  return { badges: kept, lightOnly: rejected };
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
 * prefer allowlist → top N by count → cluster nearby → collision filter.
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
  const preferred = options.preferredIds ?? [];

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
 * prefer allowlist → top N → collision filter (no area clustering).
 */
export function discloseSuburbBadges(
  badges: AtlasBadge[],
  options: {
    max?: number;
    preferredIds?: readonly string[];
  } = {},
): DisclosureResult {
  const max = options.max ?? MAX_SUBURB_BADGES;
  const preferred = options.preferredIds ?? [];

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
 * Collision check using pre-projected viewport coordinates,
 * returning original map-space badges for kept / rejected sets.
 */
export function applyViewportCollision(
  badges: AtlasBadge[],
  project: (badge: AtlasBadge) => { x: number; y: number },
  opts?: { minDx?: number; minDy?: number },
): DisclosureResult {
  const projected = badges.map((badge) => {
    const point = project(badge);
    return { badge, x: point.x, y: point.y, count: badge.count };
  });

  const minDx = opts?.minDx ?? BADGE_COLLISION.minDx;
  const minDy = opts?.minDy ?? BADGE_COLLISION.minDy;
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
