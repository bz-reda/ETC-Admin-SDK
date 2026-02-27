/** Storage bucket */
export interface Bucket {
  id: string;
  name: string;
  project_id: string;
  status: "provisioning" | "ready" | "active" | "error" | "deleting";
  size_bytes: number;
  object_count: number;
  is_public: boolean;
  public_url: string | null;
  quota_bytes: number;
  created_at: string;
  updated_at: string;
}

/** S3 credentials for a bucket */
export interface BucketCredentials {
  endpoint: string;
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
  region: string;
  public_url: string | null;
}

/** An object (file) in a bucket */
export interface StorageObject {
  key: string;
  size: number;
  last_modified: string;
  etag?: string;
  is_folder: boolean;
}

/** Result of listing objects */
export interface ListObjectsResult {
  objects: StorageObject[];
  folders: string[];
  is_truncated: boolean;
  continuation_token: string;
}

/** Options for listing objects */
export interface ListObjectsOptions {
  /** Prefix to filter keys (e.g., "images/") */
  prefix?: string;
  /** Continuation token for pagination */
  continuationToken?: string;
  /** Max keys to return per page (default: 100) */
  maxKeys?: number;
}

/** Presigned URL response */
export interface PresignedUrl {
  url: string;
  key: string;
  expires_at: string;
}

/** Options for creating a bucket */
export interface CreateBucketOptions {
  name: string;
  project_id: string;
  is_public?: boolean;
}

/** Upload options */
export interface UploadOptions {
  /** Custom content type (auto-detected if omitted) */
  contentType?: string;
  /** Upload timeout in ms (default: 5 minutes) */
  timeout?: number;
}

/** Result of downloading an object */
export interface DownloadResult {
  /** Raw response body stream */
  body: ReadableStream<Uint8Array> | null;
  /** Get full content as ArrayBuffer */
  arrayBuffer: () => Promise<ArrayBuffer>;
  /** Get full content as Blob */
  blob: () => Promise<Blob>;
  /** MIME type of the file */
  contentType: string;
  /** File size in bytes (0 if unknown) */
  size: number;
}
