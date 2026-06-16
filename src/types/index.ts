export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id">>;
      };
      authorized_domains: {
        Row: AuthorizedDomain;
        Insert: Omit<AuthorizedDomain, "id" | "created_at">;
        Update: Partial<Omit<AuthorizedDomain, "id">>;
      };
      verticals: {
        Row: Vertical;
        Insert: Omit<Vertical, "id" | "created_at">;
        Update: Partial<Omit<Vertical, "id" | "created_at">>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, "id" | "created_at">;
        Update: Partial<Omit<Client, "id" | "created_at">>;
      };
      client_recipients: {
        Row: ClientRecipient;
        Insert: Omit<ClientRecipient, "id" | "created_at">;
        Update: Partial<Omit<ClientRecipient, "id" | "created_at">>;
      };
      reports: {
        Row: Report;
        Insert: Omit<Report, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Report, "id" | "created_at">>;
      };
      report_versions: {
        Row: ReportVersion;
        Insert: Omit<ReportVersion, "id" | "created_at">;
        Update: never;
      };
      report_attachments: {
        Row: ReportAttachment;
        Insert: Omit<ReportAttachment, "id" | "created_at">;
        Update: Partial<Omit<ReportAttachment, "id" | "created_at">>;
      };
      magic_link_tokens: {
        Row: MagicLinkToken;
        Insert: Omit<MagicLinkToken, "id" | "created_at">;
        Update: Pick<MagicLinkToken, "consumed_at">;
      };
      report_sessions: {
        Row: ReportSession;
        Insert: Omit<ReportSession, "id" | "created_at">;
        Update: Pick<ReportSession, "ended_at">;
      };
      pin_attempts: {
        Row: PinAttempt;
        Insert: Omit<PinAttempt, "id">;
        Update: Partial<Omit<PinAttempt, "id">>;
      };
      magic_link_requests: {
        Row: MagicLinkRequest;
        Insert: Omit<MagicLinkRequest, "id">;
        Update: Partial<Omit<MagicLinkRequest, "id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "admin" | "employee";
    };
  };
};

export interface Profile {
  id: string;
  full_name: string | null;
  role: "admin" | "employee";
  notification_email_enabled: boolean;
  created_at: string;
}

export interface AuthorizedDomain {
  id: string;
  domain: string;
  created_at: string;
}

export interface Vertical {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  color_hex: string;
  created_by: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  created_by: string;
  created_at: string;
}

export interface ClientRecipient {
  id: string;
  client_id: string;
  email: string;
  full_name: string | null;
  role_label: string | null;
  is_primary: boolean;
  created_by: string;
  created_at: string;
}

export interface Report {
  id: string;
  namespace_slug: string | null;
  name: string;
  slug: string;
  pin_hash: string | null;
  pin_encrypted: string | null;
  pin_updated_at: string;
  auto_send_on_publish: boolean;
  current_version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReportVersion {
  id: string;
  report_id: string;
  version_number: number;
  format: "pdf" | "html";
  storage_path: string;
  size_bytes: number | null;
  created_by: string;
  created_at: string;
}

export interface ReportAttachment {
  id: string;
  report_id: string;
  filename: string;
  mime_type: string;
  storage_path: string;
  size_bytes: number;
  display_order: number;
  created_by: string;
  created_at: string;
}

export interface MagicLinkToken {
  id: string;
  report_id: string;
  recipient_id: string;
  token_hash: string;
  expires_at: string;
  consumed_at: string | null;
  created_by: string;
  created_at: string;
}

export interface ReportSession {
  id: string;
  report_id: string;
  recipient_id: string | null;
  token_hash: string;
  session_type: "pin" | "magic_link" | "presentation";
  expires_at: string;
  ended_at: string | null;
  created_at: string;
}

export interface PinAttempt {
  id: string;
  report_id: string;
  ip_address: string;
  attempts: number;
  blocked_until: string | null;
  last_attempt: string;
}

export interface MagicLinkRequest {
  id: string;
  report_id: string;
  recipient_id: string;
  ip_address: string;
  attempts: number;
  last_attempt: string;
  window_start: string;
}
