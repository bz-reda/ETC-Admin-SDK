# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ETC-Admin-SDK (`@bz-reda/ETC-Admin-SDK`) is the official TypeScript SDK for Espace-Tech Cloud. It provides programmatic access to three services: **Storage** (S3-compatible), **Auth** (user/token management), and **Database** (PostgreSQL, MongoDB, Redis). Zero runtime dependencies — uses native `fetch` (Node 18+).

## Commands

```bash
npm run build       # Production build via tsup (ESM + CJS + .d.ts)
npm run dev         # Watch mode for development
npm run typecheck   # Type-check without emitting
```

No test runner is configured. No linter is configured.

## Architecture

```
src/
├── client.ts           # HttpClient base class + EspaceError + ClientConfig
├── index.ts            # EspaceTech facade class, re-exports all public API
├── storage/
│   ├── index.ts        # StorageClient (buckets, objects, presigned URLs, download)
│   └── types.ts        # Bucket, StorageObject, PresignedUrl, etc.
├── auth/
│   ├── index.ts        # AuthClient (auth apps, token verify, user management)
│   └── types.ts        # AuthApp, AuthUser, VerifiedToken, etc.
└── database/
    ├── index.ts        # DatabaseClient (CRUD, connections, metrics, backups)
    └── types.ts        # Database, DatabaseCredentials, DatabaseEngine, etc.
```

**Key pattern:** `EspaceTech` is the public facade. It creates an `HttpClient` and injects it into `StorageClient`, `AuthClient`, and `DatabaseClient`. All HTTP concerns (auth headers, retries, timeouts, error parsing) live in `HttpClient`.

## Build System

- **tsup** builds four entry points (`index`, `storage/index`, `auth/index`, `database/index`) into both ESM and CJS with type declarations, source maps, tree-shaking, and code splitting.
- Package exports allow importing submodules directly: `@bz-reda/ETC-Admin-SDK/storage`.

## Key Conventions

- All API paths follow `/api/v1/{resource}/{id}/{action}`.
- `EspaceError` carries structured info: `message`, `status`, `code`, `details`.
- Retries use exponential backoff with jitter, only on 5xx or network errors.
- `rawFetch` is used for streaming responses (file downloads) — separate from the JSON `request` method.
- Environment variable `ESPACE_API_URL` auto-overrides the base URL (for internal cluster routing).
- The SDK targets both browser and Node.js — uses `globalThis` and guards `process.env` access.
