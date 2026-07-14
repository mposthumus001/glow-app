import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { assertRequiredPublicEnv } from "@/lib/env/public-env";
import type { Database } from "@/lib/supabase/database.types";

function requirePublicEnv() {
  const result = assertRequiredPublicEnv();
  if (!result.ok) {
    throw new Error(
      `Missing required public environment variable(s): ${result.missing.join(", ")}`,
    );
  }
}

export async function createClient() {
  requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — proxy refreshes sessions.
          }
        },
      },
    },
  );
}
