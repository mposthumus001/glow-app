"use client";

import { useActionState, useState } from "react";

import { MAP_VISIBILITY_OPTIONS } from "@/lib/auth/constants";
import type { MapVisibility } from "@/lib/supabase/database.types";
import { GlowButton, GlowInput } from "@/components/ui";
import {
  updateAtlasPrivacy,
  type ProfileActionState,
} from "@/features/profile/actions";
import { cn } from "@/lib/utils/cn";

const initial: ProfileActionState = {};

export function AtlasPrivacyForm({
  mapVisibility,
  suburbArea,
}: {
  mapVisibility: MapVisibility;
  suburbArea: string | null;
}) {
  const [visibility, setVisibility] = useState<MapVisibility>(mapVisibility);
  const [formState, action, pending] = useActionState(
    updateAtlasPrivacy,
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-glow-text-secondary">
          How you appear on Glow Atlas
        </legend>
        <div className="space-y-3">
          {MAP_VISIBILITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors",
                visibility === option.value
                  ? "border-glow-primary/40 bg-glow-primary/[0.06]"
                  : "border-white/[0.08] hover:border-white/[0.12]",
              )}
            >
              <input
                type="radio"
                name="map_visibility"
                value={option.value}
                checked={visibility === option.value}
                onChange={() => setVisibility(option.value)}
                className="mt-1 accent-glow-primary"
              />
              <span>
                <span className="block font-medium text-glow-text">
                  {option.label}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-glow-text-secondary">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {visibility === "suburb_area" ? (
        <GlowInput
          label="Suburb area label"
          name="suburb_area"
          maxLength={80}
          defaultValue={suburbArea ?? ""}
          required
          hint="A coarse area name only — never a street address. Exact GPS is never stored or shown."
        />
      ) : (
        <input type="hidden" name="suburb_area" value="" />
      )}

      <p className="text-sm text-glow-text-tertiary">
        Glow never displays exact GPS. Suburb clusters only appear when enough
        parents are awake nearby (at least five).
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
        Save privacy
      </GlowButton>
    </form>
  );
}
