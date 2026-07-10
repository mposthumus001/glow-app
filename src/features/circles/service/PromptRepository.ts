import { createClient } from "@/lib/supabase/server";

import { ensureCircleDailyPrompt } from "../prompts/promptApi";
import type { CircleDailyPrompt } from "../prompts/promptLibrary";
import { fallbackPromptText } from "../prompts/promptLibrary";

export async function loadCircleDailyPrompt(
  circleId: string,
): Promise<CircleDailyPrompt | null> {
  const supabase = await createClient();
  const result = await ensureCircleDailyPrompt(supabase, circleId);

  if (result.prompt) {
    return result.prompt;
  }

  if (result.error) {
    return null;
  }

  return null;
}

export function promptDisplayFallback(): CircleDailyPrompt {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "fallback",
    title: "Tonight",
    promptText: fallbackPromptText(),
    promptDate: today,
  };
}
