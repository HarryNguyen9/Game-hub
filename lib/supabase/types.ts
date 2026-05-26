export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          password_hash: string;
          role: "user" | "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          password_hash: string;
          role?: "user" | "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          password_hash?: string;
          role?: "user" | "admin";
          updated_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          host_user_id: string;
          room_code: string | null;
          game_key: string | null;
          name: string;
          status: "waiting" | "playing" | "ended" | "closed";
          has_password: boolean;
          password_hash: string | null;
          min_players: number;
          max_players: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_user_id: string;
          room_code?: string | null;
          game_key?: string | null;
          name: string;
          status?: "waiting" | "playing" | "ended" | "closed";
          has_password?: boolean;
          password_hash?: string | null;
          min_players?: number;
          max_players?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          room_code?: string | null;
          game_key?: string | null;
          name?: string;
          status?: "waiting" | "playing" | "ended" | "closed";
          has_password?: boolean;
          password_hash?: string | null;
          min_players?: number;
          max_players?: number;
          updated_at?: string;
        };
      };
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          role: "host" | "player";
          ready: boolean;
          participation_status: "lobby" | "active_game" | "waiting_next_round";
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          role?: "host" | "player";
          ready?: boolean;
          participation_status?: "lobby" | "active_game" | "waiting_next_round";
          joined_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: "host" | "player";
          ready?: boolean;
          participation_status?: "lobby" | "active_game" | "waiting_next_round";
          joined_at?: string;
          updated_at?: string;
        };
      };
      game_sessions: {
        Row: {
          id: string;
          room_id: string;
          game_key: string | null;
          status: "waiting" | "playing" | "finished" | "ended";
          state: Json;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          game_key?: string | null;
          status?: "waiting" | "playing" | "finished" | "ended";
          state?: Json;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          game_key?: string | null;
          status?: "waiting" | "playing" | "finished" | "ended";
          state?: Json;
          started_at?: string | null;
          ended_at?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: "user" | "admin";
      room_status: "waiting" | "playing" | "ended" | "closed";
      room_member_role: "host" | "player";
      participation_status: "lobby" | "active_game" | "waiting_next_round";
      game_session_status: "waiting" | "playing" | "finished" | "ended";
    };
    CompositeTypes: Record<string, never>;
  };
};
