"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { GlowButton, GlowCard, GlowInput } from "@/components/ui";
import { PageHeader } from "@/components/shell/PageHeader";

import { createSharedFamilyAction } from "../actions";
import { FAMILY_NAME_MAX } from "../config";
import { validateCreateSharedFamilyInput } from "../validation";
import {
  FAMILY_BACK_LINK_CLASS,
  FAMILY_CONTENT_CARD_CLASS,
} from "./familyPageLayout";
import { FamilyPageShell } from "./FamilyPageShell";

export function CreateFamilyScreen() {
  const router = useRouter();
  const nameId = useId();
  const submittingRef = useRef(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSaving = isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || isPending) return;

    const parsed = validateCreateSharedFamilyInput({ name });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    submittingRef.current = true;
    setError(null);

    startTransition(async () => {
      try {
        const result = await createSharedFamilyAction({
          name: parsed.value.name,
        });
        if (!result.ok) {
          setError(result.error);
          submittingRef.current = false;
          return;
        }

        router.push(`/family/${result.data.sharedFamilyId}`);
        router.refresh();
      } catch {
        setError("Something didn't work just now. Please try again.");
        submittingRef.current = false;
      }
    });
  }

  return (
    <FamilyPageShell>
      <Link href="/family" className={FAMILY_BACK_LINK_CLASS}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Family
      </Link>

      <PageHeader
        title="Create a family"
        subtitle="Create a private space for the people you choose."
        className="pb-4"
      />

      <div className={FAMILY_CONTENT_CARD_CLASS}>
        <GlowCard padding="md" className="border-white/[0.08]">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
            noValidate
          >
            <GlowInput
              id={nameId}
              name="name"
              label="Family name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              maxLength={FAMILY_NAME_MAX}
              autoComplete="off"
              disabled={isSaving}
              error={error ?? undefined}
              placeholder="e.g. The Parkers"
            />

            <div className="pt-1">
              <GlowButton
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSaving}
                disabled={isSaving}
                className="min-h-11 w-full sm:w-auto sm:min-w-[12rem]"
              >
                Create family
              </GlowButton>
            </div>
          </form>
        </GlowCard>
      </div>
    </FamilyPageShell>
  );
}
