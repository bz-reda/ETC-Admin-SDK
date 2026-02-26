import { HttpClient } from "../client.js";
import type {
  AuthApp,
  AuthStats,
  AuthUser,
  ListUsersOptions,
  VerifiedToken,
} from "./types.js";

export type {
  AuthApp,
  AuthStats,
  AuthUser,
  ListUsersOptions,
  VerifiedToken,
};

/**
 * Auth client for managing authentication apps (Firebase Auth alternative).
 *
 * Use this to verify user tokens in your backend, manage users,
 * and monitor auth app statistics.
 *
 * @example
 * ```ts
 * import { EspaceTech } from "@espace-tech/sdk";
 *
 * const client = new EspaceTech({ apiToken: "et_..." });
 *
 * // Verify a user's token in your API middleware
 * const result = await client.auth.verifyToken("auth-app-id", userToken);
 * if (result.valid) {
 *   console.log("User:", result.email);
 * }
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

  /** Create a new auth app */
  async createApp(options: {
    name: string;
    project_id: string;
    providers?: Partial<{ email: boolean; google: boolean; github: boolean }>;
  }): Promise<AuthApp> {
    const res = await this.http.post<{ auth_app: AuthApp }>("/api/v1/auth-apps", options);
    return res.auth_app;
  }

  /** Update an auth app */
  async updateApp(
    appId: string,
    updates: Partial<{
      name: string;
      providers: Partial<{ email: boolean; google: boolean; github: boolean }>;
      session_duration: number;
    }>
  ): Promise<AuthApp> {
    const res = await this.http.put<{ auth_app: AuthApp }>(`/api/v1/auth-apps/${appId}`, updates);
    return res.auth_app;
  }

  /** Delete an auth app */
  async deleteApp(appId: string): Promise<void> {
    await this.http.delete(`/api/v1/auth-apps/${appId}`);
  }

  /** Rotate auth app API keys */
  async rotateKeys(appId: string): Promise<{ client_id: string; client_secret: string }> {
    return this.http.post(`/api/v1/auth-apps/${appId}/rotate-keys`);
  }

  /** Get auth app statistics */
  async getStats(appId: string): Promise<AuthStats> {
    return this.http.get<AuthStats>(`/api/v1/auth-apps/${appId}/stats`);
  }

  // ── Token Verification ─────────────────────────────────────

  /**
   * Verify a user token from an auth app.
   *
   * Use this in your backend middleware to validate that a request
   * is from an authenticated user.
   *
   * @param appId - Auth app ID
   * @param token - User's JWT token (from login/OAuth callback)
   *
   * @example
   * ```ts
   * // Express.js middleware
   * async function authMiddleware(req, res, next) {
   *   const token = req.headers.authorization?.replace("Bearer ", "");
   *   if (!token) return res.status(401).json({ error: "No token" });
   *
   *   const result = await client.auth.verifyToken("app-id", token);
   *   if (!result.valid) return res.status(401).json({ error: "Invalid token" });
   *
   *   req.user = result;
   *   next();
   * }
   * ```
   */
  async verifyToken(appId: string, token: string): Promise<VerifiedToken> {
    return this.http.post<VerifiedToken>(`/api/v1/auth-apps/${appId}/verify`, { token });
  }

  // ── User Management ────────────────────────────────────────

  /** List users in an auth app */
  async listUsers(appId: string, options?: ListUsersOptions): Promise<{
    users: AuthUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.http.get(`/api/v1/auth-apps/${appId}/users`, {
      page: options?.page,
      limit: options?.limit,
      provider: options?.provider,
      search: options?.search,
    });
  }

  /** Disable a user (prevent login) */
  async disableUser(appId: string, userId: string): Promise<void> {
    await this.http.post(`/api/v1/auth-apps/${appId}/users/${userId}`, {
      action: "disable",
    });
  }

  /** Enable a previously disabled user */
  async enableUser(appId: string, userId: string): Promise<void> {
    await this.http.post(`/api/v1/auth-apps/${appId}/users/${userId}`, {
      action: "enable",
    });
  }

  /** Delete a user from an auth app */
  async deleteUser(appId: string, userId: string): Promise<void> {
    await this.http.delete(`/api/v1/auth-apps/${appId}/users/${userId}`);
  }
}
