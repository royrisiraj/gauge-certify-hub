export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_config: {
        Row: {
          description: string | null;
          is_demo: boolean;
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          description?: string | null;
          is_demo?: boolean;
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          description?: string | null;
          is_demo?: boolean;
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          business_id: string | null;
          created_at: string;
          detail: Json;
          entity_id: string | null;
          entity_type: string;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          business_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          business_id?: string | null;
          created_at?: string;
          detail?: Json;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          address_line: string | null;
          city: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          id: string;
          is_demo: boolean;
          name: string;
          owner_id: string | null;
          pincode: string | null;
          registration_ref: string | null;
          state: string | null;
        };
        Insert: {
          address_line?: string | null;
          city?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name: string;
          owner_id?: string | null;
          pincode?: string | null;
          registration_ref?: string | null;
          state?: string | null;
        };
        Update: {
          address_line?: string | null;
          city?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name?: string;
          owner_id?: string | null;
          pincode?: string | null;
          registration_ref?: string | null;
          state?: string | null;
        };
        Relationships: [];
      };
      certificates: {
        Row: {
          authority_id: string | null;
          certificate_number: string;
          conditions: string | null;
          decision_id: string;
          id: string;
          instrument_id: string;
          is_demo: boolean;
          issued_at: string;
          issued_by: string | null;
          status: Database["public"]["Enums"]["cert_status"];
          status_reason: string | null;
          valid_from: string;
          valid_until: string;
          verification_code: string;
        };
        Insert: {
          authority_id?: string | null;
          certificate_number: string;
          conditions?: string | null;
          decision_id: string;
          id?: string;
          instrument_id: string;
          is_demo?: boolean;
          issued_at?: string;
          issued_by?: string | null;
          status?: Database["public"]["Enums"]["cert_status"];
          status_reason?: string | null;
          valid_from?: string;
          valid_until: string;
          verification_code: string;
        };
        Update: {
          authority_id?: string | null;
          certificate_number?: string;
          conditions?: string | null;
          decision_id?: string;
          id?: string;
          instrument_id?: string;
          is_demo?: boolean;
          issued_at?: string;
          issued_by?: string | null;
          status?: Database["public"]["Enums"]["cert_status"];
          status_reason?: string | null;
          valid_from?: string;
          valid_until?: string;
          verification_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "certificates_authority_id_fkey";
            columns: ["authority_id"];
            isOneToOne: false;
            referencedRelation: "verification_authorities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_decision_id_fkey";
            columns: ["decision_id"];
            isOneToOne: true;
            referencedRelation: "verification_decisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "certificates_instrument_id_fkey";
            columns: ["instrument_id"];
            isOneToOne: false;
            referencedRelation: "instruments";
            referencedColumns: ["id"];
          },
        ];
      };
      inspections: {
        Row: {
          id: string;
          inspector_id: string;
          instrument_id: string;
          notes: string | null;
          request_id: string;
          started_at: string;
          status: Database["public"]["Enums"]["inspection_status"];
          submitted_at: string | null;
          tolerance_rule_id: string | null;
        };
        Insert: {
          id?: string;
          inspector_id: string;
          instrument_id: string;
          notes?: string | null;
          request_id: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["inspection_status"];
          submitted_at?: string | null;
          tolerance_rule_id?: string | null;
        };
        Update: {
          id?: string;
          inspector_id?: string;
          instrument_id?: string;
          notes?: string | null;
          request_id?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["inspection_status"];
          submitted_at?: string | null;
          tolerance_rule_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inspections_instrument_id_fkey";
            columns: ["instrument_id"];
            isOneToOne: false;
            referencedRelation: "instruments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "verification_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inspections_tolerance_rule_id_fkey";
            columns: ["tolerance_rule_id"];
            isOneToOne: false;
            referencedRelation: "tolerance_rules";
            referencedColumns: ["id"];
          },
        ];
      };
      instruments: {
        Row: {
          business_id: string;
          capacity_unit: string | null;
          capacity_value: number | null;
          category: string;
          created_at: string;
          created_by: string | null;
          id: string;
          location_label: string | null;
          manufacturer: string;
          model: string;
          public_code: string;
          resolution_value: number | null;
          serial_number: string;
          status: Database["public"]["Enums"]["instrument_status"];
          unit: string;
        };
        Insert: {
          business_id: string;
          capacity_unit?: string | null;
          capacity_value?: number | null;
          category: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location_label?: string | null;
          manufacturer: string;
          model: string;
          public_code?: string;
          resolution_value?: number | null;
          serial_number: string;
          status?: Database["public"]["Enums"]["instrument_status"];
          unit: string;
        };
        Update: {
          business_id?: string;
          capacity_unit?: string | null;
          capacity_value?: number | null;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location_label?: string | null;
          manufacturer?: string;
          model?: string;
          public_code?: string;
          resolution_value?: number | null;
          serial_number?: string;
          status?: Database["public"]["Enums"]["instrument_status"];
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instruments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      measurements: {
        Row: {
          created_at: string;
          deviation: number | null;
          id: string;
          inspection_id: string;
          note: string | null;
          observed_value: number;
          point_index: number;
          reference_value: number;
          result: Database["public"]["Enums"]["measurement_result"] | null;
          tolerance_applied: number | null;
          unit: string;
        };
        Insert: {
          created_at?: string;
          deviation?: number | null;
          id?: string;
          inspection_id: string;
          note?: string | null;
          observed_value: number;
          point_index: number;
          reference_value: number;
          result?: Database["public"]["Enums"]["measurement_result"] | null;
          tolerance_applied?: number | null;
          unit: string;
        };
        Update: {
          created_at?: string;
          deviation?: number | null;
          id?: string;
          inspection_id?: string;
          note?: string | null;
          observed_value?: number;
          point_index?: number;
          reference_value?: number;
          result?: Database["public"]["Enums"]["measurement_result"] | null;
          tolerance_applied?: number | null;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "measurements_inspection_id_fkey";
            columns: ["inspection_id"];
            isOneToOne: false;
            referencedRelation: "inspections";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          authority_id: string | null;
          business_id: string | null;
          created_at: string;
          designation: string | null;
          full_name: string;
          id: string;
          phone: string | null;
        };
        Insert: {
          authority_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          designation?: string | null;
          full_name: string;
          id: string;
          phone?: string | null;
        };
        Update: {
          authority_id?: string | null;
          business_id?: string | null;
          created_at?: string;
          designation?: string | null;
          full_name?: string;
          id?: string;
          phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_authority_id_fkey";
            columns: ["authority_id"];
            isOneToOne: false;
            referencedRelation: "verification_authorities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      tolerance_rules: {
        Row: {
          authority_id: string | null;
          category: string;
          created_at: string;
          id: string;
          is_demo: boolean;
          name: string;
          near_boundary_fraction: number;
          source_note: string | null;
          tolerance_type: string;
          tolerance_value: number;
          unit: string;
        };
        Insert: {
          authority_id?: string | null;
          category: string;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name: string;
          near_boundary_fraction?: number;
          source_note?: string | null;
          tolerance_type: string;
          tolerance_value: number;
          unit: string;
        };
        Update: {
          authority_id?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          name?: string;
          near_boundary_fraction?: number;
          source_note?: string | null;
          tolerance_type?: string;
          tolerance_value?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tolerance_rules_authority_id_fkey";
            columns: ["authority_id"];
            isOneToOne: false;
            referencedRelation: "verification_authorities";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      verification_authorities: {
        Row: {
          contact_email: string | null;
          created_at: string;
          id: string;
          is_demo: boolean;
          jurisdiction_label: string | null;
          name: string;
        };
        Insert: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          jurisdiction_label?: string | null;
          name: string;
        };
        Update: {
          contact_email?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          jurisdiction_label?: string | null;
          name?: string;
        };
        Relationships: [];
      };
      verification_decisions: {
        Row: {
          authority_id: string | null;
          calculated_result: Database["public"]["Enums"]["decision_type"];
          conditions: string | null;
          decided_at: string;
          decided_by: string;
          decision: Database["public"]["Enums"]["decision_type"];
          id: string;
          inspection_id: string;
          instrument_id: string;
          override_reason: string | null;
          request_id: string;
        };
        Insert: {
          authority_id?: string | null;
          calculated_result: Database["public"]["Enums"]["decision_type"];
          conditions?: string | null;
          decided_at?: string;
          decided_by: string;
          decision: Database["public"]["Enums"]["decision_type"];
          id?: string;
          inspection_id: string;
          instrument_id: string;
          override_reason?: string | null;
          request_id: string;
        };
        Update: {
          authority_id?: string | null;
          calculated_result?: Database["public"]["Enums"]["decision_type"];
          conditions?: string | null;
          decided_at?: string;
          decided_by?: string;
          decision?: Database["public"]["Enums"]["decision_type"];
          id?: string;
          inspection_id?: string;
          instrument_id?: string;
          override_reason?: string | null;
          request_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_decisions_authority_id_fkey";
            columns: ["authority_id"];
            isOneToOne: false;
            referencedRelation: "verification_authorities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_decisions_inspection_id_fkey";
            columns: ["inspection_id"];
            isOneToOne: true;
            referencedRelation: "inspections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_decisions_instrument_id_fkey";
            columns: ["instrument_id"];
            isOneToOne: false;
            referencedRelation: "instruments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_decisions_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "verification_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_requests: {
        Row: {
          assigned_at: string | null;
          assigned_to: string | null;
          authority_id: string | null;
          business_id: string;
          id: string;
          instrument_id: string;
          reason: string | null;
          rejected_reason: string | null;
          request_type: string;
          status: Database["public"]["Enums"]["request_status"];
          submitted_at: string;
          submitted_by: string | null;
          tolerance_rule_id: string | null;
          updated_at: string;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          authority_id?: string | null;
          business_id: string;
          id?: string;
          instrument_id: string;
          reason?: string | null;
          rejected_reason?: string | null;
          request_type?: string;
          status?: Database["public"]["Enums"]["request_status"];
          submitted_at?: string;
          submitted_by?: string | null;
          tolerance_rule_id?: string | null;
          updated_at?: string;
        };
        Update: {
          assigned_at?: string | null;
          assigned_to?: string | null;
          authority_id?: string | null;
          business_id?: string;
          id?: string;
          instrument_id?: string;
          reason?: string | null;
          rejected_reason?: string | null;
          request_type?: string;
          status?: Database["public"]["Enums"]["request_status"];
          submitted_at?: string;
          submitted_by?: string | null;
          tolerance_rule_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_requests_authority_id_fkey";
            columns: ["authority_id"];
            isOneToOne: false;
            referencedRelation: "verification_authorities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_requests_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_requests_instrument_id_fkey";
            columns: ["instrument_id"];
            isOneToOne: false;
            referencedRelation: "instruments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verification_requests_tolerance_rule_id_fkey";
            columns: ["tolerance_rule_id"];
            isOneToOne: false;
            referencedRelation: "tolerance_rules";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      bootstrap_account: {
        Args: {
          p_authority_id?: string;
          p_business_name?: string;
          p_contact_email?: string;
          p_designation?: string;
          p_full_name: string;
          p_phone?: string;
          p_role: Database["public"]["Enums"]["app_role"];
        };
        Returns: Json;
      };
      claim_request: { Args: { p_request_id: string }; Returns: string };
      current_authority_id: { Args: never; Returns: string };
      current_business_id: { Args: never; Returns: string };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      issue_certificate: { Args: { p_decision_id: string }; Returns: string };
      public_verify: { Args: { p_code: string }; Returns: Json };
      record_decision: {
        Args: {
          p_conditions?: string;
          p_decision: Database["public"]["Enums"]["decision_type"];
          p_inspection_id: string;
          p_override_reason?: string;
        };
        Returns: string;
      };
      set_certificate_status: {
        Args: {
          p_certificate_id: string;
          p_reason: string;
          p_status: Database["public"]["Enums"]["cert_status"];
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "business" | "inspector";
      cert_status: "active" | "suspended" | "revoked";
      decision_type: "verified" | "verified_with_conditions" | "failed";
      inspection_status: "draft" | "in_progress" | "submitted";
      instrument_status: "active" | "inactive";
      measurement_result: "pass" | "review" | "fail";
      request_status: "submitted" | "assigned" | "under_review" | "completed" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["business", "inspector"],
      cert_status: ["active", "suspended", "revoked"],
      decision_type: ["verified", "verified_with_conditions", "failed"],
      inspection_status: ["draft", "in_progress", "submitted"],
      instrument_status: ["active", "inactive"],
      measurement_result: ["pass", "review", "fail"],
      request_status: ["submitted", "assigned", "under_review", "completed", "rejected"],
    },
  },
} as const;
