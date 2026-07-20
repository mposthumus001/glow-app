import {
  Baby,
  Leaf,
  Moon,
  User,
  Users,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

import { isFamilyAlbumEnabled } from "../../features/family/config.ts";

export type AppNavId =
  | "tonight"
  | "circle"
  | "baby"
  | "family"
  | "calm"
  | "profile";

export type AppNavItem = {
  id: AppNavId;
  /** Short label for mobile bottom nav */
  label: string;
  /** Longer label for desktop side nav */
  desktopLabel: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Core primary navigation destinations.
 * Family is appended when NEXT_PUBLIC_FAMILY_ALBUM_ENABLED=true.
 */
export const CORE_NAV_ITEMS: readonly AppNavItem[] = [
  {
    id: "tonight",
    label: "Tonight",
    desktopLabel: "Tonight",
    href: "/",
    icon: Moon,
  },
  {
    id: "circle",
    label: "Circle",
    desktopLabel: "Your Circle",
    href: "/circle",
    icon: Users,
  },
  {
    id: "baby",
    label: "Baby",
    desktopLabel: "Baby",
    href: "/baby",
    icon: Baby,
  },
  {
    id: "calm",
    label: "Calm",
    desktopLabel: "Calm",
    href: "/calm",
    icon: Leaf,
  },
  {
    id: "profile",
    label: "You",
    desktopLabel: "You",
    href: "/profile",
    icon: User,
  },
] as const;

export const FAMILY_NAV_ITEM: AppNavItem = {
  id: "family",
  label: "Family",
  desktopLabel: "Family",
  href: "/family",
  icon: HeartHandshake,
};

/**
 * @deprecated Prefer getAppNavItems() — kept for tests that inspect core set.
 */
export const APP_NAV_ITEMS = CORE_NAV_ITEMS;

/**
 * Build env for nav gating. When `familyAlbumEnabled` is passed from the server
 * layout, nav matches route gating even if the client bundle has a stale build-time flag.
 */
export function buildNavEnv(
  familyAlbumEnabled?: boolean,
): Record<string, string | undefined> {
  if (typeof familyAlbumEnabled === "boolean") {
    return {
      NEXT_PUBLIC_FAMILY_ALBUM_ENABLED: familyAlbumEnabled ? "true" : "false",
    };
  }
  return process.env;
}

/**
 * Nav items for the current environment (Family gated by feature flag).
 */
export function getAppNavItems(
  env: Record<string, string | undefined> = process.env,
): readonly AppNavItem[] {
  if (!isFamilyAlbumEnabled(env)) {
    return CORE_NAV_ITEMS;
  }

  // Insert Family after Baby — separate from Moments, still near parenting areas.
  const items = [...CORE_NAV_ITEMS];
  const babyIndex = items.findIndex((item) => item.id === "baby");
  items.splice(babyIndex + 1, 0, FAMILY_NAV_ITEM);
  return items;
}

/**
 * Resolve active nav from pathname.
 * Nested Family / Circle / Baby routes keep their parent tab active.
 */
export function resolveActiveNav(pathname: string): AppNavId {
  const path = pathname.split("?")[0] || "/";

  if (path === "/" || path === "") return "tonight";
  if (path === "/circle" || path.startsWith("/circle/")) return "circle";
  if (path === "/baby" || path.startsWith("/baby/")) return "baby";
  if (path === "/family" || path.startsWith("/family/")) return "family";
  if (path === "/calm" || path.startsWith("/calm/")) return "calm";
  if (path === "/profile" || path.startsWith("/profile/")) return "profile";

  return "tonight";
}

export function isAppNavId(value: string): value is AppNavId {
  return (
    CORE_NAV_ITEMS.some((item) => item.id === value) || value === "family"
  );
}
