import { LoginForm } from "@/components/auth/LoginForm";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { coerceAuthNextParam, safeAuthNextPath } from "@/lib/auth/safe-auth-next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const passwordResetSuccess = params.reset === "success";
  const nextRaw = coerceAuthNextParam(params.next);
  const nextPath = safeAuthNextPath(nextRaw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: parent } = await supabase
      .from("parents")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (isParentOnboarded(parent)) {
      redirect(nextPath);
    }
    redirect(
      nextPath === "/"
        ? "/onboarding"
        : `/onboarding?next=${encodeURIComponent(nextPath)}`,
    );
  }

  return (
    <LoginForm
      passwordResetSuccess={passwordResetSuccess}
      nextPath={nextRaw ? nextPath : undefined}
    />
  );
}
