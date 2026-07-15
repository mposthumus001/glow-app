"use client";

import { useCallback, useMemo, useState } from "react";

import { emptyAtlasPresence } from "@/features/presence";

import { australiaMeta, COUNTRY_FOCUS } from "../data/australia";
import { atlasCities, getCitiesForState, getCity } from "../data/cities";
import { atlasStates } from "../data/states";
import { getState } from "../data/states";
import { getSuburb, getSuburbsForCity } from "../data/suburbs";
import { buildClusterLights, buildNeighbourhoodLights } from "../utils/cluster";
import { MIN_SUBURB_PRESENCE_COUNT } from "../utils/privacyConstants";
import {
  applyViewportCollision,
  BADGE_COLLISION,
  discloseCityBadges,
  discloseStateBadges,
  discloseSuburbBadges,
  resolveBadgeTargetId,
} from "../utils/disclosure";
import { focusToTransform, projectOverlayPoint } from "../utils/zoom";
import type {
  AtlasBadge,
  AtlasCity,
  AtlasLevel,
  AtlasLight,
  AtlasPresence,
  AtlasPresenceSource,
  AtlasSelection,
  AtlasState,
  AtlasSuburb,
  AuStateCode,
  FocusBounds,
} from "../types";

export type UseGlowAtlasOptions = {
  /**
   * `live` → Supabase map_presence via usePresence()
   * `demo` → legacy offline fixture (avoid in product surfaces)
   */
  source?: AtlasPresenceSource;
  /** Live AtlasPresence from usePresence(); defaults to empty (not demo). */
  presence?: AtlasPresence;
};

export type GlowAtlasController = AtlasSelection & {
  focus: FocusBounds;
  transform: { scale: number; originX: number; originY: number };
  presence: AtlasPresence;
  selectedStateData: AtlasState | null;
  selectedCityData: AtlasCity | null;
  selectedSuburbData: AtlasSuburb | null;
  cities: AtlasCity[];
  suburbs: AtlasSuburb[];
  stateBadges: AtlasBadge[];
  cityBadges: AtlasBadge[];
  suburbBadges: AtlasBadge[];
  lights: AtlasLight[];
  breadcrumbs: { id: string; label: string; level: AtlasLevel }[];
  canGoBack: boolean;
  selectState: (code: AuStateCode) => void;
  selectCity: (cityId: string) => void;
  selectSuburb: (suburbId: string) => void;
  goBack: () => void;
  goToLevel: (level: AtlasLevel) => void;
};

function unlabeledLightsFor(
  anchors: AtlasBadge[],
  prefix: string,
): AtlasLight[] {
  return anchors.flatMap((anchor) =>
    buildClusterLights({
      id: `${prefix}-${anchor.id}`,
      x: anchor.x,
      y: anchor.y,
      count: Math.max(2, Math.min(6, Math.round(anchor.count * 0.12))),
      spread: 0.55,
      circleRatio: 0.05,
    }),
  );
}

/**
 * Glow Atlas navigation + overlay data.
 * Progressive disclosure keeps state/city views calm.
 */
