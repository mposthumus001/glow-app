import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(
  root,
  "src/features/glow-map/assets/australia-states.svg",
);
const outPath = path.join(
  root,
  "src/features/glow-map/components/AustraliaMapSvg.tsx",
);

const svg = fs.readFileSync(svgPath, "utf8");
const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
if (!viewBoxMatch) throw new Error("viewBox not found");
const viewBox = viewBoxMatch[1];

const pathRegex =
  /<path\s+id="([^"]+)"\s+name="([^"]+)"\s+d="([^"]+)"\s*\/>/g;
const paths = [];
let m;
while ((m = pathRegex.exec(svg)) !== null) {
  paths.push({ id: m[1], name: m[2], d: m[3].trim() });
}

const stateGroups = {
  WA: ["wa"],
  NT: ["nt-mainland", "nt-groote-eylandt", "nt-melville-island"],
  SA: ["sa-mainland", "sa-kangaroo-island"],
  QLD: ["qld-mainland", "qld-fraser-island", "qld-mornington-island"],
  NSW: ["nsw"],
  ACT: ["act"],
  VIC: ["vic"],
  TAS: [
    "tas-mainland",
    "tas-flinders-island",
    "tas-cape-barren",
    "tas-king-currie-island",
  ],
};

const byId = Object.fromEntries(paths.map((p) => [p.id, p]));

const lines = [];
lines.push('"use client";');
lines.push("");
lines.push('import { cn } from "@/lib/utils/cn";');
lines.push("");
lines.push("/**");
lines.push(" * Permanent Glow Australia map asset.");
lines.push(
  " * Geographic state/territory outlines from @svg-country-maps/australia",
);
lines.push(" * (based on Wikimedia Commons / Lokal_Profil), CC BY-SA 4.0.");
lines.push(" * Source SVG: ../assets/australia-states.svg");
lines.push(" *");
lines.push(
  " * Overlay coordinates (lights, bubbles) use percentage of this SVG",
);
lines.push(" * bounding box - do not redraw paths procedurally.");
lines.push(" */");
lines.push("");
lines.push(`export const AUSTRALIA_MAP_VIEWBOX = "${viewBox}";`);
lines.push("");
lines.push("export type AustraliaMapSvgProps = {");
lines.push("  className?: string;");
lines.push("};");
lines.push("");
lines.push(
  "export function AustraliaMapSvg({ className }: AustraliaMapSvgProps) {",
);
lines.push("  return (");
lines.push("    <svg");
lines.push("      viewBox={AUSTRALIA_MAP_VIEWBOX}");
lines.push('      xmlns="http://www.w3.org/2000/svg"');
lines.push('      className={cn("h-full w-full", className)}');
lines.push('      aria-hidden="true"');
lines.push('      preserveAspectRatio="xMidYMid meet"');
lines.push("    >");
lines.push("      <defs>");
lines.push(
  '        <linearGradient id="glow-aus-fill" x1="18%" y1="8%" x2="82%" y2="92%">',
);
lines.push(
  '          <stop offset="0%" stopColor="rgba(108,123,255,0.16)" />',
);
lines.push(
  '          <stop offset="55%" stopColor="rgba(12,16,32,0.62)" />',
);
lines.push(
  '          <stop offset="100%" stopColor="rgba(182,148,255,0.12)" />',
);
lines.push("        </linearGradient>");
lines.push(
  '        <linearGradient id="glow-aus-stroke" x1="0%" y1="0%" x2="100%" y2="100%">',
);
lines.push(
  '          <stop offset="0%" stopColor="rgba(142,154,255,0.9)" />',
);
lines.push(
  '          <stop offset="100%" stopColor="rgba(182,148,255,0.55)" />',
);
lines.push("        </linearGradient>");
lines.push(
  '        <filter id="glow-aus-outline" x="-8%" y="-8%" width="116%" height="116%">',
);
lines.push('          <feGaussianBlur stdDeviation="1.2" result="blur" />');
lines.push("          <feMerge>");
lines.push('            <feMergeNode in="blur" />');
lines.push('            <feMergeNode in="SourceGraphic" />');
lines.push("          </feMerge>");
lines.push("        </filter>");
lines.push("      </defs>");
lines.push("");

for (const [code, ids] of Object.entries(stateGroups)) {
  lines.push(
    `      <g id="state-${code.toLowerCase()}" data-state="${code}">`,
  );
  for (const id of ids) {
    const p = byId[id];
    if (!p) throw new Error(`missing path id: ${id}`);
    lines.push("        <path");
    lines.push(`          id="${p.id}"`);
    lines.push(`          data-name="${p.name.replace(/"/g, '\\"')}"`);
    lines.push(`          d="${p.d}"`);
    lines.push('          fill="url(#glow-aus-fill)"');
    lines.push('          stroke="url(#glow-aus-stroke)"');
    lines.push('          strokeWidth="0.55"');
    lines.push('          strokeLinejoin="round"');
    lines.push('          filter="url(#glow-aus-outline)"');
    lines.push("        />");
  }
  lines.push("      </g>");
  lines.push("");
}

lines.push("    </svg>");
lines.push("  );");
lines.push("}");
lines.push("");

fs.writeFileSync(outPath, lines.join("\n"));
console.log(
  JSON.stringify({
    paths: paths.length,
    viewBox,
    outBytes: fs.statSync(outPath).size,
  }),
);
