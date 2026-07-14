import { cn } from "@/lib/utils/cn";

export interface GlowSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function GlowSelect({
  label,
  error,
  hint,
  id,
  className,
  options,
  placeholder,
  ...props
}: GlowSelectProps) {
  const selectId = id ?? props.name;
  const hintId = selectId ? `${selectId}-hint` : undefined;
  const errorId = selectId ? `${selectId}-error` : undefined;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <label className="flex flex-col gap-1.5" htmlFor={selectId}>
      <span className="text-sm font-medium text-glow-text-secondary">
        {label}
      </span>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          // glow-select: option contrast for native popups (see globals.css)
          "glow-select h-12 w-full appearance-none rounded-glow-input border bg-glow-card px-4 text-base text-glow-text",
          "border-glow-card-border focus:border-glow-primary/50 focus:outline-none focus:ring-2 focus:ring-glow-primary/30",
          "disabled:opacity-50",
          error && "border-red-400/60 focus:ring-red-400/30",
          className,
        )}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && !error ? (
        <span id={hintId} className="text-xs text-glow-text-tertiary">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="text-xs text-red-300" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
