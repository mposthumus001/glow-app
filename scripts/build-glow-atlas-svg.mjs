import fs from "fs";

const src = fs.readFileSync(
  "D:/Projects/glow-app/src/features/glow-map/components/AustraliaMapSvg.tsx",
  "utf8",
);

const defsMatch = src.match(/<defs>[\s\S]*?<\/defs>/);
if (!defsMatch) throw new Error("no defs");
const defs = defsMatch[0];

const groupsStart = src.indexOf('<g id="state-wa"');
const groupsEnd = src.lastIndexOf("</svg>");
const groups = src.slice(groupsStart, groupsEnd).trim();

const final = `"use client";

import { cn } from "@/lib/utils/cn";

/**
 * Permanent Glow Atlas Australia SVG.
 * Geographic state/territory outlines from @svg-country-maps/australia
 * (Wikimedia Commons / Lokal_Profil), CC BY-SA 4.0.
 * Source: ../assets/australia-states.svg
 *
 * Geometry never changes. Overlays + zoom live outside this file.
 */

export const ATLAS_SVG_VIEWBOX = "6.5 4.8 273 252.8";

export type GlowAtlasSVGProps = {
  className?: string;
};

export function GlowAtlasSVG({ className }: GlowAtlasSVGProps) {
  return (
    <svg
      viewBox={ATLAS_SVG_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      ${defs}

      ${groups}
    </svg>
  );
}
`;

fs.writeFileSync(
  "D:/Projects/glow-app/src/features/glow-atlas/components/GlowAtlasSVG.tsx",
  final,
);
console.log("wrote", final.length, "chars");
