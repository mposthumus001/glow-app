import type { StateCount } from "../types";
import { buildStateCounts } from "./statePositions";

/**
 * Mock state awake counts for Glow Map.
 * Prefer importing from demoLights / statePositions going forward.
 */
export const mockStateCounts: StateCount[] = buildStateCounts();
