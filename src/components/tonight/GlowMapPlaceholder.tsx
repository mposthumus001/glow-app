"use client";

import { motion } from "framer-motion";
import { tonightMock } from "@/lib/mock/tonight";
import { cn } from "@/lib/utils/cn";

/** Stylised Australia outline — simplified for premium placeholder use */
function AustraliaOutline() {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="aus-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(182,148,255,0.08)" />
          <stop offset="100%" stopColor="rgba(108,123,255,0.05)" />
        </linearGradient>
        <filter id="aus-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Mainland + Tasmania — stylised silhouette */}
      <path
        d="M18 52 C14 40 20 28 34 22 C46 17 60 14 74 16 C86 18 94 26 96 38 C98 50 94 60 86 68 C78 76 66 80 54 82 C44 84 36 88 30 84 C24 80 20 72 18 64 C16 58 16 54 18 52 Z
           M72 86 C76 90 80 96 78 102 C76 106 70 106 66 102 C62 96 64 90 68 86 C70 84 70 84 72 86 Z"
        fill="url(#aus-fill)"
        stroke="rgba(182,148,255,0.3)"
        strokeWidth="0.8"
        filter="url(#aus-glow)"
      />
    </svg>
  );
}

export interface GlowMapPlaceholderProps {
  className?: string;
}

export function GlowMapPlaceholder({ className }: GlowMapPlaceholderProps) {
  const { map } = tonightMock;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-glow-card border border-glow-card-border",
        "bg-glow-card shadow-glow-card",
        className,
      )}
    >
      {/* Atmospheric glow behind map */}
      <div className="pointer-events-none absolute inset-0 bg-glow-gradient-primary-soft opacity-40" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-glow-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-glow-secondary/10 blur-2xl" />

      <div className="relative px-5 pb-5 pt-4">
        {/* Map canvas */}
        <div className="relative mx-auto aspect-[10/9] w-full max-w-[280px]">
          <AustraliaOutline />

          {/* Glowing parent dots */}
          {map.dots.map((dot, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-glow-primary"
              style={{
                left: `${dot.x}%`,
                top: `${dot.y}%`,
                width: dot.size,
                height: dot.size,
                boxShadow: "0 0 6px 2px rgba(182,148,255,0.6)",
              }}
              animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
              transition={{
                duration: 2.5 + (i % 3) * 0.5,
                repeat: Infinity,
                delay: dot.delay,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* State count bubbles */}
          {map.states.map((state) => (
            <div
              key={state.code}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${state.x}%`, top: `${state.y}%` }}
            >
              <div className="flex items-center gap-1 rounded-full border border-glow-primary/30 bg-glow-background/80 px-2 py-0.5 backdrop-blur-sm">
                <span className="text-[9px] font-semibold text-glow-primary">
                  {state.code}
                </span>
                <span className="text-[9px] font-medium text-glow-text-secondary">
                  {state.count}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <p className="mt-3 text-center text-sm leading-relaxed text-glow-text-secondary">
          {map.tagline}
        </p>
      </div>
    </div>
  );
}
