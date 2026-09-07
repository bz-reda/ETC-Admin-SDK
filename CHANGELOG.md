# Changelog

Releases before 0.6.0 are documented in the git history.

## 1.0.0

`@ghayma/sdk` is now the runtime SDK an app imports: a **server** entry that
holds a project API key, and a **client** entry for the browser. Managing
infrastructure moved out of the package to the console and the `ghayma` CLI,
which is why this release is breaking.

### Added

- **`@ghayma/sdk/client`** — the browser half of the SDK: `GhaymaAuth` signs
  your end users in with an app slug (login, registration, sessions, 2FA,
  OAuth, profile). It is the code that shipped as `@ghayma/auth`, moved in
  unchanged, and it never sees the project API key.
- **`apiKey`** — a project API key (`gsk_…`) from **Project → Settings → API
  keys**. Scoped to one project, which is what an app needs.
- **Zero-argument init** — `new Ghayma()` reads `GHAYMA_API_KEY`, the variable
  you set in your site's environment variables, so the app passes nothing at all. (Automatic injection arrives with Connections.)
- **Account-token warning** — passing a `gh_…` (or legacy `et_…`) credential
  logs one warning per process saying it acts as you across every project and
  pointing at project API keys.

### Removed

Each removed method has a home in the console at
[dash.ghayma.cloud](https://dash.ghayma.cloud) or in the `ghayma` CLI. Nothing
about the backend changed — these are still the same REST endpoints, they are
simply not part of an app's runtime surface.

**Auth**

- `auth.createApp()` → `ghayma auth create`, or the console's Auth page
- `auth.updateApp()` → `ghayma auth config`, or the console's Auth page
- `auth.deleteApp()` → `ghayma auth delete`, or the console's Auth page
- `auth.rotateKeys()` → `ghayma auth rotate-keys`, or the console's Auth page
- Types `CreateAuthAppOptions` and `UpdateAuthAppOptions` went with them.

**Storage**

- `storage.createBucket()` → `ghayma storage create`
- `storage.deleteBucket()` → `ghayma storage delete`
- `storage.rotateCredentials()` → `ghayma storage rotate`
- `storage.makePublic()` → `ghayma storage expose`
- `storage.makePrivate()` → `ghayma storage unexpose`
- Types `CreateBucketOptions` and `ExposeResult` went with them.

**Database**

- `database.create()` → `ghayma db create`
- `database.delete()` → `ghayma db delete`
- `database.stop()` / `database.start()` → `ghayma db stop` / `ghayma db start`
- `database.rotateCredentials()` → `ghayma db rotate`
- `database.expose()` / `database.unexpose()` → `ghayma db expose` / `ghayma db unexpose`
- `database.createBackup()`, `database.listBackups()`,
  `database.restoreBackup()`, `database.deleteBackup()` → the console's
  database Backups tab
- Types `CreateDatabaseOptions` and `DatabaseBackup` went with them.
  `BackupTierSlug` stays: it is the type of `Database.backup_tier_slug`.

### Deprecated

- **`apiToken`** — an account token still authenticates and now warns once per
  process. It acts as you across every project you can reach, so an app should
  hold a project API key instead:

  ```diff
  - const client = new Ghayma({ apiToken: process.env.GHAYMA_TOKEN! });
  + const ghayma = new Ghayma({ apiKey: process.env.GHAYMA_API_KEY! });
  + // or, in an app connected on Ghayma:
  + const ghayma = new Ghayma();
  ```

- **`@ghayma/auth`** — the package is deprecated and re-exports
  `@ghayma/sdk/client`. Existing code keeps working; migrate by changing the
  import:

  ```diff
  - import { GhaymaAuth } from "@ghayma/auth";
  + import { GhaymaAuth } from "@ghayma/sdk/client";
  ```

## 0.6.0

### Removed

- `database.link()` and `database.unlink()`. A managed database now belongs to
  exactly one project for its whole life, so there is nothing to link or
  unlink — the project is chosen at creation (`database.create({ project_id })`)
  and never changes. The backend endpoints `POST /api/v1/databases/:id/link`
  and `POST /api/v1/databases/:id/unlink` are removed in the same release, so
  these methods could only ever return a 404.

  There is no replacement. Create the database in the project that needs it.
