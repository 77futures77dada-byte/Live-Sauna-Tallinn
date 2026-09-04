// Hand-written to match supabase/migrations/0001_schema.sql until a live
// Supabase project exists — replace with `supabase gen types typescript`
// output once the project is provisioned (see docs/ARCHITECTURE.md, Phase 0).

export type LocationType =
  | "sauna"
  | "winter_swimming"
  | "beach"
  | "ice_swimming"
  | "sauna_swimming";

export type IceCondition = "none" | "partial" | "frozen";
export type CrowdLevel = "low" | "medium" | "high";
export type BookingStatus =
  | "confirmed"
  | "cancelled"
  | "completed"
  | "fulfilled"
  | "no_show";
export type PhotoType = "before" | "after" | "booking_verification";
export type ReportSource = "user" | "sensor";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          reputation: number;
          reports_count: number;
          confirmed_reports: number;
          rejected_reports: number;
          is_admin: boolean;
          is_banned: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          reputation?: number;
          reports_count?: number;
          confirmed_reports?: number;
          rejected_reports?: number;
          is_admin?: boolean;
          is_banned?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          description_et: string | null;
          description_en: string | null;
          description_ru: string | null;
          latitude: number;
          longitude: number;
          type: LocationType;
          capacity: number | null;
          booking_enabled: boolean;
          opening_hours: Record<string, string> | null;
          is_free: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          description_et?: string | null;
          description_en?: string | null;
          description_ru?: string | null;
          latitude: number;
          longitude: number;
          type: LocationType;
          capacity?: number | null;
          booking_enabled?: boolean;
          opening_hours?: Record<string, string> | null;
          is_free?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
        Relationships: [];
      };
      occupancy_reports: {
        Row: {
          id: string;
          location_id: string;
          user_id: string | null;
          people_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          people_count: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["occupancy_reports"]["Insert"]
        >;
        Relationships: [];
      };
      water_reports: {
        Row: {
          id: string;
          location_id: string;
          user_id: string | null;
          temperature: number;
          source: ReportSource;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id?: string | null;
          temperature: number;
          source?: ReportSource;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["water_reports"]["Insert"]
        >;
        Relationships: [];
      };
      ice_reports: {
        Row: {
          id: string;
          location_id: string;
          user_id: string | null;
          condition: IceCondition;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          condition: IceCondition;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["ice_reports"]["Insert"]
        >;
        Relationships: [];
      };
      visits: {
        Row: {
          id: string;
          location_id: string;
          user_id: string | null;
          started_at: string;
          finished_at: string | null;
          rating: number | null;
          crowd_level: CrowdLevel | null;
          latitude: number | null;
          longitude: number | null;
          auto_closed: boolean;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          started_at?: string;
          finished_at?: string | null;
          rating?: number | null;
          crowd_level?: CrowdLevel | null;
          latitude?: number | null;
          longitude?: number | null;
          auto_closed?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["visits"]["Insert"]>;
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          user_id: string;
          location_id: string;
          visit_id: string | null;
          booking_id: string | null;
          type: PhotoType;
          storage_url: string;
          moderated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_id: string;
          visit_id?: string | null;
          booking_id?: string | null;
          type: PhotoType;
          storage_url: string;
          moderated?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          location_id: string;
          user_id: string | null;
          start_time: string;
          end_time: string;
          people_count: number;
          status: BookingStatus;
          visit_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          start_time: string;
          end_time: string;
          people_count: number;
          status?: BookingStatus;
          visit_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
        Relationships: [];
      };
      ratings: {
        Row: {
          id: string;
          location_id: string;
          user_id: string | null;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          rating: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ratings"]["Insert"]>;
        Relationships: [];
      };
      queue_entries: {
        Row: {
          id: string;
          location_id: string;
          user_id: string | null;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["queue_entries"]["Insert"]>;
        Relationships: [];
      };
    };
    // Empty but present: @supabase/postgrest-js's generic client constrains
    // Database[schema] to GenericSchema, which requires these keys to
    // exist (even empty) or every table's Row/Insert/Update type collapses
    // to `never`.
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
