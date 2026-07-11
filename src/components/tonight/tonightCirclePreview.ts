import type { CircleLoadResult } from "@/features/circles/types";

export type TonightCirclePreview = {
  status: CircleLoadResult["status"];
  name?: string;
  memberCount?: number;
  onlineCount?: number | null;
  primaryState?: string | null;
  message?: string;
};

export const TONIGHT_REMINDER = {
  title: "Tonight's Reminder",
  lines: ["You are doing better than you think.", "And that is enough."],
} as const;

export function circlePreviewFromLoad(
  result: CircleLoadResult,
): TonightCirclePreview {
  if (result.status === "assigned") {
    const { circle, memberCount, onlineCount } = result.data;
    return {
      status: "assigned",
      name: circle.name,
      memberCount,
      onlineCount,
      primaryState: circle.primary_state,
    };
  }

  if (result.status === "error") {
    return { status: "error", message: result.message };
  }

  return {
    status: "unassigned",
    message:
      result.message ??
      "We're matching you with a small, trusted group. Your Circle will appear here when ready.",
  };
}
