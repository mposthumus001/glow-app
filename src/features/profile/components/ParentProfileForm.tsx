"use client";

import { useActionState } from "react";

import {
  AU_STATES,
  FEEDING_METHODS,
} from "@/lib/auth/constants";
import { GlowButton, GlowInput, GlowSelect } from "@/components/ui";
import {
  updateParentProfile,
  type ProfileActionState,
} from "@/features/profile/actions";
import { displayNameInitials } from "@/features/profile/validation";

const initial: ProfileActionState = {};

export function ParentProfileForm({
  displayName,
  state,
  feedingMethod,
  firstChild,
}: {
  displayName: string;
  state: string;
  feedingMethod: string;
  firstChild: boolean;
}) {
  const [formState, action, pending] = useActionState(
    updateParentProfile,
    initial,
  );
  const initials = displayNameInitials(displayName);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full bg-glow-primary/15 text-lg font-semibold text-glow-primary"
          aria-hidden="true"
        >
          {initials}
        </div>
        <p className="text-sm text-glow-text-secondary">
          A soft initial mark — Glow doesn’t use profile photos in beta.
        </p>
      </div>

      <GlowInput
        label="Display name"
        name="display_name"
        required
        maxLength={80}
        defaultValue={displayName}
        hint="First name or nickname is enough — not your full legal name."
      />

      <GlowSelect
        label="State"
        name="state"
        required
        options={AU_STATES}
        defaultValue={state}
      />

      <GlowSelect
        label="Feeding preference"
        name="feeding_method"
        required
        options={FEEDING_METHODS}
        defaultValue={feedingMethod}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-glow-text-secondary">
          Is this your first child?
        </legend>
        <div className="flex gap-4">
          <label className="flex min-h-11 items-center gap-2 text-sm text-glow-text">
            <input
              type="radio"
              name="first_child"
              value="true"
              defaultChecked={firstChild}
              className="accent-glow-primary"
            />
            Yes
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-glow-text">
            <input
              type="radio"
              name="first_child"
              value="false"
              defaultChecked={!firstChild}
              className="accent-glow-primary"
            />
            No
          </label>
        </div>
      </fieldset>

      {formState.error ? (
        <p className="text-sm text-glow-error" role="alert">
          {formState.error}
        </p>
      ) : null}
      {formState.success ? (
        <p className="text-sm text-glow-success" role="status">
          {formState.success}
        </p>
      ) : null}

      <GlowButton type="submit" variant="primary" isLoading={pending}>
        Save profile
      </GlowButton>
    </form>
  );
}
