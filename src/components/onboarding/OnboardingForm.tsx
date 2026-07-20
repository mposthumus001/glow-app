"use client";

import { useActionState, useState } from "react";

import {
  AU_STATES,
  FEEDING_METHODS,
  MAP_VISIBILITY_OPTIONS,
} from "@/lib/auth/constants";
import {
  completeOnboarding,
  type OnboardingState,
} from "@/lib/auth/complete-onboarding";
import type { MapVisibility } from "@/lib/supabase/database.types";
import { GlowPage, GlowContainer } from "@/components/layout";
import { GlowButton, GlowInput, GlowSelect } from "@/components/ui";

const initialState: OnboardingState = {};

export function OnboardingForm({
  defaultDisplayName,
  defaultState,
  nextPath,
}: {
  defaultDisplayName?: string;
  defaultState?: string;
  nextPath?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    initialState,
  );
  const [mapVisibility, setMapVisibility] =
    useState<MapVisibility>("state_only");

  const showSuburb = mapVisibility === "suburb_area";

  return (
    <GlowPage>
      <main className="min-h-dvh overflow-y-auto pt-safe pb-safe">
        <GlowContainer size="sm" as="div" className="py-10">
          <div className="mb-8 text-center">
            <span className="glow-gradient-text text-3xl font-bold tracking-tight">
              Glow
            </span>
            <h1 className="mt-6 text-2xl font-semibold text-glow-text">
              A few calm details
            </h1>
            <p className="mt-2 text-sm text-glow-text-secondary">
              We never store a street address — only what you choose to share.
            </p>
          </div>

          <form
            action={formAction}
            className="flex flex-col gap-5 rounded-glow-card border border-glow-card-border bg-glow-card p-6 shadow-glow-card"
          >
            {nextPath ? (
              <input type="hidden" name="next" value={nextPath} />
            ) : null}
            <GlowInput
              label="Display name"
              name="display_name"
              required
              maxLength={80}
              defaultValue={
                defaultDisplayName && defaultDisplayName !== "New parent"
                  ? defaultDisplayName
                  : ""
              }
              placeholder="What should we call you?"
            />

            <GlowSelect
              label="State"
              name="state"
              required
              options={AU_STATES}
              defaultValue={defaultState ?? "VIC"}
            />

            <GlowSelect
              label="Feeding method"
              name="feeding_method"
              required
              options={FEEDING_METHODS}
              placeholder="Select one"
              defaultValue=""
            />

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-glow-text-secondary">
                First child?
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-glow-input border border-glow-card-border bg-glow-background-elevated px-3 text-sm has-[:checked]:border-glow-primary/50 has-[:checked]:bg-glow-primary-muted">
                  <input
                    type="radio"
                    name="first_child"
                    value="true"
                    defaultChecked
                    className="accent-glow-primary"
                  />
                  Yes
                </label>
                <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-glow-input border border-glow-card-border bg-glow-background-elevated px-3 text-sm has-[:checked]:border-glow-primary/50 has-[:checked]:bg-glow-primary-muted">
                  <input
                    type="radio"
                    name="first_child"
                    value="false"
                    className="accent-glow-primary"
                  />
                  No
                </label>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-glow-text-secondary">
                Map visibility
              </legend>
              <div className="flex flex-col gap-2">
                {MAP_VISIBILITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer gap-3 rounded-glow-input border border-glow-card-border bg-glow-background-elevated p-3 has-[:checked]:border-glow-primary/50 has-[:checked]:bg-glow-primary-muted"
                  >
                    <input
                      type="radio"
                      name="map_visibility"
                      value={option.value}
                      checked={mapVisibility === option.value}
                      onChange={() => setMapVisibility(option.value)}
                      className="mt-1 accent-glow-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium text-glow-text">
                        {option.label}
                      </span>
                      <span className="block text-xs text-glow-text-tertiary">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {showSuburb ? (
              <GlowInput
                label="Suburb area (optional)"
                name="suburb_area"
                maxLength={80}
                placeholder="e.g. Inner North"
                hint="Coarse area only — never a street address."
              />
            ) : (
              <input type="hidden" name="suburb_area" value="" />
            )}

            <div className="border-t border-glow-card-border pt-5">
              <p className="mb-4 text-sm font-medium text-glow-text">
                Baby details{" "}
                <span className="font-normal text-glow-text-tertiary">
                  (optional)
                </span>
              </p>
              <div className="flex flex-col gap-4">
                <GlowInput
                  label="Baby name"
                  name="baby_name"
                  maxLength={80}
                  placeholder="Optional"
                />
                <GlowInput
                  label="Date of birth"
                  name="date_of_birth"
                  type="date"
                />
                <GlowInput label="Due date" name="due_date" type="date" />
              </div>
            </div>

            {state.error ? (
              <p className="rounded-glow-input bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {state.error}
              </p>
            ) : null}

            <GlowButton type="submit" fullWidth isLoading={isPending}>
              Enter Glow
            </GlowButton>
          </form>
        </GlowContainer>
      </main>
    </GlowPage>
  );
}
