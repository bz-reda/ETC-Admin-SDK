/** Supported database engines */
export type DatabaseEngine = "postgresql" | "redis" | "mongodb";

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

/** Database connection credentials */
export interface DatabaseCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  connection_string: string;
  internal_host?: string;
  internal_port?: number;
  internal_connection_string?: string;
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
  engine: DatabaseEngine;
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
