"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils/cn";

const variantStyles = {
  default: "bg-glow-card border-glow-card-border shadow-glow-card",
  elevated:
    "bg-glow-card-elevated border-glow-card-border shadow-glow-card-elevated",
  interactive:
    "bg-glow-card border-glow-card-border shadow-glow-card cursor-pointer hover:border-glow-card-border-hover hover:bg-glow-card-elevated",
  glass: "glow-glass shadow-glow-card",
} as const;

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

export type GlowCardVariant = keyof typeof variantStyles;
export type GlowCardPadding = keyof typeof paddingStyles;

export interface GlowCardProps extends HTMLMotionProps<"div"> {
  variant?: GlowCardVariant;
  padding?: GlowCardPadding;
  children: React.ReactNode;
}

export function GlowCard({
  variant = "default",
  padding = "md",
  children,
  className,
  ...props
}: GlowCardProps) {
  const isInteractive = variant === "interactive";

  return (
    <motion.div
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "rounded-glow-card border",
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
