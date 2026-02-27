import { HttpClient } from "../client.js";
import type {
  Bucket,
  BucketCredentials,
  CreateBucketOptions,
  DownloadResult,
  ListObjectsOptions,
  ListObjectsResult,
  PresignedUrl,
  StorageObject,
  UploadOptions,
} from "./types.js";

export type {
  Bucket,
  BucketCredentials,
  CreateBucketOptions,
  DownloadResult,
  ListObjectsOptions,
  ListObjectsResult,
  PresignedUrl,
  StorageObject,
  UploadOptions,
};

/**
 * Storage client for managing S3-compatible buckets and objects.
 *
 * @example
 * ```ts
 * import { EspaceTech } from "@espace-tech/sdk";
 *
 * const client = new EspaceTech({ apiToken: "et_..." });
 *
 * // Upload a file
 * await client.storage.upload("bucket-id", "images/photo.jpg", file);
 *
 * // List files
 * const { objects } = await client.storage.listObjects("bucket-id", { prefix: "images/" });
 *
 * // Get download URL
 * const { url } = await client.storage.getDownloadUrl("bucket-id", "images/photo.jpg");
 * ```
 */
export class StorageClient {
  constructor(private readonly http: HttpClient) {}

  // ── Bucket Operations ──────────────────────────────────────

  /** Create a new storage bucket */
  async createBucket(options: CreateBucketOptions): Promise<Bucket> {
    const res = await this.http.post<{ bucket: Bucket }>("/api/v1/storage", options);
    return res.bucket;
  }

  /** List all buckets */
  async listBuckets(): Promise<Bucket[]> {
    const res = await this.http.get<{ buckets: Bucket[] }>("/api/v1/storage");
    return res.buckets || [];
  }

  /** Get bucket details */
  async getBucket(bucketId: string): Promise<Bucket> {
    const res = await this.http.get<{ bucket: Bucket }>(`/api/v1/storage/${bucketId}`);
    return res.bucket;
  }

  /** Delete a bucket and all its objects */
  async deleteBucket(bucketId: string): Promise<void> {
    await this.http.delete(`/api/v1/storage/${bucketId}`);
  }

  /** Get S3 credentials for direct access */
  async getCredentials(bucketId: string): Promise<BucketCredentials> {
    const res = await this.http.get<{ credentials: BucketCredentials }>(
      `/api/v1/storage/${bucketId}/credentials`
    );
    return res.credentials;
  }

  /** Rotate bucket credentials (invalidates existing keys) */
  async rotateCredentials(bucketId: string): Promise<BucketCredentials> {
    const res = await this.http.post<{ credentials: BucketCredentials }>(
      `/api/v1/storage/${bucketId}/rotate`
    );
    return res.credentials;
  }

  /** Make bucket publicly accessible */
  async makePublic(bucketId: string): Promise<Bucket> {
    const res = await this.http.post<{ bucket: Bucket }>(`/api/v1/storage/${bucketId}/expose`);
    return res.bucket;
  }

  /** Make bucket private */
  async makePrivate(bucketId: string): Promise<Bucket> {
    const res = await this.http.post<{ bucket: Bucket }>(`/api/v1/storage/${bucketId}/unexpose`);
    return res.bucket;
  }

  // ── Object Operations ──────────────────────────────────────

  /**
   * Upload a file to a bucket.
   *
   * @param bucketId - Bucket ID
   * @param key - Object key (path), e.g. "images/photo.jpg"
   * @param data - File content as Blob, Buffer, ReadableStream, or string
   * @param options - Upload options
   *
   * @example
   * ```ts
   * // Node.js — upload from buffer
   * import { readFileSync } from "fs";
   * const buffer = readFileSync("./photo.jpg");
   * await storage.upload("bucket-id", "photos/photo.jpg", new Blob([buffer]));
   *
   * // Browser — upload from File input
   * const file = inputElement.files[0];
   * await storage.upload("bucket-id", `uploads/${file.name}`, file);
   * ```
   */
  async upload(
    bucketId: string,
    key: string,
    data: Blob | File,
    options?: UploadOptions
  ): Promise<StorageObject> {
    const formData = new FormData();
    formData.append("key", key);

    if (options?.contentType) {
      formData.append("file", new Blob([data], { type: options.contentType }), key.split("/").pop());
    } else {
      formData.append("file", data, key.split("/").pop());
    }

    const res = await this.http.upload<{ object: StorageObject }>(
      `/api/v1/storage/${bucketId}/objects/upload`,
      formData,
      options?.timeout ?? 300_000 // 5 min default for uploads
    );
    return res.object;
  }

