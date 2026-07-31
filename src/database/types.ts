/** Database type slug, matching the backend's `type` field (create + responses). */
export type DatabaseType = "postgres" | "mongodb";

/** @deprecated use DatabaseType — retained so pre-0.5 imports keep resolving. */
export type DatabaseEngine = DatabaseType;

/** Lifecycle status of a managed database. */
export type DatabaseStatus = "provisioning" | "running" | "stopped" | "error";

/** Scheduled-backup cadence (backup_tiers.slug). `weekly` is free. */
export type BackupTierSlug = "weekly" | "daily" | "sixhourly";

/** Database instance (GET /databases, GET /databases/:id). */
export interface Database {
  id: string;
  user_id: string;
  /** Absent for databases not attached to a project. */
  project_id?: string;
  team_id?: string;
  name: string;
  type: DatabaseType;
  version: string;
  status: DatabaseStatus;
  host: string;
  port: number;
  db_name?: string;
  username?: string;
  /** Sizing bracket from database_tiers — the persisted sizing decision. */
  tier_slug: string;
  /** Kubernetes resource shape resolved from (tier_slug, type). */
  cpu_request: string;
  cpu_limit: string;
  memory_request: string;
  memory_limit: string;
  /** Compute commitment recorded for the project's plan bucket. */
  cpu_milli: number;
  memory_mb: number;
  /** Tracked storage allowance, in MB. */
  storage_mb: number;
  storage_used_bytes: number;
  /** Persistent-disk footprint in GB — the points-priced disk blocks. */
  disk_gb: number;
  backup_tier_slug: BackupTierSlug;
  max_connections?: number;
  /** MongoDB single-node replica-set mode. */
  replica_set: boolean;
  external_access: boolean;
  /** Present only when external access is enabled. */
  external_host?: string;
  external_port?: number;
  created_at: string;
  updated_at: string;
}

/** Database connection credentials (matches GET /databases/:id/credentials). */
export interface DatabaseCredentials {
  type: DatabaseType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  /** In-cluster connection string — always present. */
  internal_url: string;
  external_access: boolean;
  /** Present only when external access is enabled. */
  external_host?: string;
  external_port?: number;
  external_url?: string;
}

/** Live database metrics (GET /databases/:id/metrics). */
export interface DatabaseMetrics {
  /** The database's lifecycle status — the only field set when it isn't running. */
  status: DatabaseStatus;
  uptime_hours?: number;
  size_bytes: number;
  /** Human-readable form of size_bytes, e.g. "12.4 MB". */
  size_readable: string;
  active_connections: number;
  max_connections?: number;
  /**
   * Engine-specific counters.
   * postgres: table_count, total_rows, cache_hit_ratio, index_usage_ratio, dead_tuples.
   * mongodb: data_size, objects, collections, indexes.
   */
  extra?: Record<string, unknown>;
}

/** Database backup */
export interface DatabaseBackup {
  id: string;
  database_id: string;
  user_id: string;
  db_type: DatabaseType;
  db_name: string;
  status: "pending" | "running" | "completed" | "failed";
  size_bytes: number;
  /** Object key of the dump in the backup bucket. */
  s3_key: string;
  /** How the backup was started. Backend field is `trigger`, not `type`. */
  trigger: "manual" | "scheduled";
  /** Failure reason; present only on failed backups. */
  error?: string;
  created_at: string;
  updated_at: string;
}

/** Options for creating a database */
export interface CreateDatabaseOptions {
  name: string;
  project_id: string;
  /** Backend field is `type` with slugs postgres | mongodb. */
  type: DatabaseType;
  version?: string;
}

/** Connection string helpers */
export interface ConnectionConfig {
  /** Full connection string (e.g., postgresql://user:pass@host:port/db) */
  url: string;
  /** Individual components */
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}
