import type { MomentMediaOutcome } from "./processing/outcomes";

export type MomentMediaDisplayStatus =
  | "ready"
  | "processing"
  | "pending"
  | "failed";

export type MomentMediaView = {
  id: string;
  status: MomentMediaDisplayStatus;
  thumbnailUrl: string | null;
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
  displayUrl: string | null;
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
