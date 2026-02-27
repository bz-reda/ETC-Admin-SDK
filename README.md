# @espace-tech/sdk

Official TypeScript SDK for [Espace-Tech Cloud](https://cloud.espace-tech.com) — storage, authentication, and database management for the Algerian and African developer ecosystem.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4%2B-blue.svg)](https://typescriptlang.org)

## Installation

```bash
# Install from GitHub
npm install github:bz-reda/Espace-Tech-Cloud-SDK

# Or with yarn
yarn add github:bz-reda/Espace-Tech-Cloud-SDK

# Or with pnpm
pnpm add github:bz-reda/Espace-Tech-Cloud-SDK
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

### Get presigned URLs

```ts
// Download URL (for serving private files)
const { url } = await client.storage.getDownloadUrl("bucket-id", "reports/q4.pdf");
// Use in <img src={url} /> or redirect to it

// Upload URL (for client-side uploads without exposing API token)
const { url: uploadUrl } = await client.storage.getUploadUrl("bucket-id", "uploads/photo.jpg");
await fetch(uploadUrl, { method: "PUT", body: file });
```

### Delete a file

```ts
await client.storage.deleteObject("bucket-id", "images/old-photo.jpg");
```

### Manage buckets

```ts
// Create
const bucket = await client.storage.createBucket({
  name: "my-assets",
  project_id: "project-id",
});

// Get S3 credentials (for direct S3 client access)
const creds = await client.storage.getCredentials("bucket-id");
console.log(creds.endpoint, creds.access_key_id);

// Make public/private
await client.storage.makePublic("bucket-id");
await client.storage.makePrivate("bucket-id");
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

// Get statistics
const stats = await client.auth.getStats("auth-app-id");
console.log(stats.total_users, stats.logins_today);
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

// Stop / start
await client.database.stop("db-id");
await client.database.start("db-id");

// Enable external access
await client.database.expose("db-id");

// Link to a project (injects DATABASE_URL env var)
await client.database.link("db-id", "project-id");

// Get live metrics
const metrics = await client.database.getMetrics("db-id");
console.log(metrics.connections, metrics.size);
```

### Backups

```ts
// Create a manual backup
const backup = await client.database.createBackup("db-id");

// List backups
const backups = await client.database.listBackups("db-id");

// Restore from backup
await client.database.restoreBackup("db-id", "backup-id");
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
// lib/espace.ts
import { EspaceTech } from "@espace-tech/sdk";

export const espace = new EspaceTech({
  apiToken: process.env.ESPACE_TECH_TOKEN!,
});

// app/api/upload/route.ts
import { espace } from "@/lib/espace";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const obj = await espace.storage.upload("bucket-id", `uploads/${file.name}`, file);
  return Response.json({ key: obj.key });
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
git clone https://github.com/bz-reda/Espace-Tech-Cloud-SDK.git
cd Espace-Tech-Cloud-SDK

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

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/bz-reda/Espace-Tech-Cloud-SDK).

## Links

- [Espace-Tech Cloud Dashboard](https://cloud.espace-tech.com)
- [GitHub Repository](https://github.com/bz-reda/Espace-Tech-Cloud-SDK)
- [Report an Issue](https://github.com/bz-reda/Espace-Tech-Cloud-SDK/issues)

## License

MIT © [Espace-Tech](https://espace-tech.com)
