"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const variantStyles = {
  primary:
    "bg-glow-gradient-primary text-glow-text-inverse shadow-glow-primary hover:opacity-90",
  secondary:
    "bg-glow-secondary text-glow-text shadow-glow-secondary hover:bg-glow-secondary-light",
  ghost:
    "bg-transparent text-glow-text border border-glow-card-border hover:bg-glow-card hover:border-glow-card-border-hover",
  accent:
    "bg-glow-gradient-accent text-glow-text-inverse shadow-glow-accent hover:opacity-90",
} as const;

const sizeStyles = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-12 px-6 text-base gap-2",
  lg: "h-14 px-8 text-lg gap-2.5",
} as const;

export type GlowButtonVariant = keyof typeof variantStyles;
export type GlowButtonSize = keyof typeof sizeStyles;

export interface GlowButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: GlowButtonVariant;
  size?: GlowButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

export function GlowButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: GlowButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center justify-center rounded-glow-button font-medium",
        "transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-glow-background",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </motion.button>
  );
}
