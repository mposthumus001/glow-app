import { cn } from "@/lib/utils/cn";

export interface GlowTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function GlowTextarea({
  label,
  error,
  hint,
  id,
  className,
  rows = 3,
  ...props
}: GlowTextareaProps) {
  const textareaId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5" htmlFor={textareaId}>
      <span className="text-sm font-medium text-glow-text-secondary">
        {label}
      </span>
      <textarea
        id={textareaId}
        rows={rows}
        className={cn(
          "w-full resize-none rounded-glow-input border bg-glow-card px-4 py-3 text-base text-glow-text",
          "placeholder:text-glow-text-tertiary",
          "border-glow-card-border focus:border-glow-primary/50 focus:outline-none focus:ring-2 focus:ring-glow-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-400/60 focus:ring-red-400/30",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <span className="text-xs text-glow-text-tertiary">{hint}</span>
      ) : null}
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}
