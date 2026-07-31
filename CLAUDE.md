# CLAUDE.md

> **Source of truth — Ghayma-Architect.** Before changing platform behavior, read the relevant page in the Ghayma-Architect repo (sibling folder `Ghayma-Architect/`); update it in the same work-cycle after merging a behavior change. Every PR here carries the `Ghayma-Architect updated / not needed` checkbox.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Ghayma SDK (`@ghayma/sdk`) is the official server-side TypeScript SDK for Ghayma. It provides programmatic access to three services: **Storage** (S3-compatible), **Auth** (user/token management), and **Database** (PostgreSQL, MongoDB). Zero runtime dependencies — uses native `fetch` (Node 18+).

## Commands

```bash
npm run build              # Production build via tsup (ESM + CJS + .d.ts)
npm run dev                # Watch mode for development
npm run typecheck          # Type-check src without emitting
npm run typecheck:contract # Also type-check test/types.contract.ts
npm test                   # Contract pin: typecheck:contract + build + node --test
```

No linter is configured.

**Contract tests (`test/`).** Zero-dependency, using Node's built-in test
runner — there is no test framework to install.

- `test/contract.test.mjs` stubs `globalThis.fetch` and runs the **built
  `dist/`**, asserting the request the SDK sends and the value it returns
  from a real backend payload. Add a case here whenever a method touches a
  request field, query parameter, or response wrapper key.
- `test/types.contract.ts` assigns real backend payloads to the SDK's
  response types. Object-literal excess-property checking makes this a
  two-way pin: a missing property means the SDK invented a field, an
  excess one means the SDK is missing a field the backend sends.
- `test/fixtures.mjs` holds the payloads, each cited to the Go struct it
  was transcribed from. Update these when `paas-api` changes a response.

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
