import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

import {
  fetchCircleMessageById,
  fetchCircleMessagesPage,
  insertCircleMessage,
} from "./messageApi";
import {
  createOptimisticMessage,
  markMessageFailed,
  markMessageOptimistic,
  oldestCursor,
  prepareMessageBody,
  prependOlderMessages,
  replaceOptimisticWithConfirmed,
  upsertConfirmedMessage,
  type CircleFeedMessage,
} from "./messageLogic";
import { shouldAcceptRealtimeMessage } from "./subscriptionLifecycle";

type GlowSupabase = SupabaseClient<Database>;

export type MessagingConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

export type MessagingSnapshot = {
  messages: CircleFeedMessage[];
  status: "loading" | "ready" | "error";
  error: string | null;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  sendingClientKey: string | null;
  connection: MessagingConnectionState;
};

type Listener = (snapshot: MessagingSnapshot) => void;

type RealtimeInsertPayload = {
  new: {
    id?: string;
    circle_id?: string;
    parent_id?: string;
    body?: string;
    created_at?: string;
    deleted_at?: string | null;
    moderation_status?: string;
  };
};

/**
 * Circle-scoped messaging service.
 * One subscription per active circle; cleans up on stop.
 */
export class CircleMessagingService {
  private supabase: GlowSupabase | null = null;
  private channel: RealtimeChannel | null = null;
  private circleId: string | null = null;
  private parentId: string | null = null;
  private authorName = "You";

  private messages: CircleFeedMessage[] = [];
  private status: MessagingSnapshot["status"] = "loading";
  private error: string | null = null;
  private hasEarlier = false;
  private loadingEarlier = false;
  private sendingClientKey: string | null = null;
  private connection: MessagingConnectionState = "idle";

