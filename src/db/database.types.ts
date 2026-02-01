export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string;
          event_type: Database["public"]["Enums"]["event_type"];
          id: string;
          metadata: Json | null;
          treatment_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: Database["public"]["Enums"]["event_type"];
          id?: string;
          metadata?: Json | null;
          treatment_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: Database["public"]["Enums"]["event_type"];
          id?: string;
          metadata?: Json | null;
          treatment_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analytics_events_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: false;
            referencedRelation: "treatments";
            referencedColumns: ["id"];
          },
        ];
      };
      lawn_profiles: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          latitude: number;
          longitude: number;
          nasłonecznienie: Database["public"]["Enums"]["nasłonecznienie"];
          nazwa: string;
          rodzaj_powierzchni: string | null;
          updated_at: string;
          user_id: string;
          wielkość_m2: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude: number;
          longitude: number;
          nasłonecznienie?: Database["public"]["Enums"]["nasłonecznienie"];
          nazwa: string;
          rodzaj_powierzchni?: string | null;
          updated_at?: string;
          user_id: string;
          wielkość_m2?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          latitude?: number;
          longitude?: number;
          nasłonecznienie?: Database["public"]["Enums"]["nasłonecznienie"];
          nazwa?: string;
          rodzaj_powierzchni?: string | null;
          updated_at?: string;
          user_id?: string;
          wielkość_m2?: number;
        };
        Relationships: [];
      };
      notification_log: {
        Row: {
          id: string;
          kliknięte_at: string | null;
          lawn_profile_id: string;
          template_użyty: string;
          treatment_id: string | null;
          typ_powiadomienia: Database["public"]["Enums"]["typ_powiadomienia"];
          user_id: string;
          wysłane_at: string;
        };
        Insert: {
          id?: string;
          kliknięte_at?: string | null;
          lawn_profile_id: string;
          template_użyty: string;
          treatment_id?: string | null;
          typ_powiadomienia: Database["public"]["Enums"]["typ_powiadomienia"];
          user_id: string;
          wysłane_at?: string;
        };
        Update: {
          id?: string;
          kliknięte_at?: string | null;
          lawn_profile_id?: string;
          template_użyty?: string;
          treatment_id?: string | null;
          typ_powiadomienia?: Database["public"]["Enums"]["typ_powiadomienia"];
          user_id?: string;
          wysłane_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_log_lawn_profile_id_fkey";
            columns: ["lawn_profile_id"];
            isOneToOne: false;
            referencedRelation: "lawn_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_log_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: false;
            referencedRelation: "treatments";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          created_at: string;
          endpoint: string;
          id: string;
          keys: Json;
          last_used_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          endpoint: string;
          id?: string;
          keys: Json;
          last_used_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          endpoint?: string;
          id?: string;
          keys?: Json;
          last_used_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      treatment_history: {
        Row: {
          created_at: string;
          data_wykonania_rzeczywista: string | null;
          id: string;
          lawn_profile_id: string;
          powód_odrzucenia: string | null;
          status_new: Database["public"]["Enums"]["status_zabiegu"];
          status_old: Database["public"]["Enums"]["status_zabiegu"] | null;
          treatment_id: string;
        };
        Insert: {
          created_at?: string;
          data_wykonania_rzeczywista?: string | null;
          id?: string;
          lawn_profile_id: string;
          powód_odrzucenia?: string | null;
          status_new: Database["public"]["Enums"]["status_zabiegu"];
          status_old?: Database["public"]["Enums"]["status_zabiegu"] | null;
          treatment_id: string;
        };
        Update: {
          created_at?: string;
          data_wykonania_rzeczywista?: string | null;
          id?: string;
          lawn_profile_id?: string;
          powód_odrzucenia?: string | null;
          status_new?: Database["public"]["Enums"]["status_zabiegu"];
          status_old?: Database["public"]["Enums"]["status_zabiegu"] | null;
          treatment_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "treatment_history_lawn_profile_id_fkey";
            columns: ["lawn_profile_id"];
            isOneToOne: false;
            referencedRelation: "lawn_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treatment_history_treatment_id_fkey";
            columns: ["treatment_id"];
            isOneToOne: false;
            referencedRelation: "treatments";
            referencedColumns: ["id"];
          },
        ];
      };
      treatment_templates: {
        Row: {
          created_at: string;
          id: string;
          minimalny_cooldown_dni: number;
          nazwa: string;
          okresy_wykonywania: Json;
          opis: string | null;
          priorytet: number;
          typ_zabiegu: Database["public"]["Enums"]["typ_zabiegu"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          minimalny_cooldown_dni?: number;
          nazwa: string;
          okresy_wykonywania?: Json;
          opis?: string | null;
          priorytet?: number;
          typ_zabiegu: Database["public"]["Enums"]["typ_zabiegu"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          minimalny_cooldown_dni?: number;
          nazwa?: string;
          okresy_wykonywania?: Json;
          opis?: string | null;
          priorytet?: number;
          typ_zabiegu?: Database["public"]["Enums"]["typ_zabiegu"];
          updated_at?: string;
        };
        Relationships: [];
      };
      treatments: {
        Row: {
          created_at: string;
          data_proponowana: string;
          expires_at: string | null;
          id: string;
          lawn_profile_id: string;
          status: Database["public"]["Enums"]["status_zabiegu"];
          template_id: string;
          typ_generowania: Database["public"]["Enums"]["typ_generowania"];
          updated_at: string;
          uzasadnienie_pogodowe: string | null;
        };
        Insert: {
          created_at?: string;
          data_proponowana: string;
          expires_at?: string | null;
          id?: string;
          lawn_profile_id: string;
          status?: Database["public"]["Enums"]["status_zabiegu"];
          template_id: string;
          typ_generowania: Database["public"]["Enums"]["typ_generowania"];
          updated_at?: string;
          uzasadnienie_pogodowe?: string | null;
        };
        Update: {
          created_at?: string;
          data_proponowana?: string;
          expires_at?: string | null;
          id?: string;
          lawn_profile_id?: string;
          status?: Database["public"]["Enums"]["status_zabiegu"];
          template_id?: string;
          typ_generowania?: Database["public"]["Enums"]["typ_generowania"];
          updated_at?: string;
          uzasadnienie_pogodowe?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "treatments_lawn_profile_id_fkey";
            columns: ["lawn_profile_id"];
            isOneToOne: false;
            referencedRelation: "lawn_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "treatments_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "treatment_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      weather_cache: {
        Row: {
          date: string;
          dni_bez_opadów: number | null;
          fetched_at: string;
          id: string;
          latitude: number;
          longitude: number;
          opady_24h: number | null;
          opady_72h_sum: number | null;
          prognoza_3d: Json | null;
          temperatura_max: number | null;
        };
        Insert: {
          date: string;
          dni_bez_opadów?: number | null;
          fetched_at?: string;
          id?: string;
          latitude: number;
          longitude: number;
          opady_24h?: number | null;
          opady_72h_sum?: number | null;
          prognoza_3d?: Json | null;
          temperatura_max?: number | null;
        };
        Update: {
          date?: string;
          dni_bez_opadów?: number | null;
          fetched_at?: string;
          id?: string;
          latitude?: number;
          longitude?: number;
          opady_24h?: number | null;
          opady_72h_sum?: number | null;
          prognoza_3d?: Json | null;
          temperatura_max?: number | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_authenticated: { Args: never; Returns: boolean };
      is_lawn_owner: { Args: { lawn_profile_id: string }; Returns: boolean };
    };
    Enums: {
      event_type:
        | "reminder_sent"
        | "reminder_clicked"
        | "task_completed"
        | "task_skipped"
        | "task_expired"
        | "weather_recommendation_created"
        | "survey_answer";
      nasłonecznienie: "niskie" | "średnie" | "wysokie";
      status_zabiegu: "aktywny" | "wykonany" | "odrzucony" | "wygasły";
      typ_generowania: "statyczny" | "dynamiczny";
      typ_powiadomienia: "zabieg_planowy" | "rekomendacja_pogodowa";
      typ_zabiegu:
        | "koszenie"
        | "nawożenie"
        | "podlewanie"
        | "aeracja"
        | "wertykulacja";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      event_type: [
        "reminder_sent",
        "reminder_clicked",
        "task_completed",
        "task_skipped",
        "task_expired",
        "weather_recommendation_created",
        "survey_answer",
      ],
      nasłonecznienie: ["niskie", "średnie", "wysokie"],
      status_zabiegu: ["aktywny", "wykonany", "odrzucony", "wygasły"],
      typ_generowania: ["statyczny", "dynamiczny"],
      typ_powiadomienia: ["zabieg_planowy", "rekomendacja_pogodowa"],
      typ_zabiegu: [
        "koszenie",
        "nawożenie",
        "podlewanie",
        "aeracja",
        "wertykulacja",
      ],
    },
  },
} as const;
