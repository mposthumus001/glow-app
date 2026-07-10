import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

import {
  fetchCircleMessageById,
  fetchCircleMessagesPage,
  insertCircleMessage,
} from "./messageApi";
import {
  deleteReaction,
  insertReaction,
} from "../reactions/reactionApi";
import {
  aggregateReactions,
  canReactToMessage,
  findViewerReactionRow,
  removeReactionRow,
  replaceReactionRowId,
  type ReactionAggregate,
  type ReactionRow,
  upsertReactionRow,
} from "../reactions/reactionLogic";
import {
  advanceCircleReadState,
  fetchCircleReadMembership,
} from "../reactions/readStateApi";
import {
  countUnreadMessages,
  findFirstUnreadIndex,
  markerFromMembership,
  mergeReadMarkerMonotonic,
  READ_STATE_DEBOUNCE_MS,
  shouldAdvanceReadMarker,
  type ReadMarker,
} from "../reactions/readStateLogic";
import {
  fetchHiddenMessageIds,
  hideMessageForParent,
} from "../safety/hideApi";
import { submitMessageReport } from "../safety/reportApi";
import { filterVisibleMessages } from "../safety/hideLogic";
import type { CircleReactionType, ReportReason } from "@/lib/supabase/database.types";
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
import {
  TYPING_PUBLISH_DELAY_MS,
  TYPING_REFRESH_MS,
  applyTypingEventForCircle,
  clearExpiredTyping,
  countUniqueOnlineParents,
  firstDisplayName,
  formatTypingIndicatorCopy,
  reconnectBackoffMs,
  uniquePresenceByParentId,
  type CircleConnectionState,
  type CirclePresencePayload,
  type CircleTypingPayload,
  type CircleTypingPeer,
} from "./presenceLogic";
import { shouldAcceptRealtimeMessage } from "./subscriptionLifecycle";

type GlowSupabase = SupabaseClient<Database>;

export type MessagingConnectionState = CircleConnectionState;

export type MessagingSnapshot = {
  messages: CircleFeedMessage[];
  status: "loading" | "ready" | "error";
  error: string | null;
  hasEarlier: boolean;
  loadingEarlier: boolean;
  sendingClientKey: string | null;
  connection: MessagingConnectionState;
  /** Unique parents currently in the circle channel. */
  onlineCount: number;
  /** Privacy-safe first names for a small preview (excludes viewer). */
  onlinePreviewNames: string[];
  /** Calm typing line for others only; null when quiet. */
  typingLabel: string | null;
  /** Aggregate reactions keyed by message id. */
  reactionsByMessage: Record<string, ReactionAggregate[]>;
  unreadCount: number;
  firstUnreadIndex: number | null;
  readMarker: ReadMarker | null;
};

type Listener = (snapshot: MessagingSnapshot) => void;

type ReactionRealtimePayload = {
  new?: {
    id?: string;
    message_id?: string;
    parent_id?: string;
    reaction_type?: CircleReactionType;
  };
  old?: {
    id?: string;
    message_id?: string;
    parent_id?: string;
    reaction_type?: CircleReactionType;
  };
};

type MembershipUpdatePayload = {
  new?: {
    circle_id?: string;
    parent_id?: string;
    last_read_message_id?: string | null;
  };
};

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

type ReadObservation = {
  isNearBottom: boolean;
  isPageVisible: boolean;
  observedMessageId: string | null;
};

const TYPING_EVENT = "typing";

/**
 * Circle realtime owner (Sprint 4.2 + 4.3).
 *
 * One channel per active circle (`circle:{id}`) owns:
 * - postgres_changes message inserts
 * - Realtime Presence join/sync/leave
 * - typing Broadcast
 * - reconnect + cleanup
 */
export class CircleMessagingService {
  private supabase: GlowSupabase | null = null;
  private channel: RealtimeChannel | null = null;
  private circleId: string | null = null;
  private parentId: string | null = null;
  private authorName = "You";
  private displayFirstName = "A parent";

  private messages: CircleFeedMessage[] = [];
  private status: MessagingSnapshot["status"] = "loading";
  private error: string | null = null;
  private hasEarlier = false;
  private loadingEarlier = false;
  private sendingClientKey: string | null = null;
  private connection: MessagingConnectionState = "idle";

  private presencePeers: CirclePresencePayload[] = [];
  private typingPeers: CircleTypingPeer[] = [];
  private locallyTyping = false;

