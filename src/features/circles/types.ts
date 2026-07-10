import type {
  CircleRow,
  CircleStatus,
} from "@/lib/supabase/database.types";

/** Static prompt placeholder until Sprint 4.x persistence. */
export const TONIGHT_PROMPT_PLACEHOLDER = "What's one tiny win from today?";

export type CircleSummary = Pick<
  CircleRow,
  "id" | "name" | "description" | "status" | "max_members"
>;

export type CircleMessagePreview = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  parentId: string;
  circleId: string;
};

export type AssignedCircleView = {
  circle: CircleSummary;
  memberCount: number;
  /** Online members when map_presence can resolve them; otherwise null. */
  onlineCount: number | null;
  messages: CircleMessagePreview[];
};

export type CircleLoadStatus =
  | "loading"
  | "assigned"
  | "unassigned"
  | "error";

export type CircleLoadResult =
  | { status: "assigned"; data: AssignedCircleView }
  | { status: "unassigned" }
  | { status: "error"; message: string };

export type MessageAreaStatus =
  | "loading"
  | "empty"
  | "error"
  | "ready";

export function isFormingCircle(status: CircleStatus): boolean {
  return status === "forming";
}

export function isSmallCircle(memberCount: number): boolean {
  return memberCount > 0 && memberCount <= 3;
}
