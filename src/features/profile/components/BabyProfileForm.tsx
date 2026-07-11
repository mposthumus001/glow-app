"use client";

import { useActionState, useState } from "react";

import { FEEDING_METHODS } from "@/lib/auth/constants";
import { GlowButton, GlowInput, GlowSelect } from "@/components/ui";
import {
  updateBabyProfile,
  type ProfileActionState,
} from "@/features/profile/actions";

const initial: ProfileActionState = {};

export type BabyFormOption = {
  id: string;
  name: string;
  dateOfBirth: string | null;
  dueDate: string | null;
  feedingMethod: string | null;
};

export function BabyProfileForm({ babies }: { babies: BabyFormOption[] }) {
  const [selectedId, setSelectedId] = useState(babies[0]?.id ?? "");
  const selected = babies.find((b) => b.id === selectedId) ?? babies[0];
  const [formState, action, pending] = useActionState(
    updateBabyProfile,
    initial,
  );

  if (!selected) {
    return (
      <p className="text-sm text-glow-text-secondary">
        No baby profile yet. You can add one during onboarding or from Baby
        tracking later.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" key={selected.id}>
      {babies.length > 1 ? (
        <GlowSelect
          label="Which baby?"
          name="baby_picker"
          options={babies.map((b) => ({ value: b.id, label: b.name }))}
          defaultValue={selected.id}
          onChange={(e) => setSelectedId(e.target.value)}
        />
      ) : null}

      <input type="hidden" name="baby_id" value={selected.id} />

      <GlowInput
        label="Baby name"
        name="name"
        required
        maxLength={80}
        defaultValue={selected.name}
      />

      <GlowInput
        label="Date of birth"
        name="date_of_birth"
        type="date"
        defaultValue={selected.dateOfBirth ?? ""}
        hint="Use due date instead if your baby hasn’t arrived yet."
      />

      <GlowInput
        label="Due date"
        name="due_date"
        type="date"
        defaultValue={selected.dueDate ?? ""}
      />

      <GlowSelect
        label="Feeding method (optional)"
        name="feeding_method"
        options={[
          { value: "", label: "Not set" },
          ...FEEDING_METHODS,
        ]}
        defaultValue={selected.feedingMethod ?? ""}
      />

      <p className="text-sm text-glow-text-tertiary">
        Baby tracking is informational only — not medical advice. We don’t store
        sensitive health records here.
      </p>

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
        Save baby profile
      </GlowButton>
    </form>
  );
}
