import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import type { AtlasPresence } from "@/features/glow-atlas/types";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

import {
  fetchMapPresence,
  fetchParentPresenceProfile,
  markPresenceOffline,
  persistPresenceLifecycle,
  type ParentPresenceProfile,
} from "../api";
import type {
  PresenceConnectionState,
  PresenceLifecycleStatus,
  PresenceSnapshot,
  PresenceTrackPayload,
} from "../types";
import { emptyAtlasPresence } from "../utils/emptyAtlasPresence";
import {
  peersToAtlasPresence,
  totalAwakeFromPeers,
  uniquePeersByParentId,
} from "../utils/peersToAtlasPresence";
import {
  toAtlasPresence,
  totalAwakeFromPresence,
} from "../utils/toAtlasPresence";

const CHANNEL_NAME = "glow-presence";
const AWAY_AFTER_MS = 5 * 60_000;
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

type Listener = (snapshot: PresenceSnapshot) => void;

type GlowSupabase = SupabaseClient<Database>;

/**
 * Presence Service (Sprint 3.4)
 *
 * Statuses: online | away | offline | background
 * Transport: Supabase Realtime Presence (no polling)
 * Persists lifecycle to public.presence on transitions only
 * Reconnects automatically after channel / network failures
 *
 * Privacy: never tracks or writes exact GPS — state + suburb_area only.
 */
export class PresenceService {
  private supabase: GlowSupabase | null = null;
  private channel: RealtimeChannel | null = null;
  private parentId: string | null = null;
  private profile: ParentPresenceProfile | null = null;

  private lifecycleStatus: PresenceLifecycleStatus = "offline";
  private connectionState: PresenceConnectionState = "idle";
  private peers: PresenceTrackPayload[] = [];
  private atlasPresence: AtlasPresence = emptyAtlasPresence();
  private totalAwake = 0;
  private error: string | null = null;
  private ready = false;

  private listeners = new Set<Listener>();
  private refCount = 0;
  private disposed = true;
  private intentionalOffline = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private awayTimer: ReturnType<typeof setTimeout> | null = null;

