import { cn } from "@/lib/utils/cn";

export type FamilyRoleBadgeProps = {
  label: string;
  isOwner: boolean;
  className?: string;
};

export function FamilyRoleBadge({
  label,
  isOwner,
  className,
}: FamilyRoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1",
        "text-[11px] font-medium tracking-wide",
        isOwner
          ? "bg-glow-primary/15 text-glow-primary-light"
          : "bg-white/[0.06] text-glow-text-secondary",
        className,
      )}
    >
      {label}
    </span>
  );
}
