import { HttpClient } from "../http.js";
import type {
  AuthApp,
  AuthStats,
  AuthUser,
  ListUsersOptions,
  ListUsersResult,
} from "./types.js";

export type {
  AuthApp,
  AuthEvent,
  AuthProviderCount,
  AuthStats,
  AuthUser,
  EmailLocale,
  ListUsersOptions,
  ListUsersResult,
  TwoFAPolicy,
} from "./types.js";

/**
 * Auth — administer an auth app's end users from your server.
 *
 * Read an app's configuration and statistics, page through its users,
 * disable or delete one, mint a password-reset link, and set the
 * app_metadata that lands in a user's JWT. Creating auth apps, editing
 * their settings and rotating their signing keys are management: they live
 * in the console and the `ghayma` CLI. End users sign in from the browser
 * with `@ghayma/sdk/client`.
 *
 * @example
 * ```ts
 * import { Ghayma } from "@ghayma/sdk";
 *
 * const ghayma = new Ghayma();
 *
 * // List the users of an auth app
 * const { users } = await ghayma.auth.listUsers("my-app");
 * ```
 */
export class AuthClient {
  constructor(private readonly http: HttpClient) {}

  // ── Auth Apps (read-only) ──────────────────────────────────

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
