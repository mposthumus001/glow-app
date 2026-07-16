import { LoginForm } from "@/components/auth/LoginForm";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  const passwordResetSuccess = params.reset === "success";

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
      redirect("/");
    }
    redirect("/onboarding");
  }

  return <LoginForm passwordResetSuccess={passwordResetSuccess} />;
}
