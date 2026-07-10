import type { GlowSupabaseClient } from "../api";

import {
  type CircleDailyPrompt,
  normalizeDailyPrompt,
} from "./promptLibrary";

type PromptRpcPayload = {
  id?: string | null;
  title?: string | null;
  prompt_text?: string | null;
  prompt_date?: string | null;
};

export async function ensureCircleDailyPrompt(
  supabase: GlowSupabaseClient,
  circleId: string,
): Promise<{ prompt: CircleDailyPrompt | null; error: string | null }> {
  const { data, error } = await supabase.rpc("ensure_circle_daily_prompt", {
    p_circle_id: circleId,
  });

  if (error) {
    return { prompt: null, error: error.message };
  }

  const payload = data as PromptRpcPayload | null;
  const promptDate =
    typeof payload?.prompt_date === "string"
      ? payload.prompt_date
      : new Date().toISOString().slice(0, 10);

  return {
    prompt: normalizeDailyPrompt(payload, promptDate),
    error: null,
  };
}
