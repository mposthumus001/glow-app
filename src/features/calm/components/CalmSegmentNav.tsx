"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/calm/support", label: "Support", segment: "support" },
  { href: "/calm/sounds", label: "Sounds", segment: "sounds" },
] as const;

export function CalmSegmentNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Calm sections" className="border-b border-white/[0.06]">
      <div className="mx-auto flex max-w-3xl px-5 sm:px-6">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.segment}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center px-4 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-glow-primary/50",
                active
                  ? "font-semibold text-glow-text after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-glow-primary-light"
                  : "font-medium text-glow-text-secondary hover:text-glow-text",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
