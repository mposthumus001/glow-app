"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { emptyAtlasPresence } from "@/features/presence";
import { createClient } from "@/lib/supabase/client";

import {
  mapClustersToPresence,
  type MapClusterPublicRow,
} from "../data/mapClustersToPresence";
import type { AtlasPresence } from "../types";

export type UseMapClusterPresenceResult = {
  presence: AtlasPresence;
  countryCount: number;
  status: "loading" | "live" | "error";
  error: string | null;
  refresh: () => Promise<void>;
};

export type UseMapClusterPresenceOptions = {
  /** When false, skip fetch/subscribe (e.g. presence override in tests). */
  enabled?: boolean;
};

type ClusterFetchResult =
  | { ok: true; rows: MapClusterPublicRow[] }
  | { ok: false; error: string };

async function fetchMapClusters(): Promise<ClusterFetchResult> {
  const supabase = createClient();
  const { data, error: fetchError } = await supabase
    .from("map_cluster_public")
    .select("*");

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  return { ok: true, rows: (data ?? []) as MapClusterPublicRow[] };
}

/**
 * Live Atlas counts from map_cluster_public.
 *
 * Hierarchy (Australia → State → City → Suburb) is unchanged —
 * this hook only replaces the datasource. Animations stay in useGlowAtlas.
 *
 * Realtime: refetches when map_clusters rows change.
 */
export function useMapClusterPresence(
  options: UseMapClusterPresenceOptions = {},
): UseMapClusterPresenceResult {
  const enabled = options.enabled ?? true;
  const [presence, setPresence] = useState<AtlasPresence>(emptyAtlasPresence);
  const [countryCount, setCountryCount] = useState(0);
  const [status, setStatus] =
    useState<UseMapClusterPresenceResult["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const disposedRef = useRef(false);

  const applyFetchResult = useCallback((result: ClusterFetchResult) => {
    if (disposedRef.current) return;

    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }

    const mapped = mapClustersToPresence(result.rows);
    setPresence(mapped.presence);
    setCountryCount(mapped.countryCount);
    setError(null);
    setStatus("live");
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    applyFetchResult(await fetchMapClusters());
  }, [applyFetchResult, enabled]);

  useEffect(() => {
    disposedRef.current = false;

    if (!enabled) return;

    const supabase = createClient();

    void fetchMapClusters().then(applyFetchResult);

    const channel = supabase
      .channel("glow-atlas-map-clusters")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "map_clusters",
        },
        () => {
          void fetchMapClusters().then(applyFetchResult);
        },
      )
      .subscribe();

    return () => {
      disposedRef.current = true;
      void supabase.removeChannel(channel);
    };
  }, [applyFetchResult, enabled]);

  const effectiveStatus = enabled ? status : "live";

  return {
    presence,
    countryCount,
    status: effectiveStatus,
    error,
    refresh,
  };
}
