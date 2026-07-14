/**
 * Lightweight env checks for production launch readiness.
 * Never logs or returns secret values — only presence / shape.
 */

export type EnvCheckId =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  | "NEXT_PUBLIC_SITE_URL";

export type EnvCheckResult = {
  id: EnvCheckId;
  present: boolean;
  /** When true, missing value fails assertRequiredPublicEnv. */
  hardRequired: boolean;
  hint: string;
};

export function getPublicEnvChecks(
  env: NodeJS.ProcessEnv = process.env,
): EnvCheckResult[] {
  return [
    {
      id: "NEXT_PUBLIC_SUPABASE_URL",
      present: Boolean(env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      hardRequired: true,
      hint: "Supabase project URL (public).",
    },
    {
      id: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      present: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      hardRequired: true,
      hint: "Supabase anon key only — never service-role.",
    },
    {
      id: "NEXT_PUBLIC_SITE_URL",
      present: Boolean(env.NEXT_PUBLIC_SITE_URL?.trim()),
      // Soft: password reset / confirm redirects need this in deployed envs,
      // but local `next build` must not fail when it is unset.
      hardRequired: false,
      hint: "Canonical site URL for Auth redirects (required on Vercel production).",
    },
  ];
}

export function assertRequiredPublicEnv(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true } | { ok: false; missing: EnvCheckId[] } {
  const missing = getPublicEnvChecks(env)
    .filter((check) => check.hardRequired && !check.present)
    .map((check) => check.id);

  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
}

/** Soft production checklist — SITE_URL expected on Vercel. */
export function getSoftProductionGaps(
  env: NodeJS.ProcessEnv = process.env,
): EnvCheckId[] {
  if (env.NODE_ENV !== "production") return [];
  return getPublicEnvChecks(env)
    .filter((check) => !check.hardRequired && !check.present)
    .map((check) => check.id);
}
