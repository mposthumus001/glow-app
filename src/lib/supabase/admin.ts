import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { assertRequiredPublicEnv } from "@/lib/env/public-env";

/**
 * Server-only Supabase admin client for trusted Moments processing.
 * Never import from client components.
 */
export function createAdminClient() {
  const env = assertRequiredPublicEnv();
  if (!env.ok) {
    throw new Error("Missing public Supabase env for admin client bootstrap.");
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for Moments image processing.",
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function isMomentsProcessingConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
