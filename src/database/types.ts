/** Supported database engines */
export type DatabaseEngine = "postgresql" | "redis" | "mongodb";

/** Database type slug, matching the backend's `type` field (create + responses). */
export type DatabaseType = "postgres" | "redis" | "mongodb";

/** Database instance */
export interface Database {
  id: string;
  name: string;
  project_id: string;
  engine: DatabaseEngine;
  version: string;
  status: "provisioning" | "running" | "stopped" | "error" | "deleting";
  size_bytes: number;
  is_external: boolean;
  external_host: string | null;
  external_port: number | null;
  linked_project_name: string | null;
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

/** Database metrics */
export interface DatabaseMetrics {
  engine: DatabaseEngine;
  /** PostgreSQL metrics */
  size?: string;
  connections?: number;
  max_connections?: number;
  tables?: number;
  total_rows?: number;
  cache_hit_ratio?: string;
  index_usage?: string;
  dead_tuples?: number;
  uptime?: string;
  /** Redis metrics */
  memory_used?: string;
  total_keys?: number;
  ops_per_sec?: number;
  hit_rate?: string;
  memory_fragmentation?: string;
  evicted_keys?: number;
  peak_memory?: string;
  /** MongoDB metrics */
  storage_size?: string;
  data_size?: string;
  documents?: number;
  collections?: number;
  indexes?: number;
}

/** Database backup */
export interface DatabaseBackup {
  id: string;
  database_id: string;
  type: "manual" | "scheduled";
  status: "pending" | "running" | "completed" | "failed";
  size_bytes: number;
  created_at: string;
}

/** Options for creating a database */
export interface CreateDatabaseOptions {
  name: string;
  project_id: string;
  /** Backend field is `type` with slugs postgres | redis | mongodb. */
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
