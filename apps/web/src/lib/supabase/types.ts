/**
 * Supabase Database Types
 * Generated types for CTIDE session storage
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          username: string | null;
          tags: string[] | null;
          notes: string | null;
          experiment_params: Json | null;
          utterance_count: number;
          important_count: number;
          avg_score: number;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          username?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          experiment_params?: Json | null;
          utterance_count?: number;
          important_count?: number;
          avg_score?: number;
          duration_seconds?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          username?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          experiment_params?: Json | null;
          utterance_count?: number;
          important_count?: number;
          avg_score?: number;
          duration_seconds?: number | null;
        };
        Relationships: [];
      };
      utterances: {
        Row: {
          id: number;
          session_id: string;
          user_id: string | null;
          username: string | null;
          speaker: string;
          text: string;
          timestamp: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          user_id?: string | null;
          username?: string | null;
          speaker: string;
          text: string;
          timestamp: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          user_id?: string | null;
          username?: string | null;
          speaker?: string;
          text?: string;
          timestamp?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'utterances_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      ctide_scores: {
        Row: {
          id: number;
          session_id: string;
          utterance_id: number;
          score: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          utterance_id: number;
          score: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          utterance_id?: number;
          score?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ctide_scores_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'sessions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
