import { HttpClient } from "../client.js";
import type {
  ConnectionConfig,
  CreateDatabaseOptions,
  Database,
  DatabaseBackup,
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseMetrics,
} from "./types.js";

export type {
  ConnectionConfig,
  CreateDatabaseOptions,
  Database,
  DatabaseBackup,
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseMetrics,
};

/**
 * Database client for managing PostgreSQL, Redis, and MongoDB instances.
 *
 * @example
 * ```ts
 * import { EspaceTech } from "@espace-tech/sdk";
 *
 * const client = new EspaceTech({ apiToken: "et_..." });
 *
 * // Get connection string for your app
 * const conn = await client.database.getConnection("db-id");
 * console.log(conn.url); // postgresql://user:pass@host:port/db
 * ```
 */
export class DatabaseClient {
  constructor(private readonly http: HttpClient) {}

  // ── Database Management ────────────────────────────────────

  /** Create a new database */
  async create(options: CreateDatabaseOptions): Promise<Database> {
    const res = await this.http.post<{ database: Database }>(
      "/api/v1/databases",
      options,
    );
    return res.database;
  }

  /** List all databases */
  async list(): Promise<Database[]> {
    const res = await this.http.get<{ databases: Database[] }>(
      "/api/v1/databases",
    );
    return res.databases || [];
  }

  /** Get database details */
  async get(databaseId: string): Promise<Database> {
    const res = await this.http.get<{ database: Database }>(
      `/api/v1/databases/${databaseId}`,
    );
    return res.database;
  }

  /** Delete a database */
  async delete(databaseId: string): Promise<void> {
    await this.http.delete(`/api/v1/databases/${databaseId}`);
  }

  /** Stop a database */
  async stop(databaseId: string): Promise<void> {
    await this.http.post(`/api/v1/databases/${databaseId}/stop`);
  }

  /** Start a stopped database */
  async start(databaseId: string): Promise<void> {
    await this.http.post(`/api/v1/databases/${databaseId}/start`);
  }

  // ── Credentials & Connection ───────────────────────────────

  /** Get raw database credentials */
  async getCredentials(databaseId: string): Promise<DatabaseCredentials> {
    const res = await this.http.get<Record<string, unknown>>(
      `/api/v1/databases/${databaseId}/credentials`,
    );
    // Handle both { credentials: { ... } } and flat { host, port, ... } responses
    const creds = (res.credentials || res) as DatabaseCredentials;
    return creds;
  }

  /**
   * Get a parsed connection config — ready to use with your ORM or driver.
   *
   * @example
   * ```ts
   * // With pg (node-postgres)
   * const conn = await client.database.getConnection("db-id");
   * const pool = new Pool({ connectionString: conn.url });
   *
   * // With Prisma — use conn.url in DATABASE_URL
   *
   * // With mongoose
   * const conn = await client.database.getConnection("mongo-id");
   * await mongoose.connect(conn.url);
   *
   * // With ioredis
   * const conn = await client.database.getConnection("redis-id");
   * const redis = new Redis(conn.url);
   * ```
   */
  async getConnection(databaseId: string): Promise<ConnectionConfig> {
    const creds = await this.getCredentials(databaseId);

    let url = creds.connection_string || "";
    if (!url && creds.host) {
      const db = await this.get(databaseId);
      const h = creds.host;
      const p = creds.port;
      if (db.engine === "postgresql") {
        url = `postgresql://${creds.username}:${creds.password}@${h}:${p}/${creds.database}`;
      } else if (db.engine === "mongodb") {
        url = `mongodb://${creds.username}:${creds.password}@${h}:${p}/${creds.database}?authSource=admin`;
      } else if (db.engine === "redis") {
        url = creds.password
          ? `redis://:${creds.password}@${h}:${p}`
          : `redis://${h}:${p}`;
      }
    }

    return {
      url,
      host: creds.host || "",
      port: creds.port || 0,
      username: creds.username || "",
      password: creds.password || "",
      database: creds.database || "",
    };
  }

  /** Rotate database password (invalidates existing connections) */
  async rotateCredentials(databaseId: string): Promise<DatabaseCredentials> {
    const res = await this.http.post<{ credentials: DatabaseCredentials }>(
      `/api/v1/databases/${databaseId}/rotate`,
    );
    return res.credentials;
  }

  // ── External Access ────────────────────────────────────────

  /** Enable external access (expose via public endpoint) */
  async expose(databaseId: string): Promise<void> {
    await this.http.post(`/api/v1/databases/${databaseId}/expose`);
  }

  /** Disable external access */
  async unexpose(databaseId: string): Promise<void> {
    await this.http.post(`/api/v1/databases/${databaseId}/unexpose`);
  }

  // ── Linking ────────────────────────────────────────────────

  /** Link database to a project (injects env vars) */
  async link(databaseId: string, projectId: string): Promise<void> {
    await this.http.post(`/api/v1/databases/${databaseId}/link`, {
      project_id: projectId,
    });
  }

  /** Unlink database from a project */
  async unlink(databaseId: string): Promise<void> {
    await this.http.post(`/api/v1/databases/${databaseId}/unlink`);
  }

  // ── Metrics ────────────────────────────────────────────────

  /** Get live database metrics (connections, size, performance) */
  async getMetrics(databaseId: string): Promise<DatabaseMetrics> {
    return this.http.get<DatabaseMetrics>(
      `/api/v1/databases/${databaseId}/metrics`,
    );
  }

  // ── Backups ────────────────────────────────────────────────

  /** Create a manual backup */
  async createBackup(databaseId: string): Promise<DatabaseBackup> {
    const res = await this.http.post<{ backup: DatabaseBackup }>(
      `/api/v1/databases/${databaseId}/backups`,
    );
    return res.backup;
  }

  /** List backups for a database */
  async listBackups(databaseId: string): Promise<DatabaseBackup[]> {
    const res = await this.http.get<{ backups: DatabaseBackup[] }>(
      `/api/v1/databases/${databaseId}/backups`,
    );
    return res.backups || [];
  }

  /** Restore from a backup */
  async restoreBackup(databaseId: string, backupId: string): Promise<void> {
    await this.http.post(
      `/api/v1/databases/${databaseId}/backups/${backupId}/restore`,
    );
  }

  /** Delete a backup */
  async deleteBackup(databaseId: string, backupId: string): Promise<void> {
    await this.http.delete(
      `/api/v1/databases/${databaseId}/backups/${backupId}`,
    );
  }
}
