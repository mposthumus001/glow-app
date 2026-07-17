"use client";

import { useActionState, useCallback } from "react";
import { usePathname } from "next/navigation";

import { GlowButton, GlowInput, GlowSelect, GlowTextarea } from "@/components/ui";
import {
  submitBetaFeedback,
  type ProfileActionState,
} from "@/features/profile/actions";

const initial: ProfileActionState = {};

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "confusing", label: "Confusing" },
  { value: "suggestion", label: "Suggestion" },
  { value: "other", label: "Other" },
];

function readClientContext(): { userAgent: string; viewport: string } {
  if (typeof window === "undefined") {
    return { userAgent: "", viewport: "" };
  }

  return {
    userAgent: navigator.userAgent.slice(0, 512),
    viewport: `${window.innerWidth}x${window.innerHeight}`.slice(0, 32),
  };
}

export function FeedbackForm({
  appVersion,
  routeContext,
}: {
  appVersion: string;
  routeContext?: string;
}) {
  const pathname = usePathname();

  const submitWithClientContext = useCallback(
    async (prev: ProfileActionState, formData: FormData) => {
      const ctx = readClientContext();
      formData.set("user_agent", ctx.userAgent);
      formData.set("viewport", ctx.viewport);
      return submitBetaFeedback(prev, formData);
    },
    [],
  );

  const [formState, action, pending] = useActionState(
    submitWithClientContext,
    initial,
  );

  const route = routeContext || pathname || "/profile/help";
  const submitted = Boolean(formState.success);

  if (submitted && formState.success) {
    return (
      <div
        className="rounded-glow-card border border-glow-success/30 bg-glow-success/10 p-5"
        role="status"
      >
        <h3 className="text-base font-semibold text-glow-text">
          Thank you
        </h3>
        <p className="mt-2 text-sm text-glow-text-secondary">
          {formState.success}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="app_version" value={appVersion} />
      <input type="hidden" name="route" value={route} />

      <GlowSelect
        label="Category"
        name="category"
        required
        options={CATEGORIES}
        defaultValue="suggestion"
      />

      <GlowInput
        label="Short description"
        name="summary"
        required
        maxLength={200}
        placeholder="What happened or what would help?"
      />

      <GlowTextarea
        label="More detail (optional)"
        name="details"
        maxLength={2000}
        rows={5}
        hint="Please don’t include Circle messages, passwords, photos, or other people’s private details."
      />

      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-glow-text-secondary">
        <input
          type="checkbox"
          name="contact_allowed"
          value="true"
          className="mt-1 size-4 accent-glow-primary"
        />
        <span>
          Glow may contact me about this feedback using my account email.
        </span>
      </label>

      {formState.error ? (
        <p className="text-sm text-glow-error" role="alert">
          {formState.error}
        </p>
      ) : null}

      <GlowButton
        type="submit"
        variant="primary"
        isLoading={pending}
        disabled={pending}
      >
        Send feedback
      </GlowButton>
    </form>
  );
}