  private reactionRows: ReactionRow[] = [];
  private knownReactionIds = new Set<string>();
  private readMarker: ReadMarker | null = null;
  private readObservation: ReadObservation = {
    isNearBottom: false,
    isPageVisible: true,
    observedMessageId: null,
  };
  private readPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingReadMessageId: string | null = null;
  private togglingReactionKey: string | null = null;
  private hiddenMessageIds = new Set<string>();
  private sendPromptId: string | null = null;

  private listeners = new Set<Listener>();
  private started = false;
  private intentionalStop = false;
  private loadGeneration = 0;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private typingPublishTimer: ReturnType<typeof setTimeout> | null = null;
  private typingRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private typingExpireTimer: ReturnType<typeof setInterval> | null = null;
  private removeNetwork?: () => void;

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
    this.intentionalStop = false;
    this.circleId = input.circleId;
    this.parentId = input.parentId;
    this.authorName = input.authorName.trim() || "You";
    this.displayFirstName = firstDisplayName(this.authorName);
    this.supabase = createClient();
    this.status = "loading";
    this.error = null;
    this.messages = [];
    this.hasEarlier = false;
    this.presencePeers = [];
    this.typingPeers = [];
    this.locallyTyping = false;
    this.reactionRows = [];
    this.knownReactionIds = new Set();
    this.readMarker = null;
    this.readObservation = {
      isNearBottom: false,
      isPageVisible: true,
      observedMessageId: null,
    };
    this.clearReadPersistTimer();
    this.pendingReadMessageId = null;
    this.togglingReactionKey = null;
    this.hiddenMessageIds = new Set();
    this.sendPromptId = null;
    this.connection = "connecting";
    this.reconnectAttempt = 0;
    this.bindNetwork();
    this.startTypingExpirySweep();
    this.emit();

    const generation = ++this.loadGeneration;
    await this.loadInitialPage(generation);
    if (!this.started || generation !== this.loadGeneration) return;

