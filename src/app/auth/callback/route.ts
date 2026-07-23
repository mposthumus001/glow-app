import { NextResponse } from "next/server";

import { buildAuthCallbackFailureLoginHref } from "@/lib/auth/post-login-navigation";
import { safeAuthNextPath } from "@/lib/auth/safe-auth-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback for password recovery, email confirmations, and invites.
 * Exchanges the PKCE code for a session, then redirects to a validated `next` path.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNextPath(searchParams.get("next"), "/");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}${buildAuthCallbackFailureLoginHref(next)}`,
  );
}
