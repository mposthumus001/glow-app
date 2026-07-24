"use client";

import { usePathname } from "next/navigation";

import { useCalmPlayerLifecycle } from "../hooks/useCalmPlayer";
import { CalmMiniPlayer } from "./CalmMiniPlayer";

/**
 * Optional shell-owned audio boundary. It is mounted only when the server
 * enables the Sounds preview, preserving one owner without initialising audio
 * for the default preview-off experience.
 */
export function CalmAudioOwner() {
  const pathname = usePathname();
  useCalmPlayerLifecycle();
  if (pathname === "/calm" || pathname === "/calm/sounds") return null;
  return <CalmMiniPlayer />;
}
