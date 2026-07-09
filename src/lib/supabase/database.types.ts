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
          app_state: string;
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
          map_visibility?: MapVisibility;
        };
        Update: {
          state?: AuState;
          suburb_area?: string | null;
          map_visibility?: MapVisibility;
          approximate_lat?: number | null;
          approximate_lng?: number | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      au_state: AuState;
      feeding_method: FeedingMethod;
      map_visibility: MapVisibility;
    };
    CompositeTypes: Record<string, never>;
  };
};
