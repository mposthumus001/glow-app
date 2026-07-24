export type CalmSoundsMode = "off" | "preview" | "production";

export type CalmCategoryId =
  | "rain"
  | "white-noise"
  | "ocean"
  | "night";

export type CalmSoundId =
  | "soft-rain"
  | "steady-hush"
  | "gentle-waves"
  | "quiet-evening";

export type CalmSoundFormat = "m4a" | "mp3" | "webm" | "wav";

export type CalmSoundSource = {
  src: string;
  format: CalmSoundFormat;
};

export type CalmSound = {
  id: CalmSoundId;
  slug: string;
  title: string;
  summary: string;
  category: CalmCategoryId;
  categoryLabel: string;
  durationLabel: string;
  source: CalmSoundSource;
  fallbackSources?: readonly CalmSoundSource[];
  fileSizeBytes: number;
  loop: boolean;
  enabled: boolean;
  previewOnly: boolean;
  productionApproved: boolean;
  assetVersion: string;
  checksum: `sha256:${string}`;
  licenceRecordId: string;
  attributionRequired: boolean;
  attributionText: string | null;
  visual: "rain" | "hush" | "ocean" | "night";
};

export type CalmCategory = {
  id: CalmCategoryId;
  title: string;
  description: string;
};

export type CalmAudioAssetRecord = {
  assetId: CalmSoundId;
  title: string;
  creatorOrSource: string;
  licenceType: string;
  proofOfLicenceLocation: string;
  attributionRequired: boolean;
  attributionText: string | null;
  allowedAppUsage: string;
  restrictions: string;
  durationSeconds: number;
  format: CalmSoundFormat;
  fileSizeBytes: number;
  checksum: `sha256:${string}`;
  version: string;
  approvalStatus: "preview-only" | "approved" | "rejected" | "pending";
  reviewDate: string;
};
