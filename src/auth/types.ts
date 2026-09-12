/** Language of the end-user email templates. */
export type EmailLocale = "en" | "fr" | "ar";

/** 2FA enrolment policy applied to an auth app's end users. */
export type TwoFAPolicy = "disabled" | "optional" | "enforced";

/** Auth app configuration (GET /auth-apps, GET /auth-apps/:id). */
export interface AuthApp {
  id: string;
  user_id: string;
  project_id: string;
  team_id?: string;
  name: string;
  /** Public app identifier your @ghayma/auth clients are configured with. */
  app_id: string;
  status: string;
  /** Origins allowed to call the auth service for this app. */
  allowed_origins: string[];
  email_verification_required: boolean;
  google_oauth_enabled: boolean;
  google_client_id?: string;
  /** Native client IDs accepted by `POST /oauth/id-token` (iOS/Android/desktop). */
  google_native_client_ids?: string[];
  github_oauth_enabled: boolean;
  github_client_id?: string;
  /** Capacity bracket from auth_tiers (1k | 10k | 100k | 1m). */
  auth_tier_slug: string;
  two_fa_enabled: boolean;
  sms_enabled: boolean;
  /** A TwoFAPolicy value, or "" on apps where a policy was never set. */
  two_fa_policy: string;
  /** Custom reset-page URL; "" means the hosted reset form is used. */
  reset_url: string;
  email_locale: EmailLocale;
  jwt_expiry_seconds: number;
  refresh_expiry_seconds: number;
  created_at: string;
  updated_at: string;
}

/** A user in an auth app */
export interface AuthUser {
  id: string;
  app_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: "email" | "google" | "github";
  email_verified: boolean;
  disabled: boolean;
  /**
   * Developer-owned data (roles, plan, tenant id) — embedded in the user's
   * JWT as the `app_metadata` claim. Written only via updateUserAppMetadata
   * (requires the admin or owner role on the project); end users can read
   * but never write it.
   */
  app_metadata: Record<string, unknown>;
  /** 2FA state (read-only) */
  totp_enabled: boolean;
  whatsapp_otp_enabled: boolean;
  phone_verified: boolean;
  /** Absent until the user's first successful login. */
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

/** One row of an auth app's provider breakdown. */
export interface AuthProviderCount {
  provider: string;
  count: number;
}

/** An audit row from an auth app's event log. */
export interface AuthEvent {
  id: string;
  app_id: string;
  user_id?: string;
  /** Event name, e.g. "login" or "signup". */
  event: string;
  ip: string;
  user_agent: string;
  success: boolean;
  details?: string;
  created_at: string;
}

/** Auth app statistics */
export interface AuthStats {
  total_users: number;
  verified_users: number;
  active_sessions: number;
  signups_today: number;
  signups_week: number;
  signups_month: number;
  logins_today: number;
  events_today: number;
  events_week: number;
  provider_breakdown: AuthProviderCount[];
  /** The 20 most recent auth events. */
  recent_events: AuthEvent[];
}

/** Options for listing users */
export interface ListUsersOptions {
  /** Page number (default: 1) */
  page?: number;
  /** Results per page, 1–100 (default: 20). */
  per_page?: number;
}

/** A page of an auth app's users */
export interface ListUsersResult {
  users: AuthUser[];
  total: number;
  page: number;
  per_page: number;
}
