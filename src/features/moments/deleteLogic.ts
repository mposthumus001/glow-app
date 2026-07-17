export type SoftDeleteMomentRpcError =
  | "not_authenticated"
  | "not_found"
  | "wrong_baby"
  | "unknown";

export type SoftDeleteMomentRpcResult =
  | { ok: true; momentId: string; storagePaths: string[] }
  | { ok: false; error: SoftDeleteMomentRpcError };

export function mapSoftDeleteRpcError(
  code: string | null | undefined,
): string {
  switch (code) {
    case "not_authenticated":
      return "Please sign in again.";
    case "not_found":
      return "That Moment could not be found.";
    case "wrong_baby":
      return "That Moment could not be found.";
    default:
      return "Something didn't work just now. Please try again.";
  }
}

export function parseSoftDeleteRpcPayload(
  payload: unknown,
): SoftDeleteMomentRpcResult {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "unknown" };
  }

  const row = payload as {
    ok?: boolean;
    error?: string;
    moment_id?: string;
    storage_paths?: unknown;
  };

  if (!row.ok) {
    const code = row.error;
    if (
      code === "not_authenticated" ||
      code === "not_found" ||
      code === "wrong_baby"
    ) {
      return { ok: false, error: code };
    }
    return { ok: false, error: "unknown" };
  }

  if (!row.moment_id || typeof row.moment_id !== "string") {
    return { ok: false, error: "unknown" };
  }

  const storagePaths = Array.isArray(row.storage_paths)
    ? row.storage_paths.filter(
        (path): path is string =>
          typeof path === "string" && path.trim().length > 0,
      )
    : [];

  return {
    ok: true,
    momentId: row.moment_id,
    storagePaths: uniquePaths(storagePaths),
  };
}

/** Keep only paths owned by the given parent prefix — never cross-owner cleanup. */
export function filterOwnedStoragePaths(
  paths: string[],
  ownerParentId: string,
): string[] {
  const prefix = `${ownerParentId}/`;
  return uniquePaths(
    paths.filter((path) => path.startsWith(prefix) && !path.includes("..")),
  );
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((path) => path.trim()).filter(Boolean))];
}

export function validateDeleteMomentInput(input: {
  babyId: string;
  momentId: string;
}):
  | { ok: true; babyId: string; momentId: string }
  | { ok: false; error: string } {
  const babyId = input.babyId?.trim() ?? "";
  const momentId = input.momentId?.trim() ?? "";

  if (!babyId || !momentId) {
    return { ok: false, error: "That Moment could not be found." };
  }

  return { ok: true, babyId, momentId };
}
