"use client";

import { useActionState } from "react";

import { GlowButton, GlowSelect, GlowTextarea } from "@/components/ui";
import {
  submitAppFeedback,
  type ProfileActionState,
} from "@/features/profile/actions";

const initial: ProfileActionState = {};

const CATEGORIES = [
  { value: "feedback", label: "General feedback" },
  { value: "technical", label: "Technical issue" },
  { value: "safety", label: "Safety concern" },
  { value: "other", label: "Something else" },
];

export function FeedbackForm({
  appVersion,
  routeContext,
}: {
  appVersion: string;
  routeContext?: string;
}) {
  const [formState, action, pending] = useActionState(
    submitAppFeedback,
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="app_version" value={appVersion} />
      <input type="hidden" name="route_context" value={routeContext ?? ""} />

      <GlowSelect
        label="Category"
        name="category"
        required
        options={CATEGORIES}
        defaultValue="feedback"
      />

      <GlowTextarea
        label="Your message"
        name="message"
        required
        maxLength={2000}
        rows={5}
        hint="Please don’t include Circle message content, passwords, or other people’s private details."
      />

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
        Send feedback
      </GlowButton>
    </form>
  );
}
