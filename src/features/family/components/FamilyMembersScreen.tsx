"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, UserMinus, UserX } from "lucide-react";

import { GlowButton, GlowCard, GlowInput } from "@/components/ui";
import { textStyles } from "@/lib/theme";
import { cn } from "@/lib/utils/cn";

import {
  createSharedFamilyInviteAction,
  removeSharedFamilyMemberAction,
  revokeSharedFamilyInviteAction,
} from "../actions";
import { formatFamilyDate } from "../formatFamilyDate";
import type {
  CreateInviteResultData,
  SharedFamilyMembersPageData,
  SharedFamilyMemberRow,
  SharedFamilyPendingInviteRow,
} from "../types";
import {
  FAMILY_BACK_LINK_CLASS,
  FAMILY_CONTENT_CARD_CLASS,
  FAMILY_SECTION_STACK_CLASS,
} from "./familyPageLayout";
import { FamilyPageShell } from "./FamilyPageShell";
import { FamilyRoleBadge } from "./FamilyRoleBadge";
import { InviteLinkCopy } from "./InviteLinkCopy";

export type FamilyMembersScreenProps = SharedFamilyMembersPageData & {
  currentUserId: string;
};

export function FamilyMembersScreen({
  family,
  members: initialMembers,
  pendingInvites: initialPendingInvites,
  currentUserId,
}: FamilyMembersScreenProps) {
  const emailId = useId();
  const submittingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<CreateInviteResultData | null>(
    null,
  );
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialPendingInvites);
  const [pendingRevoke, setPendingRevoke] =
    useState<SharedFamilyPendingInviteRow | null>(null);
  const [pendingRemove, setPendingRemove] = useState<SharedFamilyMemberRow | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSaving = isPending;

  function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || isPending) return;

    submittingRef.current = true;
    setError(null);
    setCreatedInvite(null);

    startTransition(async () => {
      try {
        const result = await createSharedFamilyInviteAction({
          sharedFamilyId: family.id,
          email,
        });

        if (!result.ok) {
          setError(result.error);
          submittingRef.current = false;
          return;
        }

        setCreatedInvite(result.data);
        setEmail("");
        setPendingInvites((current) => [
          {
            id: result.data.inviteId,
            maskedEmail: result.data.maskedEmail,
            expiresAt: result.data.expiresAt,
            createdAt: result.data.expiresAt,
          },
          ...current.filter((row) => row.id !== result.data.inviteId),
        ]);
        submittingRef.current = false;
      } catch {
        setError("Something didn't work just now. Please try again.");
        submittingRef.current = false;
      }
    });
  }

  function handleRevokeConfirm() {
    if (!pendingRevoke || isPending) return;

    setActionError(null);
    startTransition(async () => {
      const result = await revokeSharedFamilyInviteAction({
        sharedFamilyId: family.id,
        inviteId: pendingRevoke.id,
      });

      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      setPendingInvites((current) =>
        current.filter((row) => row.id !== pendingRevoke.id),
      );
      if (createdInvite?.inviteId === pendingRevoke.id) {
        setCreatedInvite(null);
      }
      setPendingRevoke(null);
    });
  }

  function handleRemoveConfirm() {
    if (!pendingRemove || isPending) return;

    setActionError(null);
    startTransition(async () => {
      const result = await removeSharedFamilyMemberAction({
        sharedFamilyId: family.id,
        memberId: pendingRemove.id,
      });

      if (!result.ok) {
        setActionError(result.error);
        return;
      }

      setMembers((current) =>
        current.filter((row) => row.id !== pendingRemove.id),
      );
      setPendingRemove(null);
    });
  }

  return (
    <FamilyPageShell>
      <Link
        href={`/family/${family.id}`}
        className={FAMILY_BACK_LINK_CLASS}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to family
      </Link>

      <header className="mb-4 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                textStyles.h1,
                "break-words text-[1.5rem] sm:text-[1.75rem]",
              )}
            >
              {family.name}
            </h1>
            <p className="mt-1.5 text-base leading-relaxed text-glow-text-secondary">
              Manage members
            </p>
          </div>
          <FamilyRoleBadge label="Owner" isOwner className="self-start" />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-glow-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Private
          </span>
          <span>
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        </div>
      </header>

      <div className={FAMILY_SECTION_STACK_CLASS}>
        <div className={FAMILY_CONTENT_CARD_CLASS}>
          <GlowCard padding="md" className="border-white/[0.08]">
            <h2 className="text-base font-medium text-glow-text">Invite someone</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-glow-text-secondary">
              Send a private link by email yourself — Glow does not send invite
              emails yet.
            </p>

            <form
              onSubmit={handleInviteSubmit}
              className="mt-4 flex flex-col gap-4"
              noValidate
            >
              <GlowInput
                id={emailId}
                name="email"
                type="email"
                label="Email address"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
                autoComplete="email"
                disabled={isSaving}
                error={error ?? undefined}
                placeholder="family@example.com"
              />

              <GlowButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSaving}
                disabled={isSaving}
                className="min-h-11 w-full sm:w-auto sm:min-w-[12rem]"
              >
                Send invite
              </GlowButton>
            </form>

            {createdInvite ? (
              <div
                className="mt-5 rounded-glow-input border border-glow-primary/20 bg-glow-primary/[0.06] p-4"
                role="status"
              >
                <p className="text-sm font-medium text-glow-text">
                  Invitation created for {createdInvite.maskedEmail}
                </p>
                <p className="mt-1 text-sm text-glow-text-secondary">
                  Expires {formatFamilyDate(createdInvite.expiresAt)}
                </p>
                <div className="mt-4">
                  <InviteLinkCopy inviteUrl={createdInvite.inviteUrl} />
                </div>
              </div>
            ) : null}
          </GlowCard>
        </div>

        <div className={FAMILY_CONTENT_CARD_CLASS}>
          <GlowCard padding="md" className="border-white/[0.08]">
            <h2 className="text-base font-medium text-glow-text">Active members</h2>
            <ul className="mt-4 divide-y divide-white/[0.06]">
              {members.map((member) => {
                const canRemove =
                  member.parentId !== currentUserId && member.role !== "owner";

                return (
                  <li
                    key={member.id}
                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-glow-text">
                        {member.displayName}
                      </p>
                      <p className="mt-0.5 text-xs text-glow-text-tertiary">
                        Joined {formatFamilyDate(member.joinedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <FamilyRoleBadge
                        label={member.roleLabel}
                        isOwner={member.role === "owner"}
                      />
                      {canRemove ? (
                        <GlowButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-9 text-red-300 hover:text-red-200"
                          leftIcon={
                            <UserMinus className="h-4 w-4" aria-hidden="true" />
                          }
                          onClick={() => setPendingRemove(member)}
                        >
                          Remove
                        </GlowButton>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </GlowCard>
        </div>

        <div className={FAMILY_CONTENT_CARD_CLASS}>
          <GlowCard padding="md" className="border-white/[0.08]">
            <h2 className="text-base font-medium text-glow-text">Pending invites</h2>
            {pendingInvites.length === 0 ? (
              <p className="mt-3 text-sm text-glow-text-secondary">
                No pending invitations.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.06]">
                {pendingInvites.map((invite) => {
                  const showCopyLink =
                    createdInvite?.inviteId === invite.id &&
                    Boolean(createdInvite.inviteUrl);

                  return (
                    <li
                      key={invite.id}
                      className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-glow-text">
                          {invite.maskedEmail}
                        </p>
                        <p className="mt-0.5 text-xs text-glow-text-tertiary">
                          Pending · Expires {formatFamilyDate(invite.expiresAt)}
                        </p>
                        {showCopyLink && createdInvite ? (
                          <div className="mt-3">
                            <InviteLinkCopy
                              inviteUrl={createdInvite.inviteUrl}
                              showOneTimeNotice={false}
                            />
                          </div>
                        ) : null}
                      </div>
                      <GlowButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-9 shrink-0 self-start text-red-300 hover:text-red-200"
                        leftIcon={
                          <UserX className="h-4 w-4" aria-hidden="true" />
                        }
                        onClick={() => setPendingRevoke(invite)}
                      >
                        Revoke
                      </GlowButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlowCard>
        </div>
      </div>

      {actionError ? (
        <p
          className="mt-4 rounded-glow-input bg-red-500/10 px-3 py-2 text-sm text-red-300"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingRevoke)}
        title="Revoke invitation?"
        description="They won't be able to use this link anymore. You can send a new invitation later."
        confirmLabel="Revoke invite"
        submitting={isPending}
        onCancel={() => setPendingRevoke(null)}
        onConfirm={handleRevokeConfirm}
      />

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remove member?"
        description="They will lose access to this family album immediately."
        confirmLabel="Remove member"
        submitting={isPending}
        onCancel={() => setPendingRemove(null)}
        onConfirm={handleRemoveConfirm}
      />
    </FamilyPageShell>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  submitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-glow-card border border-white/[0.08] bg-glow-card p-5 shadow-glow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="text-lg font-semibold text-glow-text">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <GlowButton
            type="button"
            variant="ghost"
            size="md"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </GlowButton>
          <GlowButton
            type="button"
            variant="primary"
            size="md"
            isLoading={submitting}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-500"
            onClick={onConfirm}
          >
            {confirmLabel}
          </GlowButton>
        </div>
      </div>
    </div>
  );
}
