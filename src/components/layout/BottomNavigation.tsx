"use client";

import Link from "next/link";
import { Baby, Leaf, Moon, User, Users, Globe } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const navItems = [
  { id: "tonight", label: "Tonight", icon: Moon, href: "/" },
  { id: "circle", label: "Circles", icon: Users, href: "/circle" },
  { id: "community", label: "Community", icon: Globe, href: null },
  { id: "calm", label: "Calm", icon: Leaf, href: null },
  { id: "baby", label: "Baby", icon: Baby, href: null },
  { id: "profile", label: "Profile", icon: User, href: null },
] as const;

export type BottomNavId = (typeof navItems)[number]["id"];

export interface BottomNavigationProps {
  activeId?: BottomNavId;
  className?: string;
}

/**
 * Floating glass bottom navigation — Apple HIG inspired.
 */
export function BottomNavigation({
  activeId = "tonight",
  className,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]",
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
          const classNameForItem = cn(
            "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
            isActive
              ? "text-glow-primary"
              : "text-glow-text-tertiary hover:text-glow-text-secondary",
          );

          const content = (
            <>
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
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={classNameForItem}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              aria-label={`${item.label} (coming soon)`}
              disabled
              className={cn(classNameForItem, "disabled:opacity-45")}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
