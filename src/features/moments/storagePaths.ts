export {
  buildMomentMediaPaths,
  buildMomentStoragePaths,
  extensionForMime,
  isStoragePathOwnedBy,
  isValidDisplayPath,
  isValidOriginalPath,
  parseStoragePathOwnerId,
  pathsBelongToMedia,
  type MomentMediaPaths,
} from "./processing/paths.ts";

/** @deprecated Use isValidOriginalPath */
export { isValidOriginalPath as isValidMomentStoragePath } from "./processing/paths.ts";
