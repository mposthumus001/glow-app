"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { GlowPage } from "@/components/layout";
import { usePresenceConnection } from "@/features/presence";
import { cn } from "@/lib/utils/cn";

import { DesktopSideNav } from "./DesktopSideNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { resolveActiveNav } from "./nav";
import { ReconnectBanner } from "./ReconnectBanner";

export type AppShellProps = {
  children: React.ReactNode;
  circleNavHint?: string | null;
};

/**
 * Permanent authenticated shell.
 *
 * Owns: navigation, safe areas, background, presence lifecycle,
 * and a quiet global reconnect banner.
 *
 * Does not own: Atlas cluster subscription (Tonight) or Circle messaging
 * (Circle) — those stay feature-scoped to avoid duplicate channels.
 */
export function AppShell({
  children,
  circleNavHint = null,
}: AppShellProps) {
  const pathname = usePathname();
  const activeId = resolveActiveNav(pathname);
  const connectionState = usePresenceConnection();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    // Move focus to main landmark on route change without scrolling abruptly.
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <GlowPage
      withBottomNav
      className={cn(
        "lg:pb-0",
        "lg:pl-[var(--glow-side-nav-width)]",
      )}
    >
      <a
        href="#glow-main"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]",
          "focus:rounded-xl focus:bg-glow-background-elevated focus:px-4 focus:py-2",
          "focus:text-sm focus:text-glow-text focus:outline-none focus:ring-2 focus:ring-glow-primary/50",
        )}
      >
        Skip to content
      </a>

      <DesktopSideNav
        activeId={activeId}
        circleUnreadHint={circleNavHint}
      />

      <div className="flex min-h-dvh flex-col">
        <ReconnectBanner connectionState={connectionState} />

        <main
          id="glow-main"
          ref={mainRef}
          tabIndex={-1}
          className="outline-none"
        >
          {children}
        </main>
      </div>

      <MobileBottomNav
        activeId={activeId}
        circleUnreadHint={circleNavHint}
      />
    </GlowPage>
  );
}
