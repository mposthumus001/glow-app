import type { MomentMediaOutcome } from "./processing/outcomes";

export type MomentMediaDisplayStatus =
  | "ready"
  | "processing"
  | "pending"
  | "failed";

export type MomentMediaView = {
  id: string;
  status: MomentMediaDisplayStatus;
  /** Short-lived signed thumbnail URL; may be null until client refresh. */
  thumbnailUrl: string | null;
  /** Epoch ms when thumbnailUrl expires; null when no URL. */
  urlExpiresAt: number | null;
  canRetry: boolean;
  message: string | null;
};

export type MomentPreviewItem = {
  id: string;
  title: string | null;
  caption: string | null;
  occurredOn: string;
  ageLabel: string | null;
  primaryMedia: MomentMediaView | null;
};

export type MomentListItem = {
  id: string;
  title: string | null;
  caption: string | null;
  occurredOn: string;
  ageLabel: string | null;
  isFavourite: boolean;
  primaryMedia: MomentMediaView | null;
};

export type MomentTagView = {
  id: string;
  label: string;
  isSystem: boolean;
};

export type MomentDetailView = {
  id: string;
  title: string | null;
  caption: string | null;
  occurredOn: string;
  ageLabel: string | null;
  isFavourite: boolean;
  babyIds: string[];
  tags: MomentTagView[];
  media: MomentMediaView[];
  /** Short-lived signed display.webp URL for the primary ready media. */
  displayUrl: string | null;
  displayUrlExpiresAt: number | null;
  displayMediaId: string | null;
};

export type SystemTagOption = {
  id: string;
  label: string;
};

export type BabyMomentsContext = {
  babyId: string;
  babyName: string;
  dateOfBirth: string | null;
  dueDate: string | null;
};

export type MomentUploadProgress = {
  phase: "idle" | "creating" | "uploading" | "processing" | "done" | "error";
  outcome: MomentMediaOutcome | null;
  message: string | null;
};
