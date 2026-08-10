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
export type BookingStatus = "confirmed" | "cancelled" | "completed";
export type PhotoType = "before" | "after";
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
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      locations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
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
      };
      occupancy_reports: {
        Row: {
          id: string;
          location_id: string;
          user_id: string;
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
      };
      ice_reports: {
        Row: {
          id: string;
          location_id: string;
          user_id: string;
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
      };
      visits: {
        Row: {
          id: string;
          location_id: string;
          user_id: string;
          started_at: string;
          finished_at: string | null;
          rating: number | null;
          crowd_level: CrowdLevel | null;
        };
        Insert: {
          id?: string;
          location_id: string;
          user_id: string;
          started_at?: string;
          finished_at?: string | null;
          rating?: number | null;
          crowd_level?: CrowdLevel | null;
        };
        Update: Partial<Database["public"]["Tables"]["visits"]["Insert"]>;
      };
      photos: {
        Row: {
          id: string;
          user_id: string;
          location_id: string;
          visit_id: string | null;
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
          type: PhotoType;
          storage_url: string;
          moderated?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["photos"]["Insert"]>;
      };
      bookings: {
        Row: {
          id: string;
          location_id: string;
          user_id: string;
          start_time: string;
          end_time: string;
          people_count: number;
          status: BookingStatus;
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
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Insert"]>;
      };
      ratings: {
        Row: {
          id: string;
          location_id: string;
          user_id: string;
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
      };
    };
  };
}
