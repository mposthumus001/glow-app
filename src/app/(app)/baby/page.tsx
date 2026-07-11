import { BabyScreen } from "@/components/baby/BabyScreen";
import { requireAppUser } from "@/lib/auth/require-app-user";
import { createClient } from "@/lib/supabase/server";
import { formatBabyAgeLine } from "@/lib/utils/baby-age";

export default async function BabyPage() {
  const { user } = await requireAppUser();
  const supabase = await createClient();

  const { data: baby } = await supabase
    .from("babies")
    .select("name, date_of_birth, due_date")
    .eq("parent_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const ageLine = baby
    ? formatBabyAgeLine({
        name: baby.name,
        dateOfBirth: baby.date_of_birth,
        dueDate: baby.due_date,
      })
    : null;

  return (
    <BabyScreen babyName={baby?.name ?? null} ageLine={ageLine} />
  );
}