  private listeners = new Set<Listener>();
  private started = false;
  private loadGeneration = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): MessagingSnapshot {
    return this.snapshot();
  }

  async start(input: {
    circleId: string;
    parentId: string;
    authorName: string;
  }): Promise<void> {
    if (
      this.started &&
      this.circleId === input.circleId &&
      this.parentId === input.parentId
    ) {
      return;
    }

    await this.stop();

    this.started = true;
    this.circleId = input.circleId;
    this.parentId = input.parentId;
    this.authorName = input.authorName.trim() || "You";
    this.supabase = createClient();
    this.status = "loading";
    this.error = null;
    this.messages = [];
    this.hasEarlier = false;
    this.connection = "connecting";
    this.emit();

    const generation = ++this.loadGeneration;
    await this.loadInitialPage(generation);
    if (!this.started || generation !== this.loadGeneration) return;

    this.bindRealtime();
  }

  async stop(): Promise<void> {
    this.started = false;
    this.loadGeneration += 1;
    await this.teardownChannel();
    this.circleId = null;
    this.parentId = null;
    this.supabase = null;
    this.connection = "idle";
    this.sendingClientKey = null;
  }

  async loadEarlier(): Promise<void> {
    if (
      !this.started ||
      !this.supabase ||
      !this.circleId ||
      !this.parentId ||
      !this.hasEarlier ||
      this.loadingEarlier
    ) {
      return;
    }

    const cursor = oldestCursor(this.messages);
    if (!cursor) return;

    this.loadingEarlier = true;
    this.emit();

    const page = await fetchCircleMessagesPage(this.supabase, {
      circleId: this.circleId,
      viewerParentId: this.parentId,
      before: cursor,
    });

    if (!this.started) return;

    this.loadingEarlier = false;

    if (page.error) {
      this.error = "We couldn't load earlier messages just now.";
      this.emit();
      return;
    }

    this.messages = prependOlderMessages(
      this.messages,
      page.messages,
      this.circleId,
    );
    this.hasEarlier = page.hasMore;
    this.error = null;
    this.emit();
  }

  async send(rawBody: string): Promise<{ ok: boolean; reason?: string }> {
    const prepared = prepareMessageBody(rawBody);
    if (!prepared.ok) {
      return { ok: false, reason: prepared.reason };
    }

    if (
      !this.started ||
      !this.supabase ||
      !this.circleId ||
      !this.parentId ||
      this.sendingClientKey
    ) {
      return { ok: false, reason: "busy" };
    }

    const clientKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}`;

    const optimistic = createOptimisticMessage({
      clientKey,
      circleId: this.circleId,
      parentId: this.parentId,
      body: prepared.body,
      authorName: this.authorName,
    });

    this.messages = [...this.messages, optimistic];
    this.sendingClientKey = clientKey;
    this.status = "ready";
    this.emit();

    const result = await insertCircleMessage(this.supabase, {
      circleId: this.circleId,
      parentId: this.parentId,
      body: prepared.body,
    });

    if (!this.started) return { ok: false, reason: "stopped" };

    this.sendingClientKey = null;

    if (result.error || !result.message) {
      this.messages = markMessageFailed(this.messages, clientKey);
      this.emit();
      return { ok: false, reason: "send_failed" };
    }

    this.messages = replaceOptimisticWithConfirmed(
      this.messages,
      clientKey,
      result.message,
      this.circleId,
    );
    this.emit();
    return { ok: true };
  }

  async retry(clientKey: string): Promise<{ ok: boolean }> {
    const failed = this.messages.find(
      (m) => m.clientKey === clientKey && m.status === "failed",
    );
    if (
      !failed ||
      !this.started ||
      !this.supabase ||
      !this.circleId ||
      !this.parentId ||
      this.sendingClientKey
    ) {
      return { ok: false };
    }

    this.messages = markMessageOptimistic(this.messages, clientKey);
    this.sendingClientKey = clientKey;
    this.emit();

    const result = await insertCircleMessage(this.supabase, {
      circleId: this.circleId,
      parentId: this.parentId,
      body: failed.body,
    });

    if (!this.started) return { ok: false };

    this.sendingClientKey = null;

    if (result.error || !result.message) {
      this.messages = markMessageFailed(this.messages, clientKey);
      this.emit();
      return { ok: false };
    }

    this.messages = replaceOptimisticWithConfirmed(
      this.messages,
      clientKey,
      result.message,
      this.circleId,
    );
    this.emit();
    return { ok: true };
  }

  private async loadInitialPage(generation: number): Promise<void> {
    if (!this.supabase || !this.circleId || !this.parentId) return;

    const page = await fetchCircleMessagesPage(this.supabase, {
      circleId: this.circleId,
      viewerParentId: this.parentId,
    });

    if (!this.started || generation !== this.loadGeneration) return;

    if (page.error) {
      this.status = "error";
      this.error =
        "We couldn't load messages just now. Your Circle is still here.";
      this.messages = [];
      this.hasEarlier = false;
      this.emit();
      return;
    }

    this.messages = page.messages;
    this.hasEarlier = page.hasMore;
    this.status = "ready";
    this.error = null;
    this.emit();
  }

  private bindRealtime(): void {
    if (!this.supabase || !this.circleId) return;

    const circleId = this.circleId;
    const channel = this.supabase
      .channel(`circle-messages:${circleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "circle_messages",
          filter: `circle_id=eq.${circleId}`,
        },
        (payload) => {
          void this.handleRealtimeInsert(
            payload as unknown as RealtimeInsertPayload,
          );
        },
      )
      .subscribe((status) => {
        if (!this.started) return;
        if (status === "SUBSCRIBED") {
          this.connection = "connected";
          this.emit();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          this.connection = "disconnected";
          this.emit();
        }
      });

    this.channel = channel;
  }

  private async handleRealtimeInsert(
    payload: RealtimeInsertPayload,
  ): Promise<void> {
    if (!this.started || !this.supabase || !this.circleId || !this.parentId) {
      return;
    }

    const row = payload.new;
    if (!row?.id || !row.circle_id) return;
    if (row.deleted_at) return;
    if (row.moderation_status === "removed") return;

    const existingIds = new Set(this.messages.map((m) => m.id));
    if (
      !shouldAcceptRealtimeMessage({
        activeCircleId: this.circleId,
        incomingCircleId: row.circle_id,
        existingIds,
        incomingId: row.id,
      })
    ) {
      return;
    }

    const { message, error } = await fetchCircleMessageById(this.supabase, {
      messageId: row.id,
      circleId: this.circleId,
      viewerParentId: this.parentId,
    });

    if (!this.started || !this.circleId || error || !message) return;

    this.messages = upsertConfirmedMessage(
      this.messages,
      message,
      this.circleId,
    );
    if (this.status === "error") {
      this.status = "ready";
      this.error = null;
    }
    this.emit();
  }

  private async teardownChannel(): Promise<void> {
    if (this.channel && this.supabase) {
      await this.supabase.removeChannel(this.channel);
    }
    this.channel = null;
  }

  private snapshot(): MessagingSnapshot {
    return {
      messages: this.messages,
      status: this.status,
      error: this.error,
      hasEarlier: this.hasEarlier,
      loadingEarlier: this.loadingEarlier,
      sendingClientKey: this.sendingClientKey,
      connection: this.connection,
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}
