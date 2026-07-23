import { FAMILY_INVITE_TOKEN_HEX_LENGTH } from "./config.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim and lower-case invite email — matches DB normalisation. */
export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidInviteEmail(email: string): boolean {
  const normalized = normalizeInviteEmail(email);
  return (
    normalized.length >= 3 &&
    normalized.length <= 320 &&
    EMAIL_PATTERN.test(normalized)
  );
}

/** Mask invite email for owner pending-invite list — never show full address. */
export function maskInviteEmail(email: string): string {
  const normalized = normalizeInviteEmail(email);
  const at = normalized.indexOf("@");
  if (at <= 0) return "•••••@•••••";

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (!domain) return "•••••@•••••";

  const maskedLocal =
    local.length <= 1
      ? "•••••"
      : `${local[0]}${"•".repeat(Math.min(5, Math.max(3, local.length - 1)))}`;

  return `${maskedLocal}@${domain}`;
}

/** Raw invite tokens are 32 random bytes encoded as hex (64 chars). */
export function isValidInviteTokenFormat(token: string): boolean {
  const trimmed = token.trim();
  return (
    trimmed.length === FAMILY_INVITE_TOKEN_HEX_LENGTH &&
    /^[a-f0-9]+$/i.test(trimmed)
  );
}

/** Lowercase hex token for RPC hash lookup — tokens are generated as lowercase hex. */
export function normalizeInviteToken(rawToken: string): string {
  return rawToken.trim().toLowerCase();
}

export function buildInvitePath(rawToken: string): string {
  return `/family/invite/${normalizeInviteToken(rawToken)}`;
}

/** Prefer NEXT_PUBLIC_SITE_URL; returns relative path when unset. */
export function buildInviteUrl(
  siteUrl: string | undefined,
  rawToken: string,
): string {
  const path = buildInvitePath(rawToken);
  const base = siteUrl?.trim().replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

/** Client-only: absolute URL for clipboard when env URL is missing. */
export function resolveInviteUrlForCopy(
  inviteUrl: string,
  origin?: string,
): string {
  if (inviteUrl.startsWith("http://") || inviteUrl.startsWith("https://")) {
    return inviteUrl;
  }
  const base = origin?.replace(/\/$/, "") ?? "";
  return base ? `${base}${inviteUrl}` : inviteUrl;
}

export function memberDisplayName(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim();
  if (!trimmed || trimmed.toLowerCase() === "new parent") {
    return "Family member";
  }
  return trimmed;
}
