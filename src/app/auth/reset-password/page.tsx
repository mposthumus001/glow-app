import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

/**
 * Dedicated password recovery route.
 * Recovery links should land here (via /auth/callback?next=/auth/reset-password).
 * This page never shows the normal login form.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
