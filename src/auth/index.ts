import { HttpClient } from "../client.js";
import type {
  AuthApp,
  AuthStats,
  AuthUser,
  ListUsersOptions,
} from "./types.js";

export type {
  AuthApp,
  AuthStats,
  AuthUser,
  ListUsersOptions,
};

/**
 * Auth client for managing authentication apps (Firebase Auth alternative).
 *
 * Use this to manage auth apps and their users, rotate keys, and monitor
 * auth app statistics. End-user token verification is handled by the
 * client-side Auth-SDK (@espace-tech/auth), not this server-side admin SDK.
 *
 * @example
 * ```ts
 * import { Ghayma } from "@ghayma/sdk";
 *
 * const client = new Ghayma({ apiToken: "et_..." });
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
}
