# CLAUDE.md

> **Source of truth — Ghayma-Architect.** Before changing platform behavior, read the relevant page in the Ghayma-Architect repo (sibling folder `Ghayma-Architect/`); update it in the same work-cycle after merging a behavior change. Every PR here carries the `Ghayma-Architect updated / not needed` checkbox.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Ghayma SDK (`@ghayma/sdk`) is the official server-side TypeScript SDK for Ghayma. It provides programmatic access to three services: **Storage** (S3-compatible), **Auth** (user/token management), and **Database** (PostgreSQL, MongoDB). Zero runtime dependencies — uses native `fetch` (Node 18+).

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
├── client.ts           # HttpClient base class + GhaymaError + ClientConfig
├── index.ts            # Ghayma facade class, re-exports all public API
├── storage/
│   ├── index.ts        # StorageClient (buckets, objects, presigned URLs, download)
│   └── types.ts        # Bucket, StorageObject, PresignedUrl, etc.
├── auth/
│   ├── index.ts        # AuthClient (auth apps, user management)
│   └── types.ts        # AuthApp, AuthUser, etc.
└── database/
    ├── index.ts        # DatabaseClient (CRUD, connections, metrics, backups)
    └── types.ts        # Database, DatabaseCredentials, DatabaseEngine, etc.
```

**Key pattern:** `Ghayma` is the public facade. It creates an `HttpClient` and injects it into `StorageClient`, `AuthClient`, and `DatabaseClient`. All HTTP concerns (auth headers, retries, timeouts, error parsing) live in `HttpClient`.

**Backward-compat aliases:** `Ghayma` is re-exported as the deprecated `EspaceTech`, and `GhaymaError` as the deprecated `EspaceError`, so consumers migrate with only a package-name change.

## Build System

- **tsup** builds four entry points (`index`, `storage/index`, `auth/index`, `database/index`) into both ESM and CJS with type declarations, source maps, tree-shaking, and code splitting.
- Package exports allow importing submodules directly: `@ghayma/sdk/storage`.

## Key Conventions

- All API paths follow `/api/v1/{resource}/{id}/{action}`.
- `GhaymaError` carries structured info: `message`, `status`, `code`, `details`.
- Retries use exponential backoff with jitter, only on 5xx or network errors.
- `rawFetch` is used for streaming responses (file downloads) — separate from the JSON `request` method.
- Environment variable `GHAYMA_API_URL` overrides the default base URL (for internal cluster routing) — an explicitly-passed `baseUrl` always wins; the legacy `ESPACE_API_URL` is still read as a fallback.
- The SDK targets both browser and Node.js — uses `globalThis` and guards `process.env` access.
