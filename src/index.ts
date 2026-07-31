/**
 * @ghayma/sdk
 *
 * Official SDK for Ghayma.
 * Manage storage, auth, and databases programmatically.
 *
 * @example
 * ```ts
 * import { Ghayma } from "@ghayma/sdk";
 *
 * const client = new Ghayma({ apiToken: "et_..." });
 *
 * // Storage
 * await client.storage.upload("bucket-id", "photo.jpg", file);
 * const { url } = await client.storage.getDownloadUrl("bucket-id", "photo.jpg");
 *
 * // Auth — manage an auth app's users
 * const { users } = await client.auth.listUsers("app-id");
 *
 * // Database — get connection strings
 * const conn = await client.database.getConnection("db-id");
 * ```
 *
 * @packageDocumentation
 */

import { HttpClient, type ClientConfig } from "./client.js";
import { StorageClient } from "./storage/index.js";
import { AuthClient } from "./auth/index.js";
import { DatabaseClient } from "./database/index.js";

/**
 * Main Ghayma client.
 *
 * Initialize with your API token from docs.ghayma.dev/settings/tokens.
 */
export class Ghayma {
  /** Storage — manage buckets, upload/download files, presigned URLs */
  public readonly storage: StorageClient;
  /** Auth — manage auth apps and users */
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

/** @deprecated use Ghayma */
export { Ghayma as EspaceTech };

// Re-export everything
export { GhaymaError } from "./client.js";
/** @deprecated use GhaymaError */
export { EspaceError } from "./client.js";
export type { ClientConfig } from "./client.js";

export { StorageClient } from "./storage/index.js";
export type {
  Bucket,
  BucketCredentials,
  BucketStatus,
  CreateBucketOptions,
  DownloadResult,
  ListObjectsOptions,
  ListObjectsResult,
  PresignedUrl,
  StorageObject,
  UploadOptions,
} from "./storage/index.js";

export { AuthClient } from "./auth/index.js";
export type {
  AuthApp,
  AuthEvent,
  AuthProviderCount,
  AuthStats,
  AuthUser,
  CreateAuthAppOptions,
  EmailLocale,
  ListUsersOptions,
  TwoFAPolicy,
} from "./auth/index.js";

export { DatabaseClient } from "./database/index.js";
export type {
  BackupTierSlug,
  ConnectionConfig,
  CreateDatabaseOptions,
  Database,
  DatabaseBackup,
  DatabaseCredentials,
  DatabaseEngine,
  DatabaseMetrics,
  DatabaseStatus,
  DatabaseType,
} from "./database/index.js";
