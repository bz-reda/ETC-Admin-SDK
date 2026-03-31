# @espace-tech/sdk

Official TypeScript SDK for [Espace-Tech Cloud](https://cloud.espace-tech.com) — storage, authentication, and database management for the Algerian and African developer ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-blue.svg)](https://typescriptlang.org)

## Installation

```bash
# Install from GitHub
npm install github:bz-reda/ETC-Admin-SDK

# Or with yarn
yarn add github:bz-reda/ETC-Admin-SDK

# Or with pnpm
pnpm add github:bz-reda/ETC-Admin-SDK
```

## Prerequisites

1. Create an account at [cloud.espace-tech.com](https://cloud.espace-tech.com)
2. Generate an API token at **Settings → API Tokens**
3. Node.js 18 or higher (uses native `fetch`)

## Quick Start

```ts
import { EspaceTech } from "@espace-tech/sdk";

const client = new EspaceTech({
  apiToken: process.env.ESPACE_TECH_TOKEN!, // Get from cloud.espace-tech.com/settings/tokens
});
```

---

## Storage

Upload, download, and manage files in S3-compatible buckets.

### Upload a file

```ts
// Node.js
import { readFileSync } from "fs";
const buffer = readFileSync("./photo.jpg");
await client.storage.upload("bucket-id", "images/photo.jpg", new Blob([buffer]));

// Browser
const file = document.getElementById("fileInput").files[0];
await client.storage.upload("bucket-id", `uploads/${file.name}`, file);
```

### Download a file

```ts
// Download file content (server-side)
const file = await client.storage.download("bucket-id", "images/photo.jpg");

// Save to disk (Node.js)
import { writeFileSync } from "fs";
writeFileSync("photo.jpg", Buffer.from(await file.arrayBuffer()));

// Serve in an API route (Next.js)
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key")!;
  const file = await client.storage.download("bucket-id", key);
  return new Response(file.body, {
    headers: { "Content-Type": file.contentType },
  });
}
```

### List files

```ts
const result = await client.storage.listObjects("bucket-id", {
  prefix: "images/",
});

for (const obj of result.objects) {
  console.log(obj.key, obj.size);
}

// Paginate
if (result.is_truncated) {
  const next = await client.storage.listObjects("bucket-id", {
    continuationToken: result.continuation_token,
  });
}
```

### Presigned URLs (best for frontend)

Presigned URLs let browsers access private files directly — no proxy or API token needed.

```ts
// Download URL — use directly in <img>, <video>, or window.open()
const { url } = await client.storage.getDownloadUrl("bucket-id", "images/photo.jpg");
// url = "https://s3.espace-tech.com/...?X-Amz-Signature=..."
// → Use in <img src={url} />, expires in 1 hour

// Upload URL — let browsers upload without your API token
const { url: uploadUrl } = await client.storage.getUploadUrl("bucket-id", "uploads/photo.jpg");
await fetch(uploadUrl, { method: "PUT", body: file });
```

**Serving images in Next.js (no proxy needed):**

```ts
// app/api/images/route.ts
import { espace } from "@/lib/espace";

export async function GET() {
  const result = await espace.storage.listObjects("bucket-id", { prefix: "images/" });

  const images = await Promise.all(
    result.objects
      .filter((obj) => !obj.is_folder)
      .map(async (obj) => ({
        key: obj.key,
        url: (await espace.storage.getDownloadUrl("bucket-id", obj.key)).url,
      }))
  );

  return Response.json({ images });
}
// Frontend: <img src={image.url} /> — works directly, no proxy route needed
```

### Delete a file

```ts
await client.storage.deleteObject("bucket-id", "images/old-photo.jpg");
```

### List all files recursively

```ts
// Traverses all pages automatically
const allFiles = await client.storage.listAllObjects("bucket-id", "images/");
for (const obj of allFiles) {
  console.log(obj.key, obj.size);
}
```

### Manage buckets

```ts
// Create
const bucket = await client.storage.createBucket({
  name: "my-assets",
  project_id: "project-id",
});

// Get bucket details
const info = await client.storage.getBucket("bucket-id");

// List all buckets
const buckets = await client.storage.listBuckets();

// Get S3 credentials (for direct S3 client access)
const creds = await client.storage.getCredentials("bucket-id");
console.log(creds.endpoint, creds.access_key_id);

// Rotate credentials
const newCreds = await client.storage.rotateCredentials("bucket-id");

// Make public/private
await client.storage.makePublic("bucket-id");
await client.storage.makePrivate("bucket-id");

// Delete bucket
await client.storage.deleteBucket("bucket-id");
```

---

## Auth

Firebase Auth alternative — verify user tokens and manage users.

### Verify a user token (backend middleware)

```ts
// Express.js example
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const result = await client.auth.verifyToken("auth-app-id", token);
    if (!result.valid) return res.status(401).json({ error: "Invalid token" });
    req.user = result; // { user_id, email, name, provider }
    next();
  } catch {
    res.status(401).json({ error: "Token verification failed" });
  }
});
```

### List and manage users

```ts
// List users with pagination
const { users, total } = await client.auth.listUsers("auth-app-id", {
  page: 1,
  limit: 50,
  search: "john",
});

// Disable/enable a user
await client.auth.disableUser("auth-app-id", "user-id");
await client.auth.enableUser("auth-app-id", "user-id");

// Delete a user
await client.auth.deleteUser("auth-app-id", "user-id");
```

### Auth app management

```ts
// Create an auth app
const app = await client.auth.createApp({
  name: "My App Auth",
  project_id: "project-id",
  providers: { email: true, google: true, github: true },
});

// List all auth apps
const apps = await client.auth.listApps();

// Get auth app details
const appInfo = await client.auth.getApp("auth-app-id");

// Update settings
await client.auth.updateApp("auth-app-id", {
  name: "Updated Name",
  providers: { email: true, google: true, github: false },
});

// Get statistics
const stats = await client.auth.getStats("auth-app-id");
console.log(stats.total_users, stats.logins_today);

// Rotate signing keys (invalidates all existing user tokens)
await client.auth.rotateKeys("auth-app-id");

// Delete auth app
await client.auth.deleteApp("auth-app-id");
```

---

## Database

Manage PostgreSQL, Redis, and MongoDB instances with connection helpers.

### Get a connection string

```ts
const conn = await client.database.getConnection("db-id");

// PostgreSQL with node-postgres
import { Pool } from "pg";
const pool = new Pool({ connectionString: conn.url });

// PostgreSQL with Prisma — set DATABASE_URL=conn.url

// MongoDB with mongoose
import mongoose from "mongoose";
await mongoose.connect(conn.url);

// Redis with ioredis
import Redis from "ioredis";
const redis = new Redis(conn.url);
```

### Create a database

```ts
const db = await client.database.create({
  name: "my-postgres",
  project_id: "project-id",
  engine: "postgresql",
});
```

### Manage databases

```ts
// List all databases
const databases = await client.database.list();

// Get database details
const db = await client.database.get("db-id");

// Get raw credentials
const creds = await client.database.getCredentials("db-id");
console.log(creds.host, creds.port, creds.username, creds.password);

// Rotate credentials
const newCreds = await client.database.rotateCredentials("db-id");

// Stop / start
await client.database.stop("db-id");
await client.database.start("db-id");

// Enable / disable external access
await client.database.expose("db-id");
await client.database.unexpose("db-id");

// Link / unlink to a project (injects DATABASE_URL env var)
await client.database.link("db-id", "project-id");
await client.database.unlink("db-id");

// Get live metrics
const metrics = await client.database.getMetrics("db-id");
console.log(metrics.connections, metrics.size);

// Delete database
await client.database.delete("db-id");
```

### Backups

```ts
// Create a manual backup
const backup = await client.database.createBackup("db-id");

// List backups
const backups = await client.database.listBackups("db-id");

// Restore from backup
await client.database.restoreBackup("db-id", "backup-id");

// Delete a backup
await client.database.deleteBackup("db-id", "backup-id");
```

---

## Error Handling

All methods throw `EspaceError` on failure:

```ts
import { EspaceError } from "@espace-tech/sdk";

try {
  await client.storage.upload("bucket-id", "file.txt", blob);
} catch (err) {
  if (err instanceof EspaceError) {
    console.error(err.message);  // "Bucket not found"
    console.error(err.status);   // 404
    console.error(err.code);     // "HTTP_404"
  }
}
```

## Configuration

```ts
const client = new EspaceTech({
  apiToken: "et_...",                              // Required
  baseUrl: "https://api.espace-tech.com",          // Default
  timeout: 30000,                                  // 30s default
  maxRetries: 2,                                   // Retries on 5xx errors
});
```

## Tree-Shakeable Imports

Import only what you need:

```ts
// Full SDK
import { EspaceTech } from "@espace-tech/sdk";

// Individual modules
import { StorageClient } from "@espace-tech/sdk/storage";
import { AuthClient } from "@espace-tech/sdk/auth";
import { DatabaseClient } from "@espace-tech/sdk/database";
```

## Environment Variables

We recommend storing your API token in environment variables:

```bash
# .env
ESPACE_TECH_TOKEN=et_your_api_token
```

```ts
const client = new EspaceTech({
  apiToken: process.env.ESPACE_TECH_TOKEN!,
});
```

## Framework Examples

### Next.js (App Router)

```ts
// lib/espace.ts — shared client
import { EspaceTech } from "@espace-tech/sdk";

export const espace = new EspaceTech({
  apiToken: process.env.ESPACE_TECH_TOKEN!,
});
```

```ts
// app/api/upload/route.ts — handle file uploads
import { espace } from "@/lib/espace";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const obj = await espace.storage.upload("bucket-id", `uploads/${file.name}`, file);
  return Response.json({ key: obj.key });
}
```

```ts
// app/api/images/route.ts — list images with browser-ready URLs
import { espace } from "@/lib/espace";

export async function GET() {
  const result = await espace.storage.listObjects("bucket-id", { prefix: "images/" });

  const images = await Promise.all(
    result.objects
      .filter((obj) => !obj.is_folder)
      .map(async (obj) => ({
        key: obj.key,
        size: obj.size,
        url: (await espace.storage.getDownloadUrl("bucket-id", obj.key)).url,
      }))
  );

  return Response.json({ images });
  // Frontend: <img src={image.url} /> — no proxy needed
}
```

```ts
// app/api/files/[key]/route.ts — download/serve a private file
import { espace } from "@/lib/espace";

export async function GET(_: Request, { params }: { params: { key: string } }) {
  const file = await espace.storage.download("bucket-id", params.key);
  return new Response(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

### Express.js (Auth Middleware)

```ts
import express from "express";
import { EspaceTech } from "@espace-tech/sdk";

const client = new EspaceTech({ apiToken: process.env.ESPACE_TECH_TOKEN! });
const app = express();

// Protect routes with Espace-Tech Auth
app.use("/api", async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = await client.auth.verifyToken("auth-app-id", token);
    if (!user.valid) return res.status(401).json({ error: "Invalid token" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Auth failed" });
  }
});
```

## Compatibility

- **Node.js** 18+ (uses native `fetch`)
- **Deno**
- **Bun**
- **Cloudflare Workers**
- **Browsers** (for client-side uploads via presigned URLs)

## Development

```bash
# Clone the repo
git clone https://github.com/bz-reda/ETC-Admin-SDK.git
cd ETC-Admin-SDK

# Install dependencies
npm install

# Build (ESM + CJS + TypeScript declarations)
npm run build

# Type check
npm run typecheck

# Watch mode during development
npm run dev
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/bz-reda/ETC-Admin-SDK).

## Links

- [Espace-Tech Cloud Dashboard](https://cloud.espace-tech.com)
- [GitHub Repository](https://github.com/bz-reda/ETC-Admin-SDK)
- [Report an Issue](https://github.com/bz-reda/ETC-Admin-SDK/issues)

## License

MIT © [Espace-Tech](https://espace-tech.com)
