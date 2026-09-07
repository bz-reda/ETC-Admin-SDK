import { HttpClient } from "../http.js";
import type {
  AuthApp,
  AuthStats,
  AuthUser,
  CreateAuthAppOptions,
  ListUsersOptions,
  ListUsersResult,
  UpdateAuthAppOptions,
} from "./types.js";

export type {
  AuthApp,
  AuthEvent,
  AuthProviderCount,
  AuthStats,
  AuthUser,
  CreateAuthAppOptions,
  EmailLocale,
  ListUsersOptions,
  ListUsersResult,
  TwoFAPolicy,
  UpdateAuthAppOptions,
} from "./types.js";

/**
 * Auth client for managing authentication apps (Firebase Auth alternative).
 *
 * Use this to manage auth apps and their users, rotate keys, and monitor
 * auth app statistics. End-user token verification is handled by the
 * client-side Auth-SDK (@ghayma/auth), not this server-side admin SDK.
 *
 * @example
 * ```ts
 * import { Ghayma } from "@ghayma/sdk";
 *
 * const client = new Ghayma({ apiToken: "gh_..." });
 *
 * // List the users of an auth app
 * const { users } = await client.auth.listUsers("auth-app-id");
 * ```
 */
export class AuthClient {
  constructor(private readonly http: HttpClient) {}

  // ── Auth App Management ────────────────────────────────────

  /** List all auth apps */
  async listApps(): Promise<AuthApp[]> {
    const res = await this.http.get<{ auth_apps: AuthApp[] }>("/api/v1/auth-apps");
    return res.auth_apps || [];
  }

  /** Get auth app details */
  async getApp(appId: string): Promise<AuthApp> {
    const res = await this.http.get<{ auth_app: AuthApp }>(`/api/v1/auth-apps/${appId}`);
    return res.auth_app;
  }

  /**
   * Create a new auth app.
   *
   * `app_id` is required by the backend — it is the public identifier your
   * client apps authenticate against. OAuth providers are not set here;
   * enable them afterwards with `updateApp`.
   *
   * @example
   * const app = await client.auth.createApp({
   *   name: "My App Auth",
   *   app_id: "my-app",
   *   project_id: "project-id",
   * });
   */
  async createApp(options: CreateAuthAppOptions): Promise<AuthApp> {
    const res = await this.http.post<{ auth_app: AuthApp }>("/api/v1/auth-apps", options);
    return res.auth_app;
  }

  /**
   * Update an auth app. Only the fields on UpdateAuthAppOptions are
   * applied — the backend silently drops anything else.
   *
   * @example
   * await client.auth.updateApp(appId, {
   *   google_oauth_enabled: true,
   *   email_verification_required: true,
   * });
   */
  async updateApp(appId: string, updates: UpdateAuthAppOptions): Promise<AuthApp> {
    const res = await this.http.put<{ auth_app: AuthApp }>(`/api/v1/auth-apps/${appId}`, updates);
    return res.auth_app;
  }

  /** Delete an auth app */
  async deleteApp(appId: string): Promise<void> {
    await this.http.delete(`/api/v1/auth-apps/${appId}`);
  }

  /**
   * Rotate the auth app's JWT signing keys. Every access and refresh
   * token issued before the rotation stops verifying, so all end users
   * are signed out.
   */
  async rotateKeys(appId: string): Promise<{ message: string }> {
    return this.http.post(`/api/v1/auth-apps/${appId}/rotate-keys`);
  }

  /** Get auth app statistics */
  async getStats(appId: string): Promise<AuthStats> {
    const res = await this.http.get<{ stats: AuthStats }>(
      `/api/v1/auth-apps/${appId}/stats`,
    );
    return res.stats;
  }

  // ── User Management ────────────────────────────────────────

  /** List users in an auth app */
  async listUsers(appId: string, options?: ListUsersOptions): Promise<ListUsersResult> {
    return this.http.get(`/api/v1/auth-apps/${appId}/users`, {
      page: options?.page,
      per_page: options?.per_page,
    });
  }

  /** Disable a user (prevent login) */
  async disableUser(appId: string, userId: string): Promise<void> {
    // Backend route: POST /api/v1/auth-apps/:id/users/:userId/disable (no body).
    await this.http.post(`/api/v1/auth-apps/${appId}/users/${userId}/disable`);
  }

  /** Enable a previously disabled user */
  async enableUser(appId: string, userId: string): Promise<void> {
    // Backend route: POST /api/v1/auth-apps/:id/users/:userId/enable (no body).
    await this.http.post(`/api/v1/auth-apps/${appId}/users/${userId}/enable`);
  }

  /** Delete a user from an auth app */
  async deleteUser(appId: string, userId: string): Promise<void> {
    await this.http.delete(`/api/v1/auth-apps/${appId}/users/${userId}`);
  }

  /**
   * Clear an end user's 2FA enrolment (support hammer for a locked-out
   * user — lost phone/authenticator). The user signs back in with their
   * password and re-enrols. Requires the admin or owner role; audited.
   */
  async resetUser2FA(appId: string, userId: string): Promise<void> {
    await this.http.post(`/api/v1/auth-apps/${appId}/users/${userId}/reset-2fa`);
  }

  /**
   * Mint a password-reset link for an end user (Firebase
   * generatePasswordResetLink parity) — for apps that send their own
   * reset emails. The link is a LIVE single-use credential (expires in
   * 1 hour): send it to the user's verified email and nowhere else,
   * never log it. Requires the admin or owner role; strictly
   * rate-limited per app. Minting invalidates any pending reset token.
   *
   * @example
   * const { link } = await client.auth.generatePasswordResetLink(appId, "user@example.com");
   * // send `link` in your own email template
   */
  async generatePasswordResetLink(
    appId: string,
    email: string
  ): Promise<{ link: string; expires_at: string }> {
    return this.http.post(`/api/v1/auth-apps/${appId}/reset-link`, { email });
  }

  /**
   * Replace a user's developer-owned app_metadata (roles, plan, tenant id).
   * Requires the admin or owner role on the project; `{}` clears it.
   * The new value reaches the user's JWT at their next token refresh.
   *
   * @example
   * await client.auth.updateUserAppMetadata(appId, userId, { roles: ["admin"] });
   */
  async updateUserAppMetadata(
    appId: string,
    userId: string,
    appMetadata: Record<string, unknown>
  ): Promise<{ user: AuthUser }> {
    return this.http.patch(`/api/v1/auth-apps/${appId}/users/${userId}/app-metadata`, {
      app_metadata: appMetadata,
    });
  }
}
