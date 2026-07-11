"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Baby as BabyIcon, Moon, Utensils } from "lucide-react";

import { GlowButton, GlowCard } from "@/components/ui";
import { GlowContainer } from "@/components/layout";
import { PageHeader } from "@/components/shell/PageHeader";
import { cn } from "@/lib/utils/cn";

import type {
  BabyActivityItem,
  BabyProfile,
  TodaySummary,
} from "../types";
import { useBabyTracking } from "../hooks/useBabyTracking";
import { BabyProfileCard } from "./BabyProfileCard";
import { BabySelector } from "./BabySelector";
import { LogEntrySheet, type LogMode } from "./LogEntrySheet";
import { RecentActivityList } from "./RecentActivityList";
import { TodaySummaryCard } from "./TodaySummaryCard";

export type BabyScreenProps = {
  babies: BabyProfile[];
  parentId: string;
  initialSummary: TodaySummary;
  initialRecent: BabyActivityItem[];
  initialHasMore: boolean;
  initialError: string | null;
};

export function BabyScreen({
  babies,
  parentId,
  initialSummary,
  initialRecent,
  initialHasMore,
  initialError,
}: BabyScreenProps) {
  const tracking = useBabyTracking({
    babies,
    initialBabyId: babies[0]?.id ?? null,
    parentId,
    initialSummary,
    initialRecent,
    initialHasMore,
    initialError,
  });

  const [sheetMode, setSheetMode] = useState<LogMode | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BabyActivityItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BabyActivityItem | null>(
    null,
  );

  function openLog(mode: LogMode) {
    setEditing(null);
    setSheetMode(mode);
    setSheetOpen(true);
  }

  function openEdit(item: BabyActivityItem) {
    setEditing(item);
    setSheetMode(item.kind);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
    setSheetMode(null);
  }

  if (babies.length === 0) {
    return <NoBabyState />;
  }

  const summaryEmpty =
    tracking.summary.feedCount === 0 &&
    tracking.summary.sleepMs === 0 &&
    tracking.summary.nappyCount === 0;

  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title={tracking.selectedBaby?.name ?? "Baby"}
          subtitle="A calm place for the rhythms that matter most."
        />

        <BabySelector
          babies={babies}
          selectedId={tracking.selectedBabyId}
          onSelect={tracking.selectBaby}
        />

        {tracking.selectedBaby ? (
          <BabyProfileCard baby={tracking.selectedBaby} className="mb-5" />
        ) : null}

        {tracking.error ? (
          <GlowCard
            padding="md"
            className="mb-5 border-red-400/20 bg-red-400/[0.05]"
            role="alert"
          >
            <p className="text-sm text-glow-text-secondary">{tracking.error}</p>
          </GlowCard>
        ) : null}

        <TodaySummaryCard
          summary={tracking.summary}
          empty={summaryEmpty}
          className={cn("mb-5", tracking.switching && "opacity-70")}
        />

        <LogActions onLog={openLog} className="mb-6" />

        <RecentActivityList
          items={tracking.recent}
          hasMore={tracking.hasMore}
          loadingMore={tracking.loadingMore}
          onLoadEarlier={() => void tracking.loadEarlier()}
          onEdit={openEdit}
          onDeleteRequest={setPendingDelete}
        />
      </GlowContainer>

      <LogEntrySheet
        open={sheetOpen}
        mode={sheetMode}
        editing={editing}
        submitting={tracking.submitting}
        onClose={closeSheet}
        onSubmitFeeding={async (input) => {
          if (editing) {
            return tracking.editEntry({
              eventId: editing.id,
              kind: "feeding",
              feedingKind: input.kind,
              startedAt: input.startedAt,
              amountMl: input.amountMl,
              side: input.side,
              notes: input.notes,
            });
          }
          return tracking.logFeeding(input);
        }}
        onSubmitSleep={async (input) => {
          if (editing) {
            return tracking.editEntry({
              eventId: editing.id,
              kind: "sleep",
              startedAt: input.startedAt,
              endedAt: input.endedAt,
              notes: input.notes,
            });
          }
          return tracking.logSleep(input);
        }}
        onSubmitNappy={async (input) => {
          if (editing) {
            return tracking.editEntry({
              eventId: editing.id,
              kind: "nappy",
              nappyType: input.nappyType,
              startedAt: input.startedAt,
              notes: input.notes,
            });
          }
          return tracking.logNappy(input);
        }}
      />

      <DeleteConfirmDialog
        item={pendingDelete}
        submitting={tracking.submitting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const result = await tracking.deleteEntry(pendingDelete.id);
          if (result.ok) {
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}

function LogActions({
  onLog,
  className,
}: {
  onLog: (mode: LogMode) => void;
  className?: string;
}) {
  const actions = [
    { id: "feeding" as const, label: "Feed", icon: Utensils },
    { id: "sleep" as const, label: "Sleep", icon: Moon },
    { id: "nappy" as const, label: "Nappy", icon: BabyIcon },
  ];

  return (
    <section className={className} aria-label="Log an entry">
      <p className="mb-2 text-sm text-glow-text-tertiary">Log</p>
      <div className="grid grid-cols-3 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onLog(action.id)}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl",
                "border border-white/[0.08] bg-white/[0.04] px-2 py-2.5",
                "text-sm font-medium text-glow-text-secondary",
                "transition-colors hover:bg-white/[0.07] hover:text-glow-text",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/40",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function NoBabyState() {
  return (
    <div className="overflow-y-auto pt-safe">
      <GlowContainer size="md" as="div" className="pb-10 pt-6">
        <PageHeader
          title="Baby"
          subtitle="A calm place for feeding, sleep, and nappies."
        />
        <GlowCard padding="md" className="border-glow-primary/15 bg-glow-primary/[0.04]">
          <p className="text-base font-medium text-glow-text">
            No baby profile yet
          </p>
          <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
            When you’re ready, add your baby’s details in You. Tracking stays
            private to your family — never noisy, never competitive.
          </p>
          <div className="mt-5">
            <Link href="/profile">
              <GlowButton type="button" variant="secondary" size="md">
                Go to You
              </GlowButton>
            </Link>
          </div>
        </GlowCard>
      </GlowContainer>
    </div>
  );
}

function DeleteConfirmDialog({
  item,
  submitting,
  onCancel,
  onConfirm,
}: {
  item: BabyActivityItem | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-[1.75rem] border border-white/[0.08] bg-[rgba(12,16,30,0.97)] p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-glow-text">
          Remove this entry?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-glow-text-secondary">
          This removes it from your timeline and today’s summary. You can always
          log again later.
        </p>
        <div className="mt-5 flex gap-2">
          <GlowButton
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={onCancel}
            disabled={submitting}
          >
            Keep
          </GlowButton>
          <GlowButton
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            isLoading={submitting}
            onClick={onConfirm}
          >
            Remove
          </GlowButton>
        </div>
      </div>
    </div>
  );
}