  /**
   * List objects in a bucket with pagination.
   *
   * @example
   * ```ts
   * // List all images
   * const result = await storage.listObjects("bucket-id", { prefix: "images/" });
   * console.log(result.objects); // files
   * console.log(result.folders); // subfolders
   *
   * // Paginate
   * if (result.is_truncated) {
   *   const next = await storage.listObjects("bucket-id", {
   *     continuationToken: result.continuation_token,
   *   });
   * }
   * ```
   */
  async listObjects(
    bucketId: string,
    options?: ListObjectsOptions
  ): Promise<ListObjectsResult> {
    return this.http.get<ListObjectsResult>(`/api/v1/storage/${bucketId}/objects`, {
      prefix: options?.prefix,
      continuation_token: options?.continuationToken,
      max_keys: options?.maxKeys,
    });
  }

  /**
   * List ALL objects recursively (traverses all folders).
   * Useful for analytics or full bucket operations.
   *
   * ⚠️ For large buckets, this may take a while. Use `listObjects()` for paginated access.
   */
  async listAllObjects(
    bucketId: string,
    prefix = ""
  ): Promise<StorageObject[]> {
    const all: StorageObject[] = [];

    const traverse = async (pfx: string) => {
      let token: string | undefined;
      let truncated = true;

      while (truncated) {
        const result = await this.listObjects(bucketId, {
          prefix: pfx,
          continuationToken: token,
        });

        all.push(...result.objects);

        // Recurse into subfolders
        for (const folder of result.folders) {
          await traverse(folder);
        }

        token = result.continuation_token || undefined;
        truncated = result.is_truncated;
      }
    };

    await traverse(prefix);
    return all;
  }

  /** Delete an object from a bucket */
  async deleteObject(bucketId: string, key: string): Promise<void> {
    await this.http.request("DELETE", `/api/v1/storage/${bucketId}/objects`, {
      body: { key },
    });
  }

  /**
   * Download a file from a bucket.
   *
   * @example
   * ```ts
   * // Next.js API route — serve a private image
   * import { espace } from "@/lib/espace";
   *
   * export async function GET(req: Request) {
   *   const key = new URL(req.url).searchParams.get("key")!;
   *   const file = await espace.storage.download("bucket-id", key);
   *   return new Response(file.body, {
   *     headers: {
   *       "Content-Type": file.contentType,
   *       "Cache-Control": "public, max-age=3600",
   *     },
   *   });
   * }
   *
   * // Node.js — save to disk
   * import { writeFileSync } from "fs";
   * const file = await client.storage.download("bucket-id", "report.pdf");
   * writeFileSync("report.pdf", Buffer.from(await file.arrayBuffer()));
   * ```
   */
  async download(bucketId: string, key: string): Promise<DownloadResult> {
    const res = await this.http.rawFetch(
      `/api/v1/storage/${bucketId}/objects/download?key=${encodeURIComponent(key)}`
    );

    return {
      body: res.body,
      arrayBuffer: () => res.arrayBuffer(),
      blob: () => res.blob(),
      contentType: res.headers.get("Content-Type") || "application/octet-stream",
      size: parseInt(res.headers.get("Content-Length") || "0", 10),
    };
  }

  // ── Presigned URLs ─────────────────────────────────────────

  /**
   * Get a presigned upload URL. Useful for client-side uploads
   * without exposing your API token.
   *
   * @example
   * ```ts
   * const { url } = await storage.getUploadUrl("bucket-id", "uploads/photo.jpg");
   * // Use the URL to upload directly from a browser
   * await fetch(url, { method: "PUT", body: file });
   * ```
   */
  async getUploadUrl(
    bucketId: string,
    key: string,
    contentType?: string
  ): Promise<PresignedUrl> {
    const res = await this.http.post<Record<string, unknown>>(
      `/api/v1/storage/${bucketId}/presign/upload`,
      { key, content_type: contentType },
    );
    return {
      url: (res.upload_url || res.url) as string,
      key,
      expires_in: (res.expires_in as number) || 3600,
    };
  }

  /**
   * Get a presigned download URL. Useful for serving private files
   * to users without exposing credentials.
   *
   * @example
   * ```ts
   * const { url } = await storage.getDownloadUrl("bucket-id", "reports/q4.pdf");
   * // Redirect user to this URL or use in <img src={url} />
   * ```
   */
  async getDownloadUrl(bucketId: string, key: string): Promise<PresignedUrl> {
    const res = await this.http.post<Record<string, unknown>>(
      `/api/v1/storage/${bucketId}/presign/download`,
      { key },
    );
    return {
      url: (res.download_url || res.url) as string,
      key,
      expires_in: (res.expires_in as number) || 3600,
    };
  }
}