    this.bindRealtime();
  }

  async stop(): Promise<void> {
    this.intentionalStop = true;
    this.started = false;
    this.loadGeneration += 1;
    this.clearReconnect();
    this.clearTypingTimers();
    this.stopTypingExpirySweep();
    this.unbindNetwork();
    await this.broadcastTyping(false);
    await this.teardownChannel();
    this.circleId = null;
    this.parentId = null;
    this.supabase = null;
    this.connection = "idle";
    this.sendingClientKey = null;
    this.presencePeers = [];
    this.typingPeers = [];
    this.locallyTyping = false;
    this.reactionRows = [];
    this.knownReactionIds = new Set();
    this.readMarker = null;
    this.clearReadPersistTimer();
    this.hiddenMessageIds = new Set();
    this.sendPromptId = null;
  }

  setSendPromptId(promptId: string | null): void {
    this.sendPromptId = promptId;
  }

  async hideMessage(messageId: string): Promise<{ ok: boolean }> {
    if (!this.started || !this.supabase || !this.parentId) {
      return { ok: false };
    }

    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.status !== "confirmed") {
      return { ok: false };
    }

    this.hiddenMessageIds = new Set([...this.hiddenMessageIds, messageId]);
    this.emit();

    const result = await hideMessageForParent(this.supabase, {
      parentId: this.parentId,
      messageId,
    });

    if (!result.ok) {
      const next = new Set(this.hiddenMessageIds);
      next.delete(messageId);
      this.hiddenMessageIds = next;
      this.emit();
    }

    return { ok: result.ok };
  }

  async reportMessage(input: {
    messageId: string;
    reportedParentId: string;
    reasonCode: ReportReason;
    notes: string | null;
  }): Promise<{ ok: boolean; duplicate?: boolean }> {
    if (!this.started || !this.supabase || !this.parentId || !this.circleId) {
      return { ok: false };
    }

    const result = await submitMessageReport(this.supabase, {
      reporterParentId: this.parentId,
      messageId: input.messageId,
      circleId: this.circleId,
      reportedParentId: input.reportedParentId,
      reasonCode: input.reasonCode,
      notes: input.notes,
    });

    return { ok: result.ok, duplicate: result.duplicate };
  }

  updateReadObservation(input: ReadObservation): void {
    if (!this.started) return;
    this.readObservation = input;
    this.scheduleReadPersist();
  }

  async toggleReaction(input: {
    messageId: string;
    reactionType: CircleReactionType;
  }): Promise<{ ok: boolean }> {
    if (
      !this.started ||
      !this.supabase ||
      !this.circleId ||
      !this.parentId ||
      this.togglingReactionKey
    ) {
      return { ok: false };
    }

    const message = this.messages.find((m) => m.id === input.messageId);
    if (
      !message ||
      !canReactToMessage({
        messageId: message.id,
        circleId: message.circleId,
        activeCircleId: this.circleId,
        status: message.status,
      })
    ) {
      return { ok: false };
    }

    const toggleKey = `${input.messageId}:${input.reactionType}`;
    this.togglingReactionKey = toggleKey;

    const existing = findViewerReactionRow(this.reactionRows, {
      messageId: input.messageId,
      parentId: this.parentId,
      reactionType: input.reactionType,
    });

    const previousRows = [...this.reactionRows];

    if (existing) {
      this.reactionRows = removeReactionRow(
        this.reactionRows,
        (row) => row.id === existing.id,
      );
      this.knownReactionIds.delete(existing.id);
      this.emit();

      const result = await deleteReaction(this.supabase, {
        messageId: input.messageId,
        parentId: this.parentId,
        reactionType: input.reactionType,
      });

      this.togglingReactionKey = null;
      if (!this.started) return { ok: false };

      if (result.error) {
        this.reactionRows = previousRows;
        this.knownReactionIds.add(existing.id);
        this.emit();
        return { ok: false };
      }

      return { ok: true };
    }

    const optimisticId = `optimistic:${toggleKey}`;
    this.reactionRows = upsertReactionRow(this.reactionRows, {
      id: optimisticId,
      messageId: input.messageId,
      parentId: this.parentId,
      reactionType: input.reactionType,
    });
    this.emit();

    const result = await insertReaction(this.supabase, {
      messageId: input.messageId,
      parentId: this.parentId,
      reactionType: input.reactionType,
    });

    this.togglingReactionKey = null;
    if (!this.started) return { ok: false };

    if (result.error || !result.row) {
      this.reactionRows = previousRows;
      this.emit();
      return { ok: false };
    }

    this.reactionRows = replaceReactionRowId(
      this.reactionRows,
      optimisticId,
      result.row,
    );
    this.knownReactionIds.add(result.row.id);
    this.emit();
    return { ok: true };
  }

  /**
   * Composer activity — debounced publish, refresh while active.
   * Does not emit on every keystroke to listeners beyond typing peers.
   */
  notifyTypingActivity(): void {
    if (!this.started || this.connection === "disconnected") return;

    if (this.typingPublishTimer) {
      clearTimeout(this.typingPublishTimer);
    }

    this.typingPublishTimer = setTimeout(() => {
      this.typingPublishTimer = null;
      void this.beginTyping();
    }, TYPING_PUBLISH_DELAY_MS);
  }

  async stopTyping(): Promise<void> {
    this.clearTypingTimers();
    if (!this.locallyTyping) return;
    this.locallyTyping = false;
    await this.broadcastTyping(false);
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
    await this.loadReactionsForMessageIds(
      page.messages.filter((m) => m.status === "confirmed").map((m) => m.id),
    );
    this.emit();
  }

  async send(rawBody: string): Promise<{ ok: boolean; reason?: string }> {
    await this.stopTyping();

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
      promptId: this.sendPromptId,
    });

    this.messages = [...this.messages, optimistic];
    this.sendingClientKey = clientKey;
    this.status = "ready";
    this.emit();

    const result = await insertCircleMessage(this.supabase, {
      circleId: this.circleId,
      parentId: this.parentId,
      body: prepared.body,
      promptId: this.sendPromptId,
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

    await this.hydrateReactionsAndReadState();
    if (this.supabase && this.parentId) {
      this.hiddenMessageIds = await fetchHiddenMessageIds(
        this.supabase,
        this.parentId,
      );
    }
    this.emit();
  }

  private async hydrateReactionsAndReadState(): Promise<void> {
    if (!this.supabase || !this.circleId || !this.parentId) return;

    const confirmedIds = this.messages
      .filter((m) => m.status === "confirmed")
      .map((m) => m.id);

    const membershipPromise = fetchCircleReadMembership(this.supabase, {
      circleId: this.circleId,
      parentId: this.parentId,
    });

    if (confirmedIds.length === 0) {
      this.reactionRows = [];
      this.knownReactionIds = new Set();
    } else {
      const { data } = await this.supabase
        .from("circle_message_reactions")
        .select("id, message_id, parent_id, reaction_type")
        .in("message_id", confirmedIds);

      this.reactionRows = ((data ?? []) as Array<{
        id: string;
        message_id: string;
        parent_id: string;
        reaction_type: CircleReactionType;
      }>).map((row) => ({
        id: row.id,
        messageId: row.message_id,
        parentId: row.parent_id,
        reactionType: row.reaction_type,
      }));
      this.knownReactionIds = new Set(this.reactionRows.map((row) => row.id));
    }

    const membership = await membershipPromise;
    this.readMarker = markerFromMembership({
      lastReadMessageId: membership?.lastReadMessageId ?? null,
      lastReadAt: membership?.lastReadAt ?? null,
      messages: this.messages,
    });
  }

  private async loadReactionsForMessageIds(messageIds: string[]): Promise<void> {
    if (!this.supabase || !this.parentId || messageIds.length === 0) return;

    const { data } = await this.supabase
      .from("circle_message_reactions")
      .select("id, message_id, parent_id, reaction_type")
      .in("message_id", messageIds);

    if (!data) return;

    for (const row of data as Array<{
      id: string;
      message_id: string;
      parent_id: string;
      reaction_type: CircleReactionType;
    }>) {
      if (this.knownReactionIds.has(row.id)) continue;
      this.reactionRows = upsertReactionRow(this.reactionRows, {
        id: row.id,
        messageId: row.message_id,
        parentId: row.parent_id,
        reactionType: row.reaction_type,
      });
      this.knownReactionIds.add(row.id);
    }
  }

  private bindRealtime(): void {
    if (!this.supabase || !this.circleId || !this.parentId) return;

    const circleId = this.circleId;
    const parentId = this.parentId;

    const channel = this.supabase.channel(`circle:${circleId}`, {
      config: {
        presence: { key: parentId },
        broadcast: { self: false },
      },
    });

    channel.on(
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
    );

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "circle_message_reactions",
      },
      (payload) => {
        this.handleReactionInsert(payload as unknown as ReactionRealtimePayload);
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "circle_message_reactions",
      },
      (payload) => {
        this.handleReactionDelete(payload as unknown as ReactionRealtimePayload);
      },
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "circle_members",
        filter: `parent_id=eq.${parentId}`,
      },
      (payload) => {
        this.handleMembershipReadUpdate(
          payload as unknown as MembershipUpdatePayload,
          circleId,
        );
      },
    );

    channel.on("presence", { event: "sync" }, () => {
      this.ingestPresence(channel, circleId);
    });
    channel.on("presence", { event: "join" }, () => {
      this.ingestPresence(channel, circleId);
    });
    channel.on("presence", { event: "leave" }, () => {
      this.ingestPresence(channel, circleId);
    });

    channel.on("broadcast", { event: TYPING_EVENT }, ({ payload }) => {
      this.handleTypingBroadcast(payload as CircleTypingPayload, circleId);
    });

    this.channel = channel;

    channel.subscribe(async (status) => {
      if (!this.started || this.intentionalStop) return;

      if (status === "SUBSCRIBED") {
        this.reconnectAttempt = 0;
        this.clearReconnect();
        this.connection = "connected";
        await this.trackPresence();
        this.emit();
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.connection = "disconnected";
        this.clearRemoteTyping();
        this.emit();
        this.scheduleReconnect();
        return;
      }

      if (status === "CLOSED") {
        this.connection = "disconnected";
        this.clearRemoteTyping();
        this.emit();
        if (!this.intentionalStop && this.started) {
          this.scheduleReconnect();
        }
      }
    });
  }

  private ingestPresence(channel: RealtimeChannel, circleId: string): void {
    if (!this.started || this.circleId !== circleId) return;

    const state = channel.presenceState<CirclePresencePayload>();
    const raw: CirclePresencePayload[] = [];

    for (const metas of Object.values(state)) {
      for (const meta of metas) {
        if (!meta?.parentId) continue;
        raw.push({
          parentId: meta.parentId,
          displayName: firstDisplayName(meta.displayName ?? "A parent"),
        });
      }
    }

    this.presencePeers = uniquePresenceByParentId(raw);
    this.emit();
  }

  private handleTypingBroadcast(
    payload: CircleTypingPayload,
    circleId: string,
  ): void {
    if (!this.started || !this.parentId || !this.circleId) return;
    if (this.circleId !== circleId) return;

    this.typingPeers = applyTypingEventForCircle(
      this.typingPeers,
      payload,
      this.parentId,
      this.circleId,
      circleId,
    );
    this.emit();
  }

  private async trackPresence(): Promise<void> {
    if (!this.channel || !this.parentId) return;

    const payload: CirclePresencePayload = {
      parentId: this.parentId,
      displayName: this.displayFirstName,
    };

    await this.channel.track(payload);
  }

  private async beginTyping(): Promise<void> {
    if (!this.started || !this.channel) return;
    this.locallyTyping = true;
    await this.broadcastTyping(true);

    if (this.typingRefreshTimer) {
      clearInterval(this.typingRefreshTimer);
    }
    this.typingRefreshTimer = setInterval(() => {
      if (!this.locallyTyping) return;
      void this.broadcastTyping(true);
    }, TYPING_REFRESH_MS);
  }

  private async broadcastTyping(typing: boolean): Promise<void> {
    if (!this.channel || !this.parentId) return;

    const payload: CircleTypingPayload = {
      parentId: this.parentId,
      displayName: this.displayFirstName,
      typing,
      at: Date.now(),
    };

    await this.channel.send({
      type: "broadcast",
      event: TYPING_EVENT,
      payload,
    });
  }

  private clearRemoteTyping(): void {
    if (this.typingPeers.length === 0) return;
    this.typingPeers = [];
  }

  private clearTypingTimers(): void {
    if (this.typingPublishTimer) {
      clearTimeout(this.typingPublishTimer);
      this.typingPublishTimer = null;
    }
    if (this.typingRefreshTimer) {
      clearInterval(this.typingRefreshTimer);
      this.typingRefreshTimer = null;
    }
  }

  private startTypingExpirySweep(): void {
    this.stopTypingExpirySweep();
    this.typingExpireTimer = setInterval(() => {
      if (!this.started) return;
      const next = clearExpiredTyping(this.typingPeers);
      if (next.length !== this.typingPeers.length) {
        this.typingPeers = next;
        this.emit();
      }
    }, 1_000);
  }

  private stopTypingExpirySweep(): void {
    if (this.typingExpireTimer) {
      clearInterval(this.typingExpireTimer);
      this.typingExpireTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalStop || !this.started) return;
    if (this.reconnectTimer) return;

    this.connection = "reconnecting";
    this.emit();

    const delay = reconnectBackoffMs(this.reconnectAttempt);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.intentionalStop || !this.started) return;
      void this.rejoinChannel();
    }, delay);
  }

  private async rejoinChannel(): Promise<void> {
    if (this.intentionalStop || !this.started) return;
    this.connection = "reconnecting";
    this.emit();
    await this.teardownChannel();
    if (this.intentionalStop || !this.started) return;
    this.bindRealtime();
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private bindNetwork(): void {
    if (typeof window === "undefined") return;

    const onOffline = () => {
      if (!this.started) return;
      this.connection = "disconnected";
      this.clearRemoteTyping();
      this.emit();
    };

    const onOnline = () => {
      if (!this.started || this.intentionalStop) return;
      this.scheduleReconnect();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    this.removeNetwork = () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }

  private unbindNetwork(): void {
    this.removeNetwork?.();
    this.removeNetwork = undefined;
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

  private handleReactionInsert(payload: ReactionRealtimePayload): void {
    if (!this.started || !this.parentId || !this.circleId) return;

    const row = payload.new;
    if (!row?.id || !row.message_id || !row.parent_id || !row.reaction_type) {
      return;
    }

    if (this.knownReactionIds.has(row.id)) return;

    const messageLoaded = this.messages.some(
      (m) => m.id === row.message_id && m.status === "confirmed",
    );
    if (!messageLoaded) return;

    if (row.parent_id === this.parentId) {
      this.reactionRows = removeReactionRow(
        this.reactionRows,
        (existing) =>
          existing.id.startsWith("optimistic:") &&
          existing.messageId === row.message_id &&
          existing.reactionType === row.reaction_type &&
          existing.parentId === this.parentId,
      );
    }

    this.reactionRows = upsertReactionRow(this.reactionRows, {
      id: row.id,
      messageId: row.message_id,
      parentId: row.parent_id,
      reactionType: row.reaction_type,
    });
    this.knownReactionIds.add(row.id);
    this.emit();
  }

  private handleReactionDelete(payload: ReactionRealtimePayload): void {
    if (!this.started || !this.parentId) return;

    const row = payload.old;
    if (!row?.id) return;

    this.reactionRows = removeReactionRow(
      this.reactionRows,
      (existing) => existing.id === row.id,
    );
    this.knownReactionIds.delete(row.id);
    this.emit();
  }

  private handleMembershipReadUpdate(
    payload: MembershipUpdatePayload,
    circleId: string,
  ): void {
    if (!this.started || !this.parentId) return;

    const update = payload.new;
    if (!update?.last_read_message_id || update.circle_id !== circleId) {
      return;
    }

    const message = this.messages.find(
      (m) => m.id === update.last_read_message_id && m.status === "confirmed",
    );
    if (!message) return;

    const incoming: ReadMarker = {
      messageId: message.id,
      createdAt: message.createdAt,
    };
    this.readMarker = mergeReadMarkerMonotonic(this.readMarker, incoming);
    this.emit();
  }

  private scheduleReadPersist(): void {
    this.clearReadPersistTimer();
    this.readPersistTimer = setTimeout(() => {
      this.readPersistTimer = null;
      void this.persistReadStateIfNeeded();
    }, READ_STATE_DEBOUNCE_MS);
  }

  private clearReadPersistTimer(): void {
    if (this.readPersistTimer) {
      clearTimeout(this.readPersistTimer);
      this.readPersistTimer = null;
    }
  }

  private async persistReadStateIfNeeded(): Promise<void> {
    if (!this.started || !this.supabase || !this.circleId || !this.parentId) {
      return;
    }

    const observedMessage = this.readObservation.observedMessageId
      ? this.messages.find(
          (m) =>
            m.id === this.readObservation.observedMessageId &&
            m.status === "confirmed",
        ) ?? null
      : null;

    const bottomMessage = this.readObservation.isNearBottom
      ? this.messages.filter((m) => m.status === "confirmed").at(-1) ?? null
      : null;

    const candidate = bottomMessage ?? observedMessage;

    if (
      !shouldAdvanceReadMarker({
        candidate,
        currentMarker: this.readMarker,
        isNearBottom: this.readObservation.isNearBottom,
        isPageVisible: this.readObservation.isPageVisible,
        observedNewestUnread:
          observedMessage != null &&
          observedMessage.id ===
            this.messages.filter((m) => m.status === "confirmed").at(-1)?.id,
      })
    ) {
      return;
    }

    if (!candidate || this.pendingReadMessageId === candidate.id) return;
    this.pendingReadMessageId = candidate.id;

    const result = await advanceCircleReadState(this.supabase, {
      circleId: this.circleId,
      messageId: candidate.id,
    });

    this.pendingReadMessageId = null;
    if (!this.started || result.error || !result.advanced) return;

    this.readMarker = mergeReadMarkerMonotonic(this.readMarker, {
      messageId: candidate.id,
      createdAt: candidate.createdAt,
    });
    this.emit();
  }

  private reactionsSnapshot(): Record<string, ReactionAggregate[]> {
    const map = aggregateReactions(this.reactionRows, this.parentId ?? "");
    const record: Record<string, ReactionAggregate[]> = {};
    for (const [messageId, entry] of map) {
      record[messageId] = entry.aggregates;
    }
    return record;
  }

  private async teardownChannel(): Promise<void> {
    if (this.channel && this.supabase) {
      try {
        await this.channel.untrack();
      } catch {
        // Channel may already be closed.
      }
      await this.supabase.removeChannel(this.channel);
    }
    this.channel = null;
  }

  private snapshot(): MessagingSnapshot {
    const unique = uniquePresenceByParentId(this.presencePeers);
    const onlineCount = countUniqueOnlineParents(unique);
    const onlinePreviewNames = unique
      .filter((p) => p.parentId !== this.parentId)
      .map((p) => p.displayName)
      .slice(0, 2);

    const typingLabel = this.parentId
      ? formatTypingIndicatorCopy(this.typingPeers, this.parentId)
      : null;

    const visibleMessages = filterVisibleMessages(
      this.messages,
      this.hiddenMessageIds,
    );

    const unreadCount = countUnreadMessages(visibleMessages, this.readMarker);
    const firstUnreadIndex = findFirstUnreadIndex(
      visibleMessages,
      this.readMarker,
    );

    return {
      messages: visibleMessages,
      status: this.status,
      error: this.error,
      hasEarlier: this.hasEarlier,
      loadingEarlier: this.loadingEarlier,
      sendingClientKey: this.sendingClientKey,
      connection: this.connection,
      onlineCount,
      onlinePreviewNames,
      typingLabel,
      reactionsByMessage: this.reactionsSnapshot(),
      unreadCount,
      firstUnreadIndex,
      readMarker: this.readMarker,
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}
