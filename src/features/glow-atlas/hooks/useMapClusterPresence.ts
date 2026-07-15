"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { emptyAtlasPresence } from "@/features/presence";
import { createClient } from "@/lib/supabase/client";

import {
  mapClustersToPresence,
  reconcilePresence,
  type MapClusterPublicRow,
} from "../data/mapClustersToPresence";
import type { AtlasPresence } from "../types";

/**
 * Explicit column list — `approximate_lat`/`approximate_lng` exist on the
 * view but are never used client-side (see mapClustersToPresence.ts), so
 * they're deliberately excluded from the wire payload.
 */
const MAP_CLUSTER_PUBLIC_COLUMNS =
  "id, level, state, suburb_area, online_count, updated_at";

export type MapClusterConnection = "live" | "reconnecting" | "idle";

export type UseMapClusterPresenceResult = {
  presence: AtlasPresence;
  countryCount: number;
  status: "loading" | "live" | "error";
  connection: MapClusterConnection;
  lastUpdatedAt: number | null;
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
    .select(MAP_CLUSTER_PUBLIC_COLUMNS);

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  return { ok: true, rows: (data ?? []) as MapClusterPublicRow[] };
}

function mapChannelStatus(
  status: string,
): MapClusterConnection {
  if (status === "SUBSCRIBED") return "live";
  if (
    status === "CLOSED" ||
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT"
  ) {
    return "reconnecting";
  }
  return "idle";
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
  const [connection, setConnection] =
    useState<MapClusterConnection>("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const disposedRef = useRef(false);
  const presenceRef = useRef<AtlasPresence>(presence);

  const applyFetchResult = useCallback((result: ClusterFetchResult) => {
    if (disposedRef.current) return;

    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      return;
    }

    const mapped = mapClustersToPresence(result.rows);
    // Reuse unchanged field references so a no-op realtime tick doesn't
    // invalidate every disclosure/light useMemo downstream in useGlowAtlas.
    const stable = reconcilePresence(presenceRef.current, mapped.presence);
    presenceRef.current = stable;
    setPresence(stable);
    setCountryCount(mapped.countryCount);
    setLastUpdatedAt(Date.now());
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
      .subscribe((subscribeStatus) => {
        if (disposedRef.current) return;
        setConnection(mapChannelStatus(subscribeStatus));
      });

    return () => {
      disposedRef.current = true;
      void supabase.removeChannel(channel);
    };
  }, [applyFetchResult, enabled]);

  const effectiveStatus = enabled ? status : "live";
  const effectiveConnection = enabled ? connection : "live";

  return {
    presence,
    countryCount,
    status: effectiveStatus,
    connection: effectiveConnection,
    lastUpdatedAt,
    error,
    refresh,
  };
}
