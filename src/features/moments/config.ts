/**
 * Moments feature flag.
 * Build-time inlined on Vercel — set NEXT_PUBLIC_MOMENTS_ENABLED=true to expose UI (Sprint 9.2+).
 * Schema and server actions may exist while flag is false.
 */
export function isMomentsEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.NEXT_PUBLIC_MOMENTS_ENABLED?.trim() === "true";
}
