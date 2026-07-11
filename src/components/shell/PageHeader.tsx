import { cn } from "@/lib/utils/cn";
import { textStyles } from "@/lib/theme";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  /** Use h1 for primary page title (default). */
  as?: "h1" | "h2";
};

/**
 * Standard authenticated page header — calm, not dashboard-sized.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
  as: Heading = "h1",
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 pb-6 pt-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <Heading
          className={cn(
            textStyles.h1,
            "text-[1.5rem] sm:text-[1.75rem] break-words",
          )}
        >
          {title}
        </Heading>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-base leading-relaxed text-glow-text-secondary">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="shrink-0 self-start sm:self-end">{action}</div>
      ) : null}
    </header>
  );
}