export function useGlowAtlas(
  options: UseGlowAtlasOptions = {},
): GlowAtlasController {
  const presence = options.presence ?? emptyAtlasPresence();

  const [selection, setSelection] = useState<AtlasSelection>({
    currentLevel: "country",
    selectedState: null,
    selectedCity: null,
    selectedSuburb: null,
  });

  const selectedStateData = selection.selectedState
    ? getState(selection.selectedState)
    : null;
  const selectedCityData = selection.selectedCity
    ? (getCity(selection.selectedCity) ?? null)
    : null;
  const selectedSuburbData = selection.selectedSuburb
    ? (getSuburb(selection.selectedSuburb) ?? null)
    : null;

  const cities = useMemo(
    () =>
      selection.selectedState
        ? getCitiesForState(selection.selectedState)
        : [],
    [selection.selectedState],
  );

  const suburbs = useMemo(
    () =>
      selection.selectedCity ? getSuburbsForCity(selection.selectedCity) : [],
    [selection.selectedCity],
  );

  const focus = useMemo((): FocusBounds => {
    if (selection.currentLevel === "suburb" && selectedSuburbData) {
      return selectedSuburbData.focus;
    }
    if (selection.currentLevel === "city" && selectedCityData) {
      return selectedCityData.focus;
    }
    if (selection.currentLevel === "state" && selectedStateData) {
      return selectedStateData.focus;
    }
    return COUNTRY_FOCUS;
  }, [
    selection.currentLevel,
    selectedCityData,
    selectedStateData,
    selectedSuburbData,
  ]);

  const transform = useMemo(() => focusToTransform(focus), [focus]);

  const allStateBadges: AtlasBadge[] = useMemo(
    () =>
      Object.entries(presence.stateCounts)
        .filter(([, count]) => count > 0)
        .map(([code, count]) => {
          const state = getState(code as AuStateCode);
          return {
            id: code,
            label: code,
            count,
            x: state.x,
            y: state.y,
          };
        }),
    [presence.stateCounts],
  );

  // Country level always shows every awake state — there are at most eight,
  // a fixed, known set of real geographic anchors, never a dynamic top-N
  // problem the way city/suburb disclosure is. Checkpoint C's visual review
  // found the generic viewport-collision pass (designed for city/suburb's
  // *variable* candidate lists) was silently demoting SA/NT/ACT to
  // unlabelled lights at common card widths — an active state must never be
  // silently dropped. The MapLibre renderer instead applies a national,
  // declarative per-state pixel nudge (+ an ACT leader line) at render time
  // — see `NATIONAL_LABEL_OFFSET` in `map/GlowMapBadges.tsx` — so no
  // viewport-space collision math runs here at all for this level.
  const stateDisclosure = useMemo(() => {
    if (selection.currentLevel !== "country") {
      return { badges: [] as AtlasBadge[], lightOnly: [] as AtlasBadge[] };
    }
    return discloseStateBadges(allStateBadges);
  }, [allStateBadges, selection.currentLevel]);

  const stateBadges = stateDisclosure.badges;

  const allCityBadges: AtlasBadge[] = useMemo(
    () =>
      cities
        .map((city) => ({
          id: city.id,
          label: city.name,
          count: presence.cityCounts[city.id] ?? 0,
          x: city.x,
          y: city.y,
          featured: city.featured,
          featuredPriority: city.featuredPriority,
        }))
        .filter((badge) => badge.count > 0),
    [cities, presence.cityCounts],
  );

  const allSuburbBadges: AtlasBadge[] = useMemo(
    () =>
      suburbs
        .map((suburb) => ({
          id: suburb.id,
          label: suburb.name,
          count: presence.suburbCounts[suburb.id] ?? 0,
          x: suburb.x,
          y: suburb.y,
          featured: suburb.featured,
          featuredPriority: suburb.featuredPriority,
        }))
        // Same k-anonymity floor as presenceGeoJson.ts's suburb features —
        // defense-in-depth here too, since `presence` can be supplied
        // directly (tests/Storybook/QA), bypassing mapClustersToPresence.ts's
        // own floor. A suburb badge must never disclose an identifiable count.
        .filter((badge) => badge.count >= MIN_SUBURB_PRESENCE_COUNT),
    [presence.suburbCounts, suburbs],
  );

  const cityDisclosure = useMemo(() => {
    if (selection.currentLevel !== "state") {
      return { badges: [] as AtlasBadge[], lightOnly: [] as AtlasBadge[] };
    }

    // Preference is derived from each city's own `featured` data (see
    // cities.ts) rather than a hardcoded per-state allowlist, so any state
    // can have a curated disclosure order without a new code branch.
    const disclosed = discloseCityBadges(allCityBadges, { max: 5 });

    const collided = applyViewportCollision(
      disclosed.badges,
      (badge) => projectOverlayPoint(badge.x, badge.y, focus),
      { footprint: BADGE_COLLISION.city },
    );

    return {
      badges: collided.badges,
      lightOnly: [...disclosed.lightOnly, ...collided.lightOnly],
    };
  }, [allCityBadges, focus, selection.currentLevel]);

  const suburbDisclosure = useMemo(() => {
    if (selection.currentLevel !== "city") {
      return { badges: [] as AtlasBadge[], lightOnly: [] as AtlasBadge[] };
    }

    const disclosed = discloseSuburbBadges(allSuburbBadges, { max: 4 });

    const collided = applyViewportCollision(
      disclosed.badges,
      (badge) => projectOverlayPoint(badge.x, badge.y, focus),
      { footprint: BADGE_COLLISION.suburb },
    );

    return {
      badges: collided.badges,
      lightOnly: [...disclosed.lightOnly, ...collided.lightOnly],
    };
  }, [allSuburbBadges, focus, selection.currentLevel]);

  const cityBadges = cityDisclosure.badges;
  const suburbBadges = suburbDisclosure.badges;

  const lights = useMemo((): AtlasLight[] => {
    if (selection.currentLevel === "suburb" && selectedSuburbData) {
      const parentCount =
        presence.suburbParents[selectedSuburbData.id] ?? 0;
      if (parentCount <= 0) return [];
      return buildNeighbourhoodLights(
        selectedSuburbData.id,
        selectedSuburbData.x,
        selectedSuburbData.y,
        parentCount,
        selectedSuburbData.spread * 0.85,
      );
    }

    if (selection.currentLevel === "city") {
      const labeledIds = new Set(suburbBadges.map((b) => b.id));
      const labeledLights = suburbs
        .filter((s) => labeledIds.has(s.id))
        .flatMap((suburb) => {
          const awake = presence.suburbCounts[suburb.id] ?? 0;
          if (awake <= 0) return [];
          const count = Math.max(2, Math.round(awake * 0.22));
          return buildClusterLights({
            id: suburb.id,
            x: suburb.x,
            y: suburb.y,
            count,
            spread: suburb.spread * 0.85,
          });
        });

      return [
        ...labeledLights,
        ...unlabeledLightsFor(suburbDisclosure.lightOnly, "sub-light"),
      ];
    }

    if (selection.currentLevel === "state" && selectedStateData) {
      const hasCityClusters = cities.some(
        (c) => (presence.cityCounts[c.id] ?? 0) > 0,
      );

      if (!hasCityClusters) {
        const stateCount =
          presence.stateCounts[selectedStateData.code] ?? 0;
        if (stateCount <= 0) return [];
        const count = Math.max(3, Math.min(12, Math.round(stateCount * 0.18)));
        return buildClusterLights({
          id: `state-only-${selectedStateData.code}`,
          x: selectedStateData.x,
          y: selectedStateData.y,
          count,
          spread: 1.4,
        });
      }

      const labeledIds = new Set(
        cityBadges.map((b) => resolveBadgeTargetId(b.id)),
      );
      const labeledLights = cities
        .filter((c) => labeledIds.has(c.id))
        .flatMap((city) => {
          const awake = presence.cityCounts[city.id] ?? 0;
          if (awake <= 0) return [];
          const count = Math.max(3, Math.round(awake * 0.2));
          return buildClusterLights({
            id: city.id,
            x: city.x,
            y: city.y,
            count,
            spread: city.spread * 0.45,
          });
        });

      return [
        ...labeledLights,
        ...unlabeledLightsFor(cityDisclosure.lightOnly, "city-light"),
      ];
    }

    // Only fall back to an unlabeled state-level dot for a rejected state
    // badge when that state has no active cities of its own — otherwise its
    // presence is already visible via the per-city lights below, and a
    // second dot at the state anchor would double-represent it.
    const stateLightOnlyLights = unlabeledLightsFor(
      stateDisclosure.lightOnly.filter((badge) => {
        const hasActiveCities = atlasCities.some(
          (c) => c.state === badge.id && (presence.cityCounts[c.id] ?? 0) > 0,
        );
        return !hasActiveCities;
      }),
      "state-light",
    );

    const cityLights = atlasCities.flatMap((city) => {
      const awake = presence.cityCounts[city.id] ?? 0;
      if (awake <= 0) return [];
      const count = Math.max(2, Math.round(awake * 0.22));
      return buildClusterLights({
        id: `country-${city.id}`,
        x: city.x,
        y: city.y,
        count,
        spread: city.spread,
      });
    });

    if (cityLights.length > 0) {
      return [...cityLights, ...stateLightOnlyLights];
    }

    const stateFallbackLights = atlasStates.flatMap((state) => {
      const awake = presence.stateCounts[state.code] ?? 0;
      if (awake <= 0) return [];
      const count = Math.max(2, Math.min(8, Math.round(awake * 0.12)));
      return buildClusterLights({
        id: `country-state-${state.code}`,
        x: state.x,
        y: state.y,
        count,
        spread: 1.0,
      });
    });

    return [...stateFallbackLights, ...stateLightOnlyLights];
  }, [
    cities,
    cityBadges,
    cityDisclosure.lightOnly,
    presence.cityCounts,
    presence.stateCounts,
    presence.suburbCounts,
    presence.suburbParents,
    selectedStateData,
    selectedSuburbData,
    selection.currentLevel,
    stateDisclosure.lightOnly,
    suburbBadges,
    suburbDisclosure.lightOnly,
    suburbs,
  ]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string; label: string; level: AtlasLevel }[] = [
      { id: "australia", label: australiaMeta.name, level: "country" },
    ];
    if (selectedStateData) {
      crumbs.push({
        id: selectedStateData.code,
        label: selectedStateData.name,
        level: "state",
      });
    }
    if (selectedCityData) {
      crumbs.push({
        id: selectedCityData.id,
        label: selectedCityData.name,
        level: "city",
      });
    }
    if (selectedSuburbData) {
      crumbs.push({
        id: selectedSuburbData.id,
        label: selectedSuburbData.name,
        level: "suburb",
      });
    }
    return crumbs;
  }, [selectedCityData, selectedStateData, selectedSuburbData]);

  const selectState = useCallback((code: AuStateCode) => {
    setSelection({
      currentLevel: "state",
      selectedState: code,
      selectedCity: null,
      selectedSuburb: null,
    });
  }, []);

  const selectCity = useCallback((cityId: string) => {
    const resolved = resolveBadgeTargetId(cityId);
    const city = getCity(resolved);
    if (!city) return;
    setSelection({
      currentLevel: "city",
      selectedState: city.state,
      selectedCity: resolved,
      selectedSuburb: null,
    });
  }, []);

  const selectSuburb = useCallback((suburbId: string) => {
    const resolved = resolveBadgeTargetId(suburbId);
    const suburb = getSuburb(resolved);
    if (!suburb) return;
    setSelection({
      currentLevel: "suburb",
      selectedState: suburb.state,
      selectedCity: suburb.cityId,
      selectedSuburb: resolved,
    });
  }, []);

  const goBack = useCallback(() => {
    setSelection((prev) => {
      if (prev.currentLevel === "suburb") {
        return { ...prev, currentLevel: "city", selectedSuburb: null };
      }
      if (prev.currentLevel === "city") {
        return { ...prev, currentLevel: "state", selectedCity: null };
      }
      if (prev.currentLevel === "state") {
        return {
          currentLevel: "country",
          selectedState: null,
          selectedCity: null,
          selectedSuburb: null,
        };
      }
      return prev;
    });
  }, []);

  const goToLevel = useCallback((level: AtlasLevel) => {
    setSelection((prev) => {
      if (level === "country") {
        return {
          currentLevel: "country",
          selectedState: null,
          selectedCity: null,
          selectedSuburb: null,
        };
      }
      if (level === "state" && prev.selectedState) {
        return {
          currentLevel: "state",
          selectedState: prev.selectedState,
          selectedCity: null,
          selectedSuburb: null,
        };
      }
      if (level === "city" && prev.selectedCity) {
        return { ...prev, currentLevel: "city", selectedSuburb: null };
      }
      return prev;
    });
  }, []);

  return {
    ...selection,
    focus,
    transform,
    presence,
    selectedStateData,
    selectedCityData,
    selectedSuburbData,
    cities,
    suburbs,
    stateBadges,
    cityBadges,
    suburbBadges,
    lights,
    breadcrumbs,
    canGoBack: selection.currentLevel !== "country",
    selectState,
    selectCity,
    selectSuburb,
    goBack,
    goToLevel,
  };
}
