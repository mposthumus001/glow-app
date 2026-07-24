import { CalmSoundsPreparation } from "@/features/calm/components/CalmSoundsPreparation";
import { getCalmSoundsMode } from "@/features/calm/sounds/flags";

export default async function CalmSoundsPage() {
  const mode = getCalmSoundsMode();

  if (mode === "off") {
    return <CalmSoundsPreparation />;
  }

  const { CalmScreen } = await import(
    "@/features/calm/components/CalmScreen"
  );
  return <CalmScreen mode={mode} />;
}
