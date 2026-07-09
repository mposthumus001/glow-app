import { cn } from "@/lib/utils/cn";
import { textStyles } from "@/lib/theme";

const spacingStyles = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
} as const;

export type GlowSectionSpacing = keyof typeof spacingStyles;

export interface GlowSectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  spacing?: GlowSectionSpacing;
  className?: string;
  headerClassName?: string;
}

export function GlowSection({
  children,
  title,
  subtitle,
  spacing = "md",
  className,
  headerClassName,
}: GlowSectionProps) {
  const hasHeader = title || subtitle;

  return (
    <section className={cn("flex flex-col", spacingStyles[spacing], className)}>
      {hasHeader && (
        <header className={cn("flex flex-col gap-1", headerClassName)}>
          {title && <h2 className={textStyles.h3}>{title}</h2>}
          {subtitle && <p className={textStyles.bodySmall}>{subtitle}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
