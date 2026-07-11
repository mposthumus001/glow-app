"use client";

import { useCallback, useRef, useState, useTransition } from "react";

import type { FeedSide, NappyType } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

import type {
  ActivityCursor,
  BabyActivityItem,
  BabyProfile,
  FeedingKind,
  TodaySummary,
} from "../types";
import {
  createFeedingEvent,
  createNappyEvent,
  createSleepEvent,
  fetchBabyActivityPage,
  loadBabyTrackingBundle,
  softDeleteBabyEvent,
  updateBabyEvent,
} from "../tracking/eventApi";
import { ACTIVITY_PAGE_SIZE, sortActivityNewestFirst } from "../tracking/eventLogic";

export type UseBabyTrackingArgs = {
  babies: BabyProfile[];
  initialBabyId: string | null;
  parentId: string;
  initialSummary: TodaySummary;
  initialRecent: BabyActivityItem[];
  initialHasMore: boolean;
  initialError: string | null;
};

const STORAGE_KEY = "glow.baby.selectedId";

export function useBabyTracking({
  babies,
  initialBabyId,
  parentId,
  initialSummary,
  initialRecent,
  initialHasMore,
  initialError,
}: UseBabyTrackingArgs) {
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(
    initialBabyId,
  );
  const [summary, setSummary] = useState(initialSummary);
  const [recent, setRecent] = useState(initialRecent);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(initialError);
  const [loadingMore, setLoadingMore] = useState(false);
  const [switching, startSwitch] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const selectedBaby =
    babies.find((b) => b.id === selectedBabyId) ?? babies[0] ?? null;

  const persistSelection = useCallback((babyId: string) => {
    setSelectedBabyId(babyId);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, babyId);
    } catch {
      // ignore
    }
  }, []);

  const reloadForBaby = useCallback((babyId: string) => {
    startSwitch(async () => {
      const supabase = createClient();
      const bundle = await loadBabyTrackingBundle(supabase, babyId);
      if (bundle.error) {
        setError("We couldn’t refresh Baby just now. Please try again.");
        return;
      }
      setSummary(bundle.summary);
      setRecent(bundle.recent);
      setHasMore(bundle.hasMore);
      setError(null);
    });
  }, []);

  const selectBaby = useCallback(
    (babyId: string) => {
      if (babyId === selectedBabyId) return;
      persistSelection(babyId);
      reloadForBaby(babyId);
    },
    [persistSelection, reloadForBaby, selectedBabyId],
  );

  const loadEarlier = useCallback(async () => {
    if (!selectedBaby || loadingMore || !hasMore) return;
    const last = recent[recent.length - 1];
    if (!last) return;

    setLoadingMore(true);
    const supabase = createClient();
    const cursor: ActivityCursor = {
      startedAt: last.startedAt,
      id: last.id,
    };
    const page = await fetchBabyActivityPage(supabase, {
      babyId: selectedBaby.id,
      before: cursor,
      limit: ACTIVITY_PAGE_SIZE,
    });
    setLoadingMore(false);

    if (page.error) {
      setError("We couldn’t load earlier activity. Please try again.");
      return;
    }

    setRecent((prev) => {
      const seen = new Set(prev.map((i) => i.id));
      const merged = [...prev];
      for (const item of page.items) {
        if (!seen.has(item.id)) merged.push(item);
      }
      return sortActivityNewestFirst(merged);
    });
    setHasMore(page.hasMore);
    setError(null);
  }, [hasMore, loadingMore, recent, selectedBaby]);

  const afterMutation = useCallback(
    (item: BabyActivityItem, mode: "upsert" | "remove") => {
      setRecent((prev) => {
        if (mode === "remove") {
          return prev.filter((row) => row.id !== item.id);
        }
        const without = prev.filter((row) => row.id !== item.id);
        return sortActivityNewestFirst([item, ...without]);
      });
      setError(null);

      if (selectedBaby) {
        void (async () => {
          const supabase = createClient();
          const bundle = await loadBabyTrackingBundle(
            supabase,
            selectedBaby.id,
          );
          if (!bundle.error) {
            setSummary(bundle.summary);
            setRecent(bundle.recent);
            setHasMore(bundle.hasMore);
          }
        })();
      }
    },
    [selectedBaby],
  );

  const runExclusive = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | { ok: false; message: string }> => {
      if (submitLock.current) {
        return { ok: false, message: "Already saving…" };
      }
      submitLock.current = true;
      setSubmitting(true);
      try {
        return await fn();
      } finally {
        submitLock.current = false;
        setSubmitting(false);
      }
    },
    [],
  );

  const logFeeding = useCallback(
    async (input: {
      kind: FeedingKind | null;
      startedAt: string;
      amountMl?: string | number | null;
      side?: FeedSide | null;
      notes?: string | null;
    }) => {
      if (!selectedBaby) {
        return { ok: false as const, message: "Add a baby profile first." };
      }

      return runExclusive(async () => {
        const supabase = createClient();
        const result = await createFeedingEvent(supabase, {
          babyId: selectedBaby.id,
          familyId: selectedBaby.familyId,
          parentId,
          ...input,
        });
        if (result.ok) {
          afterMutation(result.item, "upsert");
        }
        return result;
      });
    },
    [afterMutation, parentId, runExclusive, selectedBaby],
  );

  const logSleep = useCallback(
    async (input: {
      startedAt: string;
      endedAt: string;
      notes?: string | null;
    }) => {
      if (!selectedBaby) {
        return { ok: false as const, message: "Add a baby profile first." };
      }

      return runExclusive(async () => {
        const supabase = createClient();
        const result = await createSleepEvent(supabase, {
          babyId: selectedBaby.id,
          familyId: selectedBaby.familyId,
          parentId,
          ...input,
        });
        if (result.ok) {
          afterMutation(result.item, "upsert");
        }
        return result;
      });
    },
    [afterMutation, parentId, runExclusive, selectedBaby],
  );

  const logNappy = useCallback(
    async (input: {
      nappyType: NappyType | null;
      startedAt: string;
      notes?: string | null;
    }) => {
      if (!selectedBaby) {
        return { ok: false as const, message: "Add a baby profile first." };
      }

      return runExclusive(async () => {
        const supabase = createClient();
        const result = await createNappyEvent(supabase, {
          babyId: selectedBaby.id,
          familyId: selectedBaby.familyId,
          parentId,
          ...input,
        });
        if (result.ok) {
          afterMutation(result.item, "upsert");
        }
        return result;
      });
    },
    [afterMutation, parentId, runExclusive, selectedBaby],
  );

  const editEntry = useCallback(
    async (input: {
      eventId: string;
      kind: "feeding" | "sleep" | "nappy";
      feedingKind?: FeedingKind | null;
      nappyType?: NappyType | null;
      startedAt: string;
      endedAt?: string;
      amountMl?: string | number | null;
      side?: FeedSide | null;
      notes?: string | null;
    }) => {
      return runExclusive(async () => {
        const supabase = createClient();
        const result = await updateBabyEvent(supabase, input);
        if (result.ok) {
          afterMutation(result.item, "upsert");
        }
        return result;
      });
    },
    [afterMutation, runExclusive],
  );

  const deleteEntry = useCallback(
    async (eventId: string) => {
      return runExclusive(async () => {
        const supabase = createClient();
        const result = await softDeleteBabyEvent(supabase, eventId);
        if (result.ok) {
          const existing = recent.find((r) => r.id === eventId);
          if (existing) {
            afterMutation(existing, "remove");
          } else if (selectedBaby) {
            reloadForBaby(selectedBaby.id);
          }
        }
        return result;
      });
    },
    [afterMutation, recent, reloadForBaby, runExclusive, selectedBaby],
  );

  return {
    selectedBaby,
    selectedBabyId: selectedBaby?.id ?? null,
    selectBaby,
    summary,
    recent,
    hasMore,
    error,
    switching,
    submitting,
    loadingMore,
    loadEarlier,
    logFeeding,
    logSleep,
    logNappy,
    editEntry,
    deleteEntry,
    setError,
  };
}
