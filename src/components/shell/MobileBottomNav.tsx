"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

import { buildNavEnv, getAppNavItems, resolveActiveNav, type AppNavId } from "./nav";

export type MobileBottomNavProps = {
  activeId?: AppNavId;
  className?: string;
  circleUnreadHint?: string | null;
  /** Server-resolved flag so nav matches /family route gating. */
  familyAlbumEnabled?: boolean;
};

/**
 * Permanent mobile bottom navigation — safe-area aware.
 * Family appears only when Family Album is enabled.
 */
export function MobileBottomNav({
  activeId: activeIdProp,
  className,
  circleUnreadHint = null,
  familyAlbumEnabled,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const activeId = activeIdProp ?? resolveActiveNav(pathname);
  const navItems = getAppNavItems(buildNavEnv(familyAlbumEnabled));

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]",
        "lg:hidden",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-[3.75rem] max-w-lg items-center justify-between gap-0.5 rounded-[1.75rem] px-1.5",
          "border border-white/[0.08] bg-[rgba(10,14,28,0.78)]",
          "shadow-[0_8px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]",
          "backdrop-blur-2xl",
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;
          const hint =
            item.id === "circle" && circleUnreadHint ? circleUnreadHint : null;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={
                hint ? `${item.desktopLabel}, ${hint}` : item.desktopLabel
              }
              className={cn(
                "relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 py-1.5",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
                isActive
                  ? "text-glow-primary"
                  : "text-glow-text-tertiary hover:text-glow-text-secondary",
              )}
            >
              {isActive ? (
                <span
                  className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-glow-primary/10"
                  aria-hidden="true"
                />
              ) : null}
              <Icon
                className={cn(
                  "relative z-[1] h-[17px] w-[17px] shrink-0",
                  isActive && "drop-shadow-[0_0_8px_rgba(182,148,255,0.45)]",
                )}
                strokeWidth={isActive ? 2.35 : 1.7}
                aria-hidden="true"
              />
              <span className="relative z-[1] w-full truncate text-center text-[9px] font-medium leading-none tracking-wide">
                {item.label}
              </span>
              {hint ? (
                <span className="relative z-[1] mt-0.5 w-full truncate text-center text-[8px] text-glow-text-tertiary">
                  {hint}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
