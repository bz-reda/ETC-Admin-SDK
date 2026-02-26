/**
 * @espace-tech/sdk
 *
 * Official SDK for Espace-Tech Cloud.
 * Manage storage, auth, and databases programmatically.
 *
 * @example
 * ```ts
 * import { EspaceTech } from "@espace-tech/sdk";
 *
 * const client = new EspaceTech({ apiToken: "et_..." });
 *
 * // Storage
 * await client.storage.upload("bucket-id", "photo.jpg", file);
 * const { url } = await client.storage.getDownloadUrl("bucket-id", "photo.jpg");
 *
 * // Auth — verify user tokens in your backend
 * const user = await client.auth.verifyToken("app-id", token);
 *
 * // Database — get connection strings
 * const conn = await client.database.getConnection("db-id");
 * ```
 *
 * @packageDocumentation
 */

import { HttpClient, type ClientConfig, EspaceError } from "./client.js";
import { StorageClient } from "./storage/index.js";
import { AuthClient } from "./auth/index.js";
import { DatabaseClient } from "./database/index.js";

/**
 * Main Espace-Tech Cloud client.
 *
 * Initialize with your API token from cloud.espace-tech.com/settings/tokens.
 */
export class EspaceTech {
  /** Storage — manage buckets, upload/download files, presigned URLs */
  public readonly storage: StorageClient;
  /** Auth — manage auth apps, verify user tokens, manage users */
  public readonly auth: AuthClient;
  /** Database — manage PostgreSQL/Redis/MongoDB, get connections */
  public readonly database: DatabaseClient;

  private readonly http: HttpClient;

  constructor(config: ClientConfig) {
    this.http = new HttpClient(config);
    this.storage = new StorageClient(this.http);
    this.auth = new AuthClient(this.http);
    this.database = new DatabaseClient(this.http);
  }
}

// Re-export everything
export { EspaceError } from "./client.js";
export type { ClientConfig } from "./client.js";

export { StorageClient } from "./storage/index.js";
export type {
  Bucket,
  BucketCredentials,
  CreateBucketOptions,
  ListObjectsOptions,
  ListObjectsResult,
  PresignedUrl,
  StorageObject,
  UploadOptions,
} from "./storage/index.js";

export { AuthClient } from "./auth/index.js";
export type {
  AuthApp,
  AuthStats,
  AuthUser,
  ListUsersOptions,
  VerifiedToken,
} from "./auth/index.js";

export { DatabaseClient } from "./database/index.js";
export type {
  ConnectionConfig,
  CreateDatabaseOptions,
  Database,
  DatabaseBackup,
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseMetrics,
} from "./database/index.js";