  private removeVisibility?: () => void;
  private removeNetwork?: () => void;
  private removeActivity?: () => void;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());

    this.refCount += 1;
    if (this.refCount === 1) {
      void this.start();
    }

    return () => {
      this.listeners.delete(listener);
      this.refCount = Math.max(0, this.refCount - 1);
      if (this.refCount === 0) {
        void this.stop();
      }
    };
  }

  getSnapshot(): PresenceSnapshot {
    return this.snapshot();
  }

  async markOffline(): Promise<void> {
    this.intentionalOffline = true;
    this.clearReconnect();
    this.clearAwayTimer();

    if (this.parentId && this.profile) {
      await this.applyLifecycle("offline", { persist: true, track: true });
    } else {
      await markPresenceOffline();
      this.lifecycleStatus = "offline";
    }

    await this.teardownChannel();
    this.setConnection("disconnected");
    this.emit();
  }

  /** One-shot map_presence read — event-driven callers only, never on an interval. */
  async refreshMapPresence(): Promise<void> {
    const { rows, error } = await fetchMapPresence();
    if (this.disposed) return;

    if (error) {
      this.error = error;
      this.emit();
      return;
    }

    // Prefer Realtime peers when connected; fall back to durable view.
    if (this.connectionState !== "connected" || this.peers.length === 0) {
      this.atlasPresence = toAtlasPresence(rows);
      this.totalAwake = totalAwakeFromPresence(this.atlasPresence);
    }
    this.error = null;
    this.emit();
  }

  private async start(): Promise<void> {
    this.disposed = false;
    this.intentionalOffline = false;
    this.supabase = createClient();
    this.bindEnvironment();
    await this.connect();
  }

  private async stop(): Promise<void> {
    this.disposed = true;
    this.intentionalOffline = true;
    this.clearReconnect();
    this.clearAwayTimer();
    this.unbindEnvironment();

    const parentId = this.parentId;
    await this.teardownChannel();

    if (parentId) {
      await markPresenceOffline(parentId);
    }

    this.lifecycleStatus = "offline";
    this.setConnection("idle");
    this.peers = [];
    this.atlasPresence = emptyAtlasPresence();
    this.totalAwake = 0;
    this.ready = false;
    this.parentId = null;
    this.profile = null;
    this.emit();
  }

  private async connect(): Promise<void> {
    if (this.disposed || this.intentionalOffline) return;

    const supabase = this.supabase ?? createClient();
    this.supabase = supabase;

    this.setConnection(
      this.reconnectAttempt > 0 ? "reconnecting" : "connecting",
    );

    if (!navigator.onLine) {
      this.setConnection("disconnected");
      this.lifecycleStatus = "offline";
      this.error = "Network offline";
      this.emit();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (this.disposed) return;

    if (!user) {
      this.ready = true;
      this.lifecycleStatus = "offline";
      this.setConnection("idle");
      this.emit();
      return;
    }

    this.parentId = user.id;

    const profile = await fetchParentPresenceProfile(user.id);
    if (this.disposed) return;

    if (!profile) {
      this.error = "Could not load parent profile for presence.";
      this.ready = true;
      this.setConnection("disconnected");
      this.emit();
      this.scheduleReconnect();
      return;
    }

    this.profile = profile;

    const initial = this.lifecycleFromEnvironment();
    await this.applyLifecycle(initial, { persist: true, track: false });

    await this.teardownChannel();
    if (this.disposed || this.intentionalOffline) return;

    const channel = supabase.channel(CHANNEL_NAME, {
      config: {
        presence: { key: user.id },
      },
    });

    channel.on("presence", { event: "sync" }, () => {
      this.ingestPresenceState(channel);
    });

    channel.on("presence", { event: "join" }, () => {
      this.ingestPresenceState(channel);
    });

    channel.on("presence", { event: "leave" }, () => {
      this.ingestPresenceState(channel);
    });

    this.channel = channel;

    channel.subscribe(async (status) => {
      if (this.disposed || this.intentionalOffline) return;

      if (status === "SUBSCRIBED") {
        this.reconnectAttempt = 0;
        this.clearReconnect();
        this.setConnection("connected");
        this.error = null;
        this.ready = true;
        await this.trackCurrent();
        this.resetAwayTimer();
        this.emit();
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.setConnection("disconnected");
        this.error = `Realtime ${status.toLowerCase()}`;
        this.emit();
        this.scheduleReconnect();
        return;
      }

      if (status === "CLOSED") {
        this.setConnection("disconnected");
        this.emit();
        if (!this.intentionalOffline && !this.disposed) {
          this.scheduleReconnect();
        }
      }
    });
  }

  private ingestPresenceState(channel: RealtimeChannel): void {
    const state = channel.presenceState<PresenceTrackPayload>();
    const raw: PresenceTrackPayload[] = [];

    for (const metas of Object.values(state)) {
      for (const meta of metas) {
        if (!meta?.parent_id || !meta.status || !meta.state) continue;
        raw.push({
          parent_id: meta.parent_id,
          status: meta.status,
          state: meta.state,
          suburb_area: meta.suburb_area ?? null,
          map_visibility: meta.map_visibility,
          updated_at: meta.updated_at,
        });
      }
    }

    // Realtime Presence can retain multiple metas per key after re-tracks.
    const peers = uniquePeersByParentId(raw);
    this.peers = peers;
    this.atlasPresence = peersToAtlasPresence(peers);
    this.totalAwake = totalAwakeFromPeers(peers);
    this.error = null;
    this.emit();
  }

  private async applyLifecycle(
    next: PresenceLifecycleStatus,
    options: { persist: boolean; track: boolean },
  ): Promise<void> {
    const changed = this.lifecycleStatus !== next;
    this.lifecycleStatus = next;

    if (options.persist && this.parentId && this.profile) {
      const { error } = await persistPresenceLifecycle({
        parentId: this.parentId,
        profile: this.profile,
        lifecycle: next,
      });
      if (error) this.error = error;
    }

    if (options.track) {
      await this.trackCurrent();
    }

    if (next === "online") {
      this.resetAwayTimer();
    } else {
      this.clearAwayTimer();
    }

    if (changed || options.persist || options.track) {
      this.emit();
    }
  }

  private async trackCurrent(): Promise<void> {
    if (!this.channel || !this.parentId || !this.profile) return;
    if (this.connectionState !== "connected") return;

    if (this.lifecycleStatus === "offline") {
      try {
        await this.channel.untrack();
      } catch {
        // ignore
      }
      return;
    }

    const suburbArea =
      this.profile.map_visibility === "suburb_area"
        ? this.profile.suburb_area
        : null;

    const payload: PresenceTrackPayload = {
      parent_id: this.parentId,
      status: this.lifecycleStatus,
      state: this.profile.state,
      suburb_area: suburbArea,
      map_visibility: this.profile.map_visibility,
      updated_at: new Date().toISOString(),
    };

    await this.channel.track(payload);
  }

  private lifecycleFromEnvironment(): PresenceLifecycleStatus {
    if (typeof document === "undefined") return "online";
    if (document.visibilityState !== "visible") return "background";
    return "online";
  }

  private bindEnvironment(): void {
    const onVisibility = () => {
      if (this.disposed || this.intentionalOffline) return;
      if (!navigator.onLine) return;

      if (document.visibilityState === "visible") {
        void this.applyLifecycle("online", { persist: true, track: true });
      } else {
        void this.applyLifecycle("background", { persist: true, track: true });
      }
    };

    const onOnline = () => {
      if (this.disposed || this.intentionalOffline) return;
      this.error = null;
      void this.connect();
    };

    const onOffline = () => {
      if (this.disposed) return;
      this.clearReconnect();
      this.setConnection("disconnected");
      void this.applyLifecycle("offline", { persist: false, track: false });
      this.error = "Network offline";
      this.emit();
    };

    const onActivity = () => {
      if (this.disposed || this.intentionalOffline) return;
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine) return;

      if (this.lifecycleStatus === "away") {
        void this.applyLifecycle("online", { persist: true, track: true });
      } else if (this.lifecycleStatus === "online") {
        this.resetAwayTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const activityEvents: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "touchstart",
      "mousemove",
      "scroll",
    ];
    for (const event of activityEvents) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    this.removeVisibility = () =>
      document.removeEventListener("visibilitychange", onVisibility);
    this.removeNetwork = () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    this.removeActivity = () => {
      for (const event of activityEvents) {
        window.removeEventListener(event, onActivity);
      }
    };
  }

  private unbindEnvironment(): void {
    this.removeVisibility?.();
    this.removeNetwork?.();
    this.removeActivity?.();
    this.removeVisibility = undefined;
    this.removeNetwork = undefined;
    this.removeActivity = undefined;
  }

  private resetAwayTimer(): void {
    this.clearAwayTimer();
    if (this.disposed || this.intentionalOffline) return;
    if (this.lifecycleStatus !== "online") return;

    this.awayTimer = setTimeout(() => {
      if (this.disposed || this.intentionalOffline) return;
      if (document.visibilityState !== "visible") return;
      if (this.lifecycleStatus !== "online") return;
      void this.applyLifecycle("away", { persist: true, track: true });
    }, AWAY_AFTER_MS);
  }

  private clearAwayTimer(): void {
    if (this.awayTimer) {
      clearTimeout(this.awayTimer);
      this.awayTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.intentionalOffline) return;
    if (this.reconnectTimer) return;
    if (!navigator.onLine) return;

    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** this.reconnectAttempt,
    );
    this.reconnectAttempt += 1;
    this.setConnection("reconnecting");
    this.emit();

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private async teardownChannel(): Promise<void> {
    if (!this.channel || !this.supabase) {
      this.channel = null;
      return;
    }

    try {
      await this.channel.untrack();
    } catch {
      // Channel may already be closed.
    }

    await this.supabase.removeChannel(this.channel);
    this.channel = null;
  }

  private setConnection(state: PresenceConnectionState): void {
    this.connectionState = state;
  }

  private snapshot(): PresenceSnapshot {
    return {
      lifecycleStatus: this.lifecycleStatus,
      connectionState: this.connectionState,
      atlasPresence: this.atlasPresence,
      totalAwake: this.totalAwake,
      peers: this.peers,
      error: this.error,
      ready: this.ready,
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}

let shared: PresenceService | null = null;

export function getPresenceService(): PresenceService {
  if (!shared) shared = new PresenceService();
  return shared;
}
