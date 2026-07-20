"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

import { buildNavEnv, getAppNavItems, resolveActiveNav, type AppNavId } from "./nav";

export type DesktopSideNavProps = {
  activeId?: AppNavId;
  className?: string;
  circleUnreadHint?: string | null;
  /** Server-resolved flag so nav matches /family route gating. */
  familyAlbumEnabled?: boolean;
};

/**
 * Restrained desktop/tablet side navigation — intimate, not a dashboard rail.
 */
export function DesktopSideNav({
  activeId: activeIdProp,
  className,
  circleUnreadHint = null,
  familyAlbumEnabled,
}: DesktopSideNavProps) {
  const pathname = usePathname();
  const activeId = activeIdProp ?? resolveActiveNav(pathname);
  const navItems = getAppNavItems(buildNavEnv(familyAlbumEnabled));

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-[var(--glow-side-nav-width)] flex-col",
        "border-r border-white/[0.06] bg-[rgba(8,11,22,0.92)] backdrop-blur-xl",
        "pt-safe pb-safe lg:flex",
        className,
      )}
      aria-label="Main"
    >
      <div className="flex flex-1 flex-col px-3 py-6">
        <Link
          href="/"
          className={cn(
            "glow-gradient-text mb-8 px-3 text-2xl font-bold tracking-tight",
            "rounded-lg focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-glow-primary/50",
          )}
        >
          Glow
        </Link>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeId;
            const hint =
              item.id === "circle" && circleUnreadHint
                ? circleUnreadHint
                : null;

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={
                  hint ? `${item.desktopLabel}, ${hint}` : item.desktopLabel
                }
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5",
                  "text-sm font-medium transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
                  isActive
                    ? "bg-glow-primary/10 text-glow-primary"
                    : "text-glow-text-secondary hover:bg-white/[0.04] hover:text-glow-text",
                )}
              >
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                  {item.desktopLabel}
                </span>
                {hint ? (
                  <span className="shrink-0 text-[11px] font-normal text-glow-text-tertiary">
                    {hint}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <p className="mt-auto px-3 pt-6 text-[11px] leading-relaxed text-glow-text-tertiary">
          A calm space for parents.
        </p>
      </div>
    </aside>
  );
}
