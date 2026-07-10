"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

import { GlowBadge } from "./GlowBadge";
import { GlowBackButton } from "./GlowBackButton";
import { GlowBreadcrumbs } from "./GlowBreadcrumbs";
import { projectOverlayPoint } from "../utils/zoom";
import type {
  AtlasBadge,
  AtlasLevel,
  AuStateCode,
  FocusBounds,
} from "../types";

export type OverlayLayerProps = {
  focus: FocusBounds;
  currentLevel: AtlasLevel;
  stateBadges: AtlasBadge[];
  cityBadges: AtlasBadge[];
  suburbBadges: AtlasBadge[];
  breadcrumbs: { id: string; label: string; level: AtlasLevel }[];
  canGoBack: boolean;
  onSelectState: (code: AuStateCode) => void;
  onSelectCity: (cityId: string) => void;
  onSelectSuburb: (suburbId: string) => void;
  onGoBack: () => void;
  onNavigate: (level: AtlasLevel) => void;
};

function projectBadges(
  badges: AtlasBadge[],
  focus: FocusBounds,
): AtlasBadge[] {
  return badges.map((badge) => {
    const point = projectOverlayPoint(badge.x, badge.y, focus);
    return { ...badge, x: point.x, y: point.y };
  });
}

/**
 * Badges, breadcrumbs, back — never inherits map CSS scale.
 * Progressive disclosure is applied upstream in useGlowAtlas.
 */
export function OverlayLayer({
  focus,
  currentLevel,
  stateBadges,
  cityBadges,
  suburbBadges,
  breadcrumbs,
  canGoBack,
  onSelectState,
  onSelectCity,
  onSelectSuburb,
  onGoBack,
  onNavigate,
}: OverlayLayerProps) {
  const projectedStates = useMemo(
    () => projectBadges(stateBadges, focus),
    [focus, stateBadges],
  );
  const projectedCities = useMemo(
    () => projectBadges(cityBadges, focus),
    [cityBadges, focus],
  );
  const projectedSuburbs = useMemo(
    () => projectBadges(suburbBadges, focus),
    [focus, suburbBadges],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="pointer-events-auto absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-3">
        <GlowBreadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
        <GlowBackButton visible={canGoBack} onBack={onGoBack} />
      </div>

      {/* Larger edge padding so badges stay inside the card */}
      <div className="absolute inset-[4%] overflow-hidden">
        <AnimatePresence mode="sync">
          {currentLevel === "country" ? (
            <motion.div
              key="states"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence initial={false}>
                {projectedStates.map((badge) => (
                  <GlowBadge
                    key={badge.id}
                    badge={badge}
                    size="state"
                    onSelect={(id) => onSelectState(id as AuStateCode)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : null}

          {currentLevel === "state" ? (
            <motion.div
              key="cities"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence initial={false}>
                {projectedCities.map((badge) => (
                  <GlowBadge
                    key={badge.id}
                    badge={badge}
                    size="city"
                    onSelect={onSelectCity}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : null}

          {currentLevel === "city" ? (
            <motion.div
              key="suburbs"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence initial={false}>
                {projectedSuburbs.map((badge) => (
                  <GlowBadge
                    key={badge.id}
                    badge={badge}
                    size="suburb"
                    onSelect={onSelectSuburb}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
