"use server";

import { revalidatePath } from "next/cache";

import { calmUserFacingError } from "@/lib/errors/calm-messages";
import { reportOperationalFailure } from "@/lib/monitoring/report-error";
import { createClient } from "@/lib/supabase/server";

import { isFamilyAlbumEnabled } from "./config";
import { buildInvitePath, buildInviteUrl, isValidInviteTokenFormat, maskInviteEmail } from "./inviteUtils";
import type {
  CreateInviteResultData,
  FamilyActionResult,
  InviteAcceptCategory,
} from "./types";
import {
  mapFamilyRpcError,
  mapInviteAcceptCategory,
  mapInviteAcceptMessage,
  mapInviteRpcError,
  validateCreateSharedFamilyInput,
  validateCreateSharedFamilyInviteInput,
  type CreateSharedFamilyInput,
} from "./validation";

type RpcPayload = {
  ok?: boolean;
  error?: string;
  shared_family_id?: string;
  member_id?: string;
  invite_id?: string;
  invite_token?: string;
  expires_at?: string;
  status?: string;
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

function featureDisabled(): FamilyActionResult<never> {
  return { ok: false, error: "Family Album is not available yet." };
}

export async function createSharedFamilyAction(
  input: CreateSharedFamilyInput,
): Promise<FamilyActionResult<{ sharedFamilyId: string }>> {
  if (!isFamilyAlbumEnabled()) {
    return featureDisabled();
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
      responseCategory: "rpc_transport_error",
    });
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (!result.ok || !result.shared_family_id) {
    reportOperationalFailure(result.error ?? "create_shared_family_failed", {
      featureArea: "family",
      operation: "create_shared_family",
      userId: user.id,
      responseCategory: result.error ?? "rpc_rejected",
    });
    return { ok: false, error: mapFamilyRpcError(result.error) };
  }

  revalidatePath("/family");
  revalidatePath(`/family/${result.shared_family_id}`);

  return {
    ok: true,
    data: { sharedFamilyId: result.shared_family_id },
  };
}

