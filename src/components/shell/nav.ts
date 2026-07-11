import { Baby, Leaf, Moon, User, Users, type LucideIcon } from "lucide-react";

export type AppNavId = "tonight" | "circle" | "baby" | "calm" | "profile";

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
 * Permanent primary navigation — five destinations maximum.
 * Order is product-intentional: Tonight first (default landing).
 */
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
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

/**
 * Resolve active nav from pathname.
 * Nested Circle routes keep Circle active.
 */
export function resolveActiveNav(pathname: string): AppNavId {
  const path = pathname.split("?")[0] || "/";

  if (path === "/" || path === "") return "tonight";
  if (path === "/circle" || path.startsWith("/circle/")) return "circle";
  if (path === "/baby" || path.startsWith("/baby/")) return "baby";
  if (path === "/calm" || path.startsWith("/calm/")) return "calm";
  if (path === "/profile" || path.startsWith("/profile/")) return "profile";

  return "tonight";
}

export function isAppNavId(value: string): value is AppNavId {
  return APP_NAV_ITEMS.some((item) => item.id === value);
}
