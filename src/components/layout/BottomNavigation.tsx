"use client";

import { Baby, Leaf, Moon, User, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { id: "tonight", label: "Tonight", icon: Moon },
  { id: "circle", label: "Circle", icon: Users },
  { id: "community", label: "Community", icon: Globe },
  { id: "calm", label: "Calm", icon: Leaf },
  { id: "baby", label: "Baby", icon: Baby },
  { id: "profile", label: "Profile", icon: User },
] as const;

export type BottomNavId = (typeof navItems)[number]["id"];

export interface BottomNavigationProps {
  activeId?: BottomNavId;
  className?: string;
}

export function BottomNavigation({
  activeId = "tonight",
  className,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-glow-card-border bg-glow-background/80 backdrop-blur-xl",
        "pb-safe",
        className,
      )}
    >
      <div className="mx-auto flex h-[var(--glow-bottom-nav-height)] max-w-lg items-center justify-between px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeId;

          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1",
                "transition-colors duration-200",
                isActive
                  ? "text-glow-primary"
                  : "text-glow-text-tertiary hover:text-glow-text-secondary",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  isActive && "fill-glow-primary/20",
                )}
                strokeWidth={isActive ? 2.5 : 1.75}
                aria-hidden="true"
              />
              <span className="w-full truncate text-center text-[9px] font-medium leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
