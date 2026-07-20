import { SignupForm } from "@/components/auth/SignupForm";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { safeAuthNextPath } from "@/lib/auth/safe-auth-next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeAuthNextPath(params.next);

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
    <SignupForm nextPath={params.next ? nextPath : undefined} />
  );
}
