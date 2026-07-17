export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AuState =
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "ACT"
  | "NT";

export type FeedingMethod =
  | "breastfeeding"
  | "bottle"
  | "mixed"
  | "solids"
  | "other";

export type BabyEventType =
  | "breastfeed"
  | "bottle_feed"
  | "pump"
  | "formula"
  | "expressed_milk"
  | "solids"
  | "sleep"
  | "nappy"
  | "medication"
  | "milestone"
  | "note";

export type FeedSide = "left" | "right" | "both" | "none";

export type NappyType = "wet" | "dirty" | "both";

export type BabyEventRow = {
  id: string;
  parent_id: string;
  baby_id: string;
  family_id: string;
  event_type: BabyEventType;
  started_at: string;
  ended_at: string | null;
  amount_ml: number | null;
  side: FeedSide | null;
  notes: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MapVisibility = "hidden" | "state_only" | "suburb_area";

export type AppState = "active" | "background" | "offline";

export type CircleType =
  | "general"
  | "birth_month"
  | "age_band"
  | "feeding_method"
  | "nicu"
  | "twins"
  | "local";

export type CircleStatus = "forming" | "active" | "paused" | "archived";

export type CircleMemberStatus = "active" | "left" | "removed" | "muted";

export type CircleReactionType =
  | "support"
  | "with_you"
  | "tiny_win"
  | "sending_care";

export type ReportReason =
  | "harmful"
  | "harassment"
  | "misinformation"
  | "privacy"
  | "spam"
  | "other";

export type ModerationStatus = "clean" | "flagged" | "removed";

export type ParentRow = {
  id: string;
  family_id: string | null;
  display_name: string;
  avatar_url: string | null;
  state: AuState;
  suburb_area: string | null;
  feeding_method: FeedingMethod | null;
  first_child: boolean;
  map_visibility: MapVisibility;
  subscription_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CircleRow = {
  id: string;
  name: string;
  description: string | null;
  primary_state: AuState;
  baby_age_min_months: number;
  baby_age_max_months: number;
  circle_type: CircleType;
  status: CircleStatus;
  max_members: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CircleMemberRow = {
  id: string;
  circle_id: string;
  parent_id: string;
  status: CircleMemberStatus;
  joined_at: string;
  last_read_at: string | null;
  last_read_message_id: string | null;
  deleted_at: string | null;
};

export type CircleMessageRow = {
  id: string;
  circle_id: string;
  parent_id: string;
  body: string;
  moderation_status: ModerationStatus;
  prompt_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      parents: {
        Row: ParentRow;
        Insert: Partial<ParentRow> & {
          id: string;
          display_name: string;
          state: AuState;
        };
        Update: Partial<ParentRow>;
        Relationships: [];
      };
      preferences: {
        Row: {
          parent_id: string;
          theme_mode: string;
          reduce_motion: boolean;
          map_visibility_default: MapVisibility;
          circle_activity_notifications: boolean;
          quiet_time_enabled: boolean;
          silent_from: string | null;
          silent_to: string | null;
          daily_encouragement: boolean;
          updated_at: string;
        };
        Insert: {
          parent_id: string;
          map_visibility_default?: MapVisibility;
        };
        Update: {
          map_visibility_default?: MapVisibility;
        };
        Relationships: [];
      };
      presence: {
        Row: {
          parent_id: string;
          online_status: boolean;
          app_state: AppState;
          state: AuState;
          suburb_area: string | null;
          approximate_lat: number | null;
          approximate_lng: number | null;
          map_visibility: MapVisibility;
          current_circle_id: string | null;
          last_seen_at: string;
          updated_at: string;
        };
        Insert: {
          parent_id: string;
          state: AuState;
          suburb_area?: string | null;
          map_visibility?: MapVisibility;
          online_status?: boolean;
          app_state?: AppState;
          approximate_lat?: number | null;
          approximate_lng?: number | null;
          current_circle_id?: string | null;
          last_seen_at?: string;
        };
        Update: {
          state?: AuState;
          suburb_area?: string | null;
          map_visibility?: MapVisibility;
          online_status?: boolean;
          app_state?: AppState;
          approximate_lat?: number | null;
          approximate_lng?: number | null;
          current_circle_id?: string | null;
          last_seen_at?: string;
        };
        Relationships: [];
      };
      babies: {
        Row: {
          id: string;
          parent_id: string;
          family_id: string;
          name: string;
          date_of_birth: string | null;
          due_date: string | null;
          feeding_method: FeedingMethod | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          parent_id: string;
          family_id: string;
          name: string;
          date_of_birth?: string | null;
          due_date?: string | null;
          feeding_method?: FeedingMethod | null;
        };
        Update: Partial<{
          name: string;
          date_of_birth: string | null;
          due_date: string | null;
          feeding_method: FeedingMethod | null;
        }>;
        Relationships: [];
      };
      baby_events: {
        Row: BabyEventRow;
        Insert: {
          parent_id: string;
          baby_id: string;
          family_id: string;
          event_type: BabyEventType;
          started_at?: string;
          ended_at?: string | null;
          amount_ml?: number | null;
          side?: FeedSide | null;
          notes?: string | null;
          metadata?: Json;
        };
        Update: Partial<{
          event_type: BabyEventType;
          started_at: string;
          ended_at: string | null;
          amount_ml: number | null;
          side: FeedSide | null;
          notes: string | null;
          metadata: Json;
          deleted_at: string | null;
        }>;
        Relationships: [];
      };
      circles: {
        Row: CircleRow;
        Insert: Partial<CircleRow> & {
          name: string;
          primary_state: AuState;
        };
        Update: Partial<CircleRow>;
        Relationships: [];
      };
      circle_members: {
        Row: CircleMemberRow;
        Insert: Partial<CircleMemberRow> & {
          circle_id: string;
          parent_id: string;
        };
        Update: Partial<CircleMemberRow>;
        Relationships: [];
      };
      circle_messages: {
        Row: CircleMessageRow;
        Insert: Partial<CircleMessageRow> & {
          circle_id: string;
          parent_id: string;
          body: string;
        };
        Update: Partial<CircleMessageRow>;
        Relationships: [];
      };
      circle_message_reactions: {
        Row: {
          id: string;
          message_id: string;
          parent_id: string;
          reaction_type: CircleReactionType;
          created_at: string;
        };
        Insert: {
          message_id: string;
          parent_id: string;
          reaction_type: CircleReactionType;
        };
        Update: Partial<{
          reaction_type: CircleReactionType;
        }>;
        Relationships: [];
      };
      circle_prompts: {
        Row: {
          id: string;
          circle_id: string;
          prompt_date: string;
          title: string | null;
          prompt_text: string;
          library_index: number | null;
          is_active: boolean;
          source: string;
          created_at: string;
        };
        Insert: Partial<{
          circle_id: string;
          prompt_date: string;
          prompt_text: string;
        }>;
        Update: Partial<{
          is_active: boolean;
        }>;
        Relationships: [];
      };
      hidden_messages: {
        Row: {
          id: string;
          parent_id: string;
          message_id: string;
          hidden_at: string;
        };
        Insert: {
          parent_id: string;
          message_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_parent_id: string;
          reported_parent_id: string | null;
          circle_id: string | null;
          message_id: string | null;
          reason: string;
          reason_code: ReportReason | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          reporter_parent_id: string;
          reason: string;
          reported_parent_id?: string | null;
          circle_id?: string | null;
          message_id?: string | null;
          reason_code?: ReportReason | null;
          notes?: string | null;
          status?: string;
        };
        Update: Partial<{
          status: string;
          notes: string | null;
        }>;
        Relationships: [];
      };
      account_deletion_requests: {
        Row: {
          id: string;
          parent_id: string;
          status: "pending" | "cancelled" | "processed";
          reason: string | null;
          requested_at: string;
          processed_at: string | null;
          updated_at: string;
        };
        Insert: {
          parent_id: string;
          status?: "pending" | "cancelled" | "processed";
          reason?: string | null;
        };
        Update: Partial<{
          status: "pending" | "cancelled" | "processed";
          reason: string | null;
          processed_at: string | null;
        }>;
        Relationships: [];
      };
      app_feedback: {
        Row: {
          id: string;
          parent_id: string;
          category: "feedback" | "technical" | "safety" | "other";
          message: string;
          app_version: string | null;
          route_context: string | null;
          created_at: string;
        };
        Insert: {
          parent_id: string;
          category: "feedback" | "technical" | "safety" | "other";
          message: string;
          app_version?: string | null;
          route_context?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      beta_feedback: {
        Row: {
          id: string;
          parent_id: string;
          category: "bug" | "confusing" | "suggestion" | "other";
          summary: string;
          details: string | null;
          route: string | null;
          app_version: string | null;
          environment: string | null;
          user_agent: string | null;
          viewport: string | null;
          contact_allowed: boolean;
          status: "new" | "reviewed" | "closed";
          created_at: string;
        };
        Insert: {
          parent_id: string;
          category: "bug" | "confusing" | "suggestion" | "other";
          summary: string;
          details?: string | null;
          route?: string | null;
          app_version?: string | null;
          environment?: string | null;
          user_agent?: string | null;
          viewport?: string | null;
          contact_allowed?: boolean;
          status?: "new" | "reviewed" | "closed";
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: {
      map_presence: {
        Row: {
          parent_id: string;
          online_status: boolean;
          app_state: AppState;
          state: AuState;
          suburb_area: string | null;
          approximate_lat: number | null;
          approximate_lng: number | null;
          map_visibility: MapVisibility;
          current_circle_id: string | null;
          last_seen_at: string;
        };
        Relationships: [];
      };
      map_cluster_public: {
        Row: {
          id: string;
          level: "country" | "state" | "suburb_area";
          state: AuState | null;
          suburb_area: string | null;
          online_count: number;
          approximate_lat: number | null;
          approximate_lng: number | null;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_beta_email_allowed: {
        Args: { p_email: string };
        Returns: boolean;
      };
      assign_parent_to_circle: {
        Args: { p_parent_id?: string };
        Returns: Json;
      };
      parent_baby_age_months: {
        Args: { p_parent_id: string };
        Returns: number;
      };
      advance_circle_read_state: {
        Args: { p_circle_id: string; p_message_id: string };
        Returns: Json;
      };
      ensure_circle_daily_prompt: {
        Args: { p_circle_id?: string };
        Returns: Json;
      };
      australian_prompt_date: {
        Args: { p_at?: string };
        Returns: string;
      };
    };
    Enums: {
      au_state: AuState;
      feeding_method: FeedingMethod;
      baby_event_type: BabyEventType;
      feed_side: FeedSide;
      map_visibility: MapVisibility;
      app_state: AppState;
      circle_type: CircleType;
      circle_status: CircleStatus;
      circle_member_status: CircleMemberStatus;
      moderation_status: ModerationStatus;
      reaction_type: CircleReactionType;
      report_reason: ReportReason;
    };
    CompositeTypes: Record<string, never>;
  };
};
