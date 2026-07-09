"use client";

import type { StateCount } from "../types";

/**
 * Apple-style glass capsule over a state.
 * Replaces floating count circles.
 */
export function StateBadge({ state }: { state: StateCount }) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${state.x}%`, top: `${state.y}%` }}
    >
      <div
        className="flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[rgba(8,12,28,0.68)] px-2.5 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.28),0_0_0_0.5px_rgba(255,255,255,0.04)] backdrop-blur-md"
        aria-label={`${state.code}: ${state.count} parents awake`}
      >
        <span className="text-[10px] font-semibold tracking-[0.04em] text-glow-text">
          {state.code}
        </span>
        <span className="text-[10px] font-medium tabular-nums text-glow-text-secondary">
          {state.count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/** @deprecated Use StateBadge */
export const StateCountBubble = StateBadge;
