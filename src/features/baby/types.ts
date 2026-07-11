import type {
  BabyEventType,
  FeedSide,
  FeedingMethod,
  NappyType,
} from "@/lib/supabase/database.types";

export type BabyProfile = {
  id: string;
  name: string;
  dateOfBirth: string | null;
  dueDate: string | null;
  feedingMethod: FeedingMethod | null;
  familyId: string;
};

/** UI feeding kinds for beta logging. */
export type FeedingKind =
  | "breast"
  | "bottle"
  | "formula"
  | "expressed_milk"
  | "solids"
  | "other";

export type TrackingActivityKind = "feeding" | "sleep" | "nappy";

export type BabyActivityItem = {
  id: string;
  babyId: string;
  parentId: string;
  kind: TrackingActivityKind;
  eventType: BabyEventType;
  startedAt: string;
  endedAt: string | null;
  amountMl: number | null;
  side: FeedSide | null;
  notes: string | null;
  nappyType: NappyType | null;
  feedingKind: FeedingKind | null;
  /** Soft client status for optimistic rows. */
  status: "confirmed" | "optimistic" | "failed";
  clientKey: string;
};

export type TodaySummary = {
  /** Australia/Sydney calendar date YYYY-MM-DD */
  date: string;
  feedCount: number;
  sleepMs: number;
  nappyCount: number;
  mostRecent: BabyActivityItem | null;
};

export type ActivityCursor = {
  startedAt: string;
  id: string;
};

export type ActivityPageResult = {
  items: BabyActivityItem[];
  hasMore: boolean;
  error: string | null;
};
