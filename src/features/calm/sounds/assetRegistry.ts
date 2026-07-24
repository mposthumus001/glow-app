import type { CalmAudioAssetRecord } from "./types.ts";

/**
 * Code mirror of the auditable register in docs/CalmAudioAssetRegister.md.
 * Preview records are development-only and can never satisfy production
 * catalogue validation.
 */
export const CALM_AUDIO_ASSET_REGISTRY: readonly CalmAudioAssetRecord[] = [
  {
    assetId: "soft-rain",
    title: "Soft Rain placeholder",
    creatorOrSource: "Glow procedurally generated test asset",
    licenceType: "Glow-owned development placeholder",
    proofOfLicenceLocation: "public/calm/placeholders/README.md",
    attributionRequired: false,
    attributionText: null,
    allowedAppUsage: "Private preview QA only",
    restrictions: "Must not render in production Sounds",
    durationSeconds: 8,
    format: "wav",
    fileSizeBytes: 352_844,
    checksum:
      "sha256:16925dc6e716f070ba101169527be219901057b2ccfdf2e5177010b2f53f9587",
    version: "preview-1",
    approvalStatus: "preview-only",
    reviewDate: "2026-07-24",
  },
  {
    assetId: "steady-hush",
    title: "Steady Hush placeholder",
    creatorOrSource: "Glow procedurally generated test asset",
    licenceType: "Glow-owned development placeholder",
    proofOfLicenceLocation: "public/calm/placeholders/README.md",
    attributionRequired: false,
    attributionText: null,
    allowedAppUsage: "Private preview QA only",
    restrictions: "Must not render in production Sounds",
    durationSeconds: 8,
    format: "wav",
    fileSizeBytes: 352_844,
    checksum:
      "sha256:4d9d3119123f29cda72a7290a0e8044884e82f6aac2b220dfa8084acbe727e0b",
    version: "preview-1",
    approvalStatus: "preview-only",
    reviewDate: "2026-07-24",
  },
  {
    assetId: "gentle-waves",
    title: "Gentle Waves placeholder",
    creatorOrSource: "Glow procedurally generated test asset",
    licenceType: "Glow-owned development placeholder",
    proofOfLicenceLocation: "public/calm/placeholders/README.md",
    attributionRequired: false,
    attributionText: null,
    allowedAppUsage: "Private preview QA only",
    restrictions: "Must not render in production Sounds",
    durationSeconds: 8,
    format: "wav",
    fileSizeBytes: 352_844,
    checksum:
      "sha256:2275a413382aab61cb457ba6c8ba670662acc63bbbc85108aca25d5d5e450713",
    version: "preview-1",
    approvalStatus: "preview-only",
    reviewDate: "2026-07-24",
  },
  {
    assetId: "quiet-evening",
    title: "Quiet Evening placeholder",
    creatorOrSource: "Glow procedurally generated test asset",
    licenceType: "Glow-owned development placeholder",
    proofOfLicenceLocation: "public/calm/placeholders/README.md",
    attributionRequired: false,
    attributionText: null,
    allowedAppUsage: "Private preview QA only",
    restrictions: "Must not render in production Sounds",
    durationSeconds: 8,
    format: "wav",
    fileSizeBytes: 352_844,
    checksum:
      "sha256:bcceb4c98af088ac9f971a275ac029d9701fbb9bf59afdf29c0146f6da5d3769",
    version: "preview-1",
    approvalStatus: "preview-only",
    reviewDate: "2026-07-24",
  },
] as const;

const ASSET_BY_ID = new Map(
  CALM_AUDIO_ASSET_REGISTRY.map((record) => [record.assetId, record]),
);

export function getCalmAudioAssetRecord(assetId: string) {
  return ASSET_BY_ID.get(assetId as CalmAudioAssetRecord["assetId"]) ?? null;
}