export async function createSharedFamilyInviteAction(input: {
  sharedFamilyId: string;
  email: string;
}): Promise<FamilyActionResult<CreateInviteResultData>> {
  if (!isFamilyAlbumEnabled()) {
    return featureDisabled();
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) {
    return { ok: false, error: error ?? "Please sign in again." };
  }

  const parsed = validateCreateSharedFamilyInviteInput({
    sharedFamilyId: input.sharedFamilyId,
    email: input.email,
    authEmail: user.email,
  });
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const { data, error: rpcError } = await supabase.rpc(
    "create_shared_family_invite",
    {
      p_shared_family_id: parsed.value.sharedFamilyId,
      p_email: parsed.value.email,
    },
  );

  if (rpcError) {
    reportOperationalFailure(rpcError.message, {
      featureArea: "family",
      operation: "create_shared_family_invite",
      supabaseCode: rpcError.code,
      userId: user.id,
      entityRef: parsed.value.sharedFamilyId,
      responseCategory: "rpc_transport_error",
    });
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (
    !result.ok ||
    !result.invite_id ||
    !result.invite_token ||
    !result.expires_at
  ) {
    reportOperationalFailure(result.error ?? "create_invite_failed", {
      featureArea: "family",
      operation: "create_shared_family_invite",
      userId: user.id,
      entityRef: parsed.value.sharedFamilyId,
      responseCategory: result.error ?? "rpc_rejected",
    });
    return { ok: false, error: mapInviteRpcError(result.error) };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const invitePath = buildInvitePath(result.invite_token);
  const inviteUrl = buildInviteUrl(siteUrl, result.invite_token);

  revalidatePath(`/family/${parsed.value.sharedFamilyId}`);
  revalidatePath(`/family/${parsed.value.sharedFamilyId}/members`);

  return {
    ok: true,
    data: {
      inviteId: result.invite_id,
      invitePath,
      inviteUrl,
      maskedEmail: maskInviteEmail(parsed.value.email),
      expiresAt: result.expires_at,
      rawToken: result.invite_token,
    },
  };
}

export type AcceptInviteActionResult =
  | { ok: true; sharedFamilyId: string }
  | { ok: false; error: string; category: InviteAcceptCategory };

export async function acceptSharedFamilyInviteAction(
  rawToken: string,
): Promise<AcceptInviteActionResult> {
  if (!isFamilyAlbumEnabled()) {
    return {
      ok: false,
      error: "Family Album is not available yet.",
      category: "unavailable",
    };
  }

  if (!isValidInviteTokenFormat(rawToken)) {
    return {
      ok: false,
      error: mapInviteAcceptMessage("invalid"),
      category: "invalid",
    };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) {
    return {
      ok: false,
      error: mapInviteAcceptMessage("needs_auth"),
      category: "needs_auth",
    };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "accept_shared_family_invite",
    { p_raw_token: rawToken.trim() },
  );

  if (rpcError) {
    reportOperationalFailure(rpcError.message, {
      featureArea: "family",
      operation: "accept_shared_family_invite",
      supabaseCode: rpcError.code,
      userId: user.id,
      responseCategory: "rpc_transport_error",
    });
    return {
      ok: false,
      error: mapInviteAcceptMessage("unavailable"),
      category: "unavailable",
    };
  }

  const result = parseRpc(data);
  if (result.ok && result.shared_family_id) {
    revalidatePath("/family");
    revalidatePath(`/family/${result.shared_family_id}`);
    return { ok: true, sharedFamilyId: result.shared_family_id };
  }

  const category = mapInviteAcceptCategory(result.error, true);
  reportOperationalFailure(result.error ?? "accept_invite_failed", {
    featureArea: "family",
    operation: "accept_shared_family_invite",
    userId: user.id,
    responseCategory: category,
  });

  return {
    ok: false,
    error: mapInviteAcceptMessage(category),
    category,
  };
}

export async function revokeSharedFamilyInviteAction(input: {
  sharedFamilyId: string;
  inviteId: string;
}): Promise<FamilyActionResult<{ inviteId: string }>> {
  if (!isFamilyAlbumEnabled()) {
    return featureDisabled();
  }

  const sharedFamilyId = input.sharedFamilyId.trim();
  const inviteId = input.inviteId.trim();
  if (!sharedFamilyId || !inviteId) {
    return { ok: false, error: "That invitation could not be found." };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) {
    return { ok: false, error: error ?? "Please sign in again." };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "revoke_shared_family_invite",
    { p_invite_id: inviteId },
  );

  if (rpcError) {
    reportOperationalFailure(rpcError.message, {
      featureArea: "family",
      operation: "revoke_shared_family_invite",
      supabaseCode: rpcError.code,
      userId: user.id,
      entityRef: sharedFamilyId,
      responseCategory: "rpc_transport_error",
    });
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (!result.ok) {
    reportOperationalFailure(result.error ?? "revoke_invite_failed", {
      featureArea: "family",
      operation: "revoke_shared_family_invite",
      userId: user.id,
      entityRef: sharedFamilyId,
      responseCategory: result.error ?? "rpc_rejected",
    });
    return { ok: false, error: mapInviteRpcError(result.error) };
  }

  revalidatePath(`/family/${sharedFamilyId}`);
  revalidatePath(`/family/${sharedFamilyId}/members`);

  return { ok: true, data: { inviteId } };
}

export async function removeSharedFamilyMemberAction(input: {
  sharedFamilyId: string;
  memberId: string;
}): Promise<FamilyActionResult<{ memberId: string }>> {
  if (!isFamilyAlbumEnabled()) {
    return featureDisabled();
  }

  const sharedFamilyId = input.sharedFamilyId.trim();
  const memberId = input.memberId.trim();
  if (!sharedFamilyId || !memberId) {
    return { ok: false, error: "That member could not be found." };
  }

  const { supabase, user, error } = await requireAuthenticatedParent();
  if (error || !user) {
    return { ok: false, error: error ?? "Please sign in again." };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "remove_shared_family_member",
    { p_member_id: memberId },
  );

  if (rpcError) {
    reportOperationalFailure(rpcError.message, {
      featureArea: "family",
      operation: "remove_shared_family_member",
      supabaseCode: rpcError.code,
      userId: user.id,
      entityRef: sharedFamilyId,
      responseCategory: "rpc_transport_error",
    });
    return {
      ok: false,
      error: calmUserFacingError(rpcError.message, "profile"),
    };
  }

  const result = parseRpc(data);
  if (!result.ok) {
    reportOperationalFailure(result.error ?? "remove_member_failed", {
      featureArea: "family",
      operation: "remove_shared_family_member",
      userId: user.id,
      entityRef: sharedFamilyId,
      responseCategory: result.error ?? "rpc_rejected",
    });
    return { ok: false, error: mapInviteRpcError(result.error) };
  }

  revalidatePath(`/family/${sharedFamilyId}`);
  revalidatePath(`/family/${sharedFamilyId}/members`);

  return { ok: true, data: { memberId } };
}
