import { cn } from "@/lib/utils/cn";

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full",
} as const;

export type GlowContainerSize = keyof typeof sizeStyles;

export interface GlowContainerProps {
  children: React.ReactNode;
  size?: GlowContainerSize;
  className?: string;
  as?: "div" | "section" | "article" | "main";
}

export function GlowContainer({
  children,
  size = "md",
  className,
  as: Component = "div",
}: GlowContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full px-6", sizeStyles[size], className)}
    >
      {children}
    </Component>
  );
}
