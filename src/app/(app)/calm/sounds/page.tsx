import { CalmSoundsPreparation } from "@/features/calm/components/CalmSoundsPreparation";

export default async function CalmSoundsPage() {
  const previewEnabled =
    process.env.NEXT_PUBLIC_CALM_SOUNDS_PREVIEW_ENABLED === "true";

  if (!previewEnabled) {
    return <CalmSoundsPreparation />;
  }

  const { CalmScreen } = await import(
    "@/features/calm/components/CalmScreen"
  );
  return <CalmScreen />;
}
