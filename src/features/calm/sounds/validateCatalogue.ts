import type { CalmAudioAssetRecord, CalmSound } from "./types.ts";

const HTML_PATTERN = /<[^>]*>|javascript:/i;
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/;

export function validateCalmSoundCatalogue(
  catalogue: readonly CalmSound[],
  assetRegistry: readonly CalmAudioAssetRecord[],
  options: { production: boolean },
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const registryById = new Map(
    assetRegistry.map((record) => [record.assetId, record]),
  );

  for (const sound of catalogue) {
    const label = `sound:${sound.id}`;
    if (ids.has(sound.id)) errors.push(`${label}: duplicate id`);
    if (slugs.has(sound.slug)) errors.push(`${label}: duplicate slug`);
    ids.add(sound.id);
    slugs.add(sound.slug);

    for (const [field, value] of [
      ["title", sound.title],
      ["summary", sound.summary],
      ["categoryLabel", sound.categoryLabel],
      ["durationLabel", sound.durationLabel],
      ["attributionText", sound.attributionText ?? ""],
    ] as const) {
      if (HTML_PATTERN.test(value)) {
        errors.push(`${label}: ${field} must contain plain text only`);
      }
    }

    if (!sound.source.src.startsWith("/") || HTML_PATTERN.test(sound.source.src)) {
      errors.push(`${label}: source must be a safe app-local path`);
    }
    if (sound.fileSizeBytes <= 0) {
      errors.push(`${label}: fileSizeBytes must be positive`);
    }
    if (!SHA256_PATTERN.test(sound.checksum)) {
      errors.push(`${label}: checksum must be sha256`);
    }
    if (sound.attributionRequired && !sound.attributionText?.trim()) {
      errors.push(`${label}: required attribution text is missing`);
    }

    const asset = registryById.get(sound.licenceRecordId as CalmSound["id"]);
    if (!asset) {
      errors.push(`${label}: missing licence registry record`);
      continue;
    }
    if (
      asset.checksum !== sound.checksum ||
      asset.fileSizeBytes !== sound.fileSizeBytes ||
      asset.version !== sound.assetVersion ||
      asset.format !== sound.source.format
    ) {
      errors.push(`${label}: catalogue metadata does not match asset registry`);
    }

    if (options.production) {
      if (sound.previewOnly) {
        errors.push(`${label}: preview-only asset cannot be production`);
      }
      if (!sound.productionApproved) {
        errors.push(`${label}: production approval is required`);
      }
      if (asset.approvalStatus !== "approved") {
        errors.push(`${label}: licence registry is not approved`);
      }
      if (sound.source.format === "wav") {
        errors.push(`${label}: WAV is not approved for production delivery`);
      }
      if (sound.source.src.includes("/placeholders/")) {
        errors.push(`${label}: placeholder path cannot be production`);
      }
    } else if (!sound.previewOnly || sound.productionApproved) {
      errors.push(`${label}: preview record has unsafe approval flags`);
    }
  }

  return errors;
}
