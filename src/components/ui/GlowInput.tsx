import { cn } from "@/lib/utils/cn";

export interface GlowInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function GlowInput({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: GlowInputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      <span className="text-sm font-medium text-glow-text-secondary">
        {label}
      </span>
      <input
        id={inputId}
        className={cn(
          "h-12 w-full rounded-glow-input border bg-glow-card px-4 text-base text-glow-text",
          "placeholder:text-glow-text-tertiary",
          "border-glow-card-border focus:border-glow-primary/50 focus:outline-none focus:ring-2 focus:ring-glow-primary/30",
          "disabled:opacity-50",
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
