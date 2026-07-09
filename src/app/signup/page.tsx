import { SignupForm } from "@/components/auth/SignupForm";
import { isParentOnboarded } from "@/lib/auth/onboarding";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignupPage() {
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

  return <SignupForm />;
}
