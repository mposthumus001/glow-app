export function formatMomentPhotoCount(count: number): string {
  if (count <= 0) return "No photos yet";
  if (count === 1) return "1 photo";
  return `${count} photos`;
}

export type MomentMediaStatusRow = {
  processing_status: string;
};

export function filterMomentIdsWithReadyMedia(
  momentIds: string[],
  mediaMap: Map<string, MomentMediaStatusRow[]>,
): string[] {
  return momentIds.filter((momentId) =>
    (mediaMap.get(momentId) ?? []).some(
      (row) => row.processing_status === "ready",
    ),
  );
}

export function countDistinctMomentsWithReadyMedia(
  momentIds: string[],
  mediaMap: Map<string, MomentMediaStatusRow[]>,
): number {
  return filterMomentIdsWithReadyMedia(momentIds, mediaMap).length;
}
