import { cn } from "@/lib/utils/cn";

export interface GlowPageProps {
  children: React.ReactNode;
  withBottomNav?: boolean;
  className?: string;
}

export function GlowPage({
  children,
  withBottomNav = false,
  className,
}: GlowPageProps) {
  return (
    <div
      className={cn(
        "relative min-h-dvh bg-glow-background bg-glow-gradient-background text-glow-text",
        withBottomNav &&
          "pb-[calc(var(--glow-bottom-nav-height)+1.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
