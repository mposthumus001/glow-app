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
  deleted_at: string | null;
};

export type CircleMessageRow = {
  id: string;
  circle_id: string;
  parent_id: string;
  body: string;
  moderation_status: ModerationStatus;
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
    Functions: Record<string, never>;
    Enums: {
      au_state: AuState;
      feeding_method: FeedingMethod;
      map_visibility: MapVisibility;
      app_state: AppState;
      circle_type: CircleType;
      circle_status: CircleStatus;
      circle_member_status: CircleMemberStatus;
      moderation_status: ModerationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
