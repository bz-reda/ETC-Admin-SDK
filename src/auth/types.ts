/** Auth app configuration */
export interface AuthApp {
  id: string;
  name: string;
  project_id: string;
  client_id: string;
  status: string;
  providers: AuthProviders;
  session_duration: number;
  created_at: string;
  updated_at: string;
  /** Language of the end-user email templates: "en" | "fr" | "ar" */
  email_locale?: string;
}

/** OAuth provider configuration */
export interface AuthProviders {
  email: boolean;
  google: boolean;
  github: boolean;
}

/** A user in an auth app */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: "email" | "google" | "github";
  verified: boolean;
  disabled: boolean;
  /**
   * Developer-owned data (roles, plan, tenant id) — embedded in the user's
   * JWT as the `app_metadata` claim. Written only via updateUserAppMetadata
   * (requires the admin or owner role on the project); end users can read
   * but never write it.
   */
  app_metadata: Record<string, unknown>;
  last_login: string | null;
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
  provider_breakdown: Record<string, number>;
}

/** Options for listing users */
export interface ListUsersOptions {
  /** Page number (default: 1) */
  page?: number;
  /** Results per page (default: 50) */
  limit?: number;
  /** Filter by provider */
  provider?: "email" | "google" | "github";
  /** Search by email or name */
  search?: string;
}
