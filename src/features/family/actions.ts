"use server";

import { revalidatePath } from "next/cache";

import { calmUserFacingError } from "@/lib/errors/calm-messages";
import { reportOperationalFailure } from "@/lib/monitoring/report-error";
import { createClient } from "@/lib/supabase/server";

import { isFamilyAlbumEnabled } from "./config";
import type { FamilyActionResult } from "./types";
import {
  mapFamilyRpcError,
  validateCreateSharedFamilyInput,
  type CreateSharedFamilyInput,
} from "./validation";

type RpcPayload = {
  ok?: boolean;
  error?: string;
  shared_family_id?: string;
  member_id?: string;
};

async function requireAuthenticatedParent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as null, error: "Please sign in again." };
  }

  return { supabase, user, error: null as null };
}

function parseRpc(payload: unknown): RpcPayload {
  if (payload && typeof payload === "object") {
    return payload as RpcPayload;
  }
  return {};
}

export async function createSharedFamilyAction(
  input: CreateSharedFamilyInput,
): Promise<FamilyActionResult<{ sharedFamilyId: string }>> {
  if (!isFamilyAlbumEnabled()) {
    return { ok: false, error: "Family Album is not available yet." };
  }

  const parsed = validateCreateSharedFamilyInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) {
    return { ok: false, error: error ?? "Please sign in again." };
  }

  const { data, error: rpcError } = await supabase.rpc("create_shared_family", {
    p_name: parsed.value.name,
  });

  if (rpcError) {
    reportOperationalFailure(rpcError.message, {
      featureArea: "family",
      operation: "create_shared_family",
      supabaseCode: rpcError.code,
      userId: user.id,
    });
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (!result.ok || !result.shared_family_id) {
    return { ok: false, error: mapFamilyRpcError(result.error) };
  }

  revalidatePath("/family");
  revalidatePath(`/family/${result.shared_family_id}`);

  return {
    ok: true,
    data: { sharedFamilyId: result.shared_family_id },
  };
}
