export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      published_tournaments: {
        Row: {
          created_at: string
          id: string
          share_token: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          share_token?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          share_token?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: []
      }
      team_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "team_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          abbreviation: string
          colors: string[]
          created_at: string
          folder_id: string | null
          founding_year: number | null
          id: string
          logo: string | null
          name: string
          rate: number
          short_name: string
          user_id: string
        }
        Insert: {
          abbreviation?: string
          colors?: string[]
          created_at?: string
          folder_id?: string | null
          founding_year?: number | null
          id?: string
          logo?: string | null
          name: string
          rate?: number
          short_name?: string
          user_id: string
        }
        Update: {
          abbreviation?: string
          colors?: string[]
          created_at?: string
          folder_id?: string | null
          founding_year?: number | null
          id?: string
          logo?: string | null
          name?: string
          rate?: number
          short_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "team_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_collaborators: {
        Row: {
          created_at: string
          email: string
          id: string
          published_tournament_id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          published_tournament_id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          published_tournament_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_collaborators_published_tournament_id_fkey"
            columns: ["published_tournament_id"]
            isOneToOne: false
            referencedRelation: "published_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          finalized: boolean
          format: string
          groups_finalized: boolean
          grupos_mata_mata_inicio: string | null
          grupos_quantidade: number | null
          grupos_turnos: number | null
          id: string
          liga_turnos: number | null
          logo: string | null
          mata_mata_inicio: string | null
          matches: Json
          name: string
          number_of_teams: number
          seasons: Json
          settings: Json
          sport: string
          suico_jogos_liga: number | null
          suico_mata_mata_inicio: string | null
          suico_playoff_vagas: number | null
          team_ids: string[]
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          finalized?: boolean
          format?: string
          groups_finalized?: boolean
          grupos_mata_mata_inicio?: string | null
          grupos_quantidade?: number | null
          grupos_turnos?: number | null
          id?: string
          liga_turnos?: number | null
          logo?: string | null
          mata_mata_inicio?: string | null
          matches?: Json
          name: string
          number_of_teams?: number
          seasons?: Json
          settings?: Json
          sport?: string
          suico_jogos_liga?: number | null
          suico_mata_mata_inicio?: string | null
          suico_playoff_vagas?: number | null
          team_ids?: string[]
          user_id: string
          year?: number
        }
        Update: {
          created_at?: string
          finalized?: boolean
          format?: string
          groups_finalized?: boolean
          grupos_mata_mata_inicio?: string | null
          grupos_quantidade?: number | null
          grupos_turnos?: number | null
          id?: string
          liga_turnos?: number | null
          logo?: string | null
          mata_mata_inicio?: string | null
          matches?: Json
          name?: string
          number_of_teams?: number
          seasons?: Json
          settings?: Json
          sport?: string
          suico_jogos_liga?: number | null
          suico_mata_mata_inicio?: string | null
          suico_playoff_vagas?: number | null
          team_ids?: string[]
          user_id?: string
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_published_tournament_by_token: {
        Args: { p_token: string }
        Returns: {
          tournament_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
