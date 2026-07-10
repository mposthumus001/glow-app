"use client";

import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

import { ReportMessageDialog } from "./ReportMessageDialog";
import type { ReportReason } from "@/lib/supabase/database.types";

export type MessageSafetyMenuProps = {
  messageId: string;
  reportedParentId: string;
  canReport: boolean;
  onHide: () => Promise<{ ok: boolean }>;
  onReport: (input: {
    reasonCode: ReportReason;
    notes: string | null;
  }) => Promise<{ ok: boolean; duplicate?: boolean }>;
};

export function MessageSafetyMenu({
  canReport,
  onHide,
  onReport,
}: MessageSafetyMenuProps) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  if (!canReport) return null;

  return (
    <>
      <div className="relative mt-1 flex justify-end">
        <button
          type="button"
          aria-label="Message options"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full",
            "text-glow-text-tertiary hover:bg-white/[0.05] hover:text-glow-text-secondary",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
          )}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>

        {open ? (
          <div
            role="menu"
            className={cn(
              "absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl",
              "border border-white/[0.08] bg-glow-background py-1 shadow-lg",
            )}
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-glow-text-secondary hover:bg-white/[0.04]"
              onClick={() => {
                setOpen(false);
                void onHide();
              }}
            >
              Hide for me
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-glow-text-secondary hover:bg-white/[0.04]"
              onClick={() => {
                setOpen(false);
                setReportOpen(true);
              }}
            >
              Report message
            </button>
          </div>
        ) : null}
      </div>

      <ReportMessageDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={onReport}
      />
    </>
  );
}
