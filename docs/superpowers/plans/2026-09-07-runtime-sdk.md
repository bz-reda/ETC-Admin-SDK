# @ghayma/sdk 1.0.0 — runtime SDK (W3a) design + plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Checkbox steps.

**Goal:** Turn `@ghayma/sdk` into the runtime SDK an app imports: a **server** entry (project API key: auth-app user administration, storage helpers, database connection details) and a **client** entry (browser: login, register, session, 2FA — the code that lives in `@ghayma/auth` today). Infrastructure management leaves the package.

**Why:** Decisions D2/D3 of the program report (workspace root `PROJECT-KEYS-AND-CONNECTIONS-DESIGN-2026-09-06.md`): one package, two entry points; the browser can never hold the secret key; deploy, domains and resource lifecycle stay in the CLI, dashboard and REST API. Backend support: Ghayma-backend #302 (project keys) and the W1b follow-up (storage/databases runtime routes).

## Global Constraints
- Branch `feat/runtime-sdk` in this worktree (from `origin/main` 94e1e72, which contains #16). PR only; `npm publish` is Reda's (2FA OTP).
- Zero runtime dependencies stays true. Node ≥ 18. tsup build, ESM + CJS, `.d.ts`.
- `npm test` (typecheck:contract + build + node --test) must pass; it runs against `dist/`.
- Version **1.0.0**. Breaking changes are listed in `CHANGELOG.md` with the migration for each.
- No AI attribution anywhere. Stage by explicit path; do not stage `docs/superpowers/`.
- Rebrand rule: env variable NAMES are not rebranded (`ESPACETECH_AUTH_SERVER_KEY*` stays exactly as in the client code you copy). New env variable for the server key: `GHAYMA_API_KEY`.

---

### Task 1: Server credential — `apiKey`, zero-argument init, account-token warning

**Files:** rename `src/client.ts` → `src/http.ts` (update the three module imports and `src/index.ts`); `test/contract.test.mjs`.

- [ ] **Step 1: Failing tests** (append to `test/contract.test.mjs`; keep `stubFetch` and `client()` helpers):
```js
test("apiKey is sent as the bearer credential", async () => {
  const calls = stubFetch({ buckets: [] });
  await new Ghayma({ apiKey: "gsk_test", maxRetries: 0 }).storage.listBuckets();
  assert.equal(calls[0].init.headers.Authorization, "Bearer gsk_test");
});

test("zero-argument init reads GHAYMA_API_KEY", async () => {
  process.env.GHAYMA_API_KEY = "gsk_env";
  try {
    const calls = stubFetch({ buckets: [] });
    await new Ghayma().storage.listBuckets();
    assert.equal(calls[0].init.headers.Authorization, "Bearer gsk_env");
  } finally {
    delete process.env.GHAYMA_API_KEY;
  }
});

test("missing credential throws a message that points at project keys", () => {
  delete process.env.GHAYMA_API_KEY;
  assert.throws(() => new Ghayma(), /Project → Settings → API keys|GHAYMA_API_KEY/);
});

test("an account token still works but warns once", async () => {
  const warnings = [];
  const orig = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    const calls = stubFetch({ buckets: [] });
    const c = new Ghayma({ apiToken: "gh_old", maxRetries: 0 });
    await c.storage.listBuckets();
    await c.storage.listBuckets();
    assert.equal(calls[0].init.headers.Authorization, "Bearer gh_old");
    assert.equal(warnings.filter((w) => w.includes("account token")).length, 1);
  } finally {
    console.warn = orig;
  }
});
```
   Update the existing `client()` helper to `new Ghayma({ apiKey: "gsk_test", maxRetries: 0 })`.

- [ ] **Step 2: Run** `npm test` → FAIL on the new cases.

- [ ] **Step 3: Implement** in `src/http.ts`:
```ts
export interface ClientConfig {
  /** Project API key (`gsk_…`) from Project → Settings → API keys. Defaults to GHAYMA_API_KEY. */
  apiKey?: string;
  /** @deprecated account token (`gh_…`). Acts as you across every project; use a project API key. */
  apiToken?: string;
  /** Base URL override (default: https://api.ghayma.tech) */
  baseUrl?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Max retries on 5xx errors (default: 2) */
  maxRetries?: number;
}
```
   Constructor: `config: ClientConfig = {}`; resolve `credential = config.apiKey || config.apiToken || env.GHAYMA_API_KEY`; if empty throw `new Error("@ghayma/sdk: no credential. Create a project API key in the console (Project → Settings → API keys) and pass it as apiKey or set GHAYMA_API_KEY.")`; if it starts with `gh_` or `et_`, `console.warn` exactly once per process (module-level flag): `"@ghayma/sdk: you are using an account token. It acts as you across every project; switch to a project API key (gsk_…) from Project → Settings → API keys."`. Keep the `GHAYMA_API_URL` / `ESPACE_API_URL` base-URL dual read. Rename the private field to `credential`. `Ghayma`'s constructor takes `config: ClientConfig = {}`.

- [ ] **Step 4: Run** `npm test` → PASS.

- [ ] **Step 5: Commit** `feat(sdk): project API key credential, zero-argument init, account-token warning`.

---

### Task 2: Trim the server modules to the runtime surface

**Files:** `src/auth/index.ts` + `types.ts`, `src/storage/index.ts` + `types.ts`, `src/database/index.ts` + `types.ts`, `src/index.ts`, `test/contract.test.mjs`, `test/types.contract.ts`, `test/fixtures.mjs`.

Remove (method and its option/response types when nothing else uses them):
- auth: `createApp`, `updateApp`, `deleteApp`, `rotateKeys` (types `CreateAuthAppOptions`, `UpdateAuthAppOptions`).
- storage: `createBucket`, `deleteBucket`, `rotateCredentials`, `makePublic`, `makePrivate` (types `CreateBucketOptions`, `ExposeResult`).
- database: `create`, `delete`, `stop`, `start`, `rotateCredentials`, `expose`, `unexpose`, `createBackup`, `listBackups`, `restoreBackup`, `deleteBackup` (types `CreateDatabaseOptions`, `DatabaseBackup`, `BackupTierSlug`).

Keep: auth `listApps`, `getApp`, `getStats`, `listUsers`, `disableUser`, `enableUser`, `deleteUser`, `generatePasswordResetLink`, `updateUserAppMetadata`; storage `listBuckets`, `getBucket`, `getCredentials`, `upload`, `listObjects`, `listAllObjects`, `deleteObject`, `download`, `getUploadUrl`, `getDownloadUrl`; database `list`, `get`, `getCredentials`, `getConnection`, `getMetrics`.

- [ ] **Step 1:** Delete the contract test cases and fixtures that exercise removed methods (`auth.createApp`, backups, bucket create, …); delete the corresponding entries in `test/types.contract.ts`. Do not delete fixtures still used by kept methods.
- [ ] **Step 2: Run** `npm test` → FAIL to compile/import where removed types are still referenced.
- [ ] **Step 3:** Remove the methods and types; update the module doc comments (each module's header lists what it is for and says management lives in the console and CLI); update `src/index.ts` re-exports and its `@example` (use `new Ghayma()` / `apiKey`, drop `apiToken`).
- [ ] **Step 4: Run** `npm test` → PASS; `npm run typecheck` clean.
- [ ] **Step 5: Commit** `feat(sdk)!: remove infrastructure management from the runtime SDK`.

---

### Task 3: Client entry — move `@ghayma/auth` in verbatim

**Files:** `src/client/index.ts`, `src/client/client.ts`, `src/client/token.ts`, `src/client/types.ts` (copied), `test/client/helpers.mjs`, `test/client/server-key.test.mjs`, `test/client/twofa-auth.test.mjs` (copied), `tsup.config.ts`, `package.json`.

- [ ] **Step 1:** Copy the four source files verbatim from `/Users/bouzi/Projects/THROCT/worktrees/Auth-SDK/feat-alias-package/src/` (commit a6b42f0) into `src/client/`. Their relative imports (`./client.js`, `./token.js`, `./types.js`) resolve unchanged inside the directory. Copy the three test files from that repo's `test/` into `test/client/` and change their import of `../dist/index.js` to `../../dist/client/index.js` (helpers import stays `./helpers.mjs`).
- [ ] **Step 2:** `tsup.config.ts`: add `"client/index": "src/client/index.ts"` to `entry`. `package.json`: `"version": "1.0.0"`, description `"Ghayma runtime SDK — auth, storage and database helpers for apps running on Ghayma"`, homepage `https://docs.ghayma.cloud`, add export `"./client"` (same import/require/types shape as the existing subpath exports, pointing at `dist/client/index.*`), keep the existing subpaths, test script `"test": "npm run typecheck:contract && npm run build && node --test test/*.test.mjs test/client/*.test.mjs"`, keywords add `"login"`, `"jwt"`.
- [ ] **Step 3: Run** `npm test` → all suites PASS including the copied client tests. Confirm `dist/client/index.js` exists and `dist/index.js` does not import it (`grep -c "client/index" dist/index.js` → 0).
- [ ] **Step 4: Commit** `feat(sdk): client entry — browser auth SDK moves in from @ghayma/auth`.

---

### Task 4: README and CHANGELOG

**Files:** `README.md` (rewrite), `CHANGELOG.md` (new 1.0.0 section on top).

- [ ] **Step 1: README** structure: title `@ghayma/sdk`; one paragraph: the runtime SDK for apps on Ghayma, two entry points; **Install**; **Server** quick start:
```ts
import { Ghayma } from "@ghayma/sdk";

// In an app connected on Ghayma, GHAYMA_API_KEY is injected: no arguments needed.
const ghayma = new Ghayma();
// Anywhere else, pass a project API key (Project → Settings → API keys):
// const ghayma = new Ghayma({ apiKey: process.env.GHAYMA_API_KEY });

const { users } = await ghayma.auth.listUsers("my-app");
const { url } = await ghayma.storage.getDownloadUrl("bucket-id", "photos/1.jpg");
const conn = await ghayma.database.getConnection("db-id");
```
  **Browser** quick start with `import { GhaymaAuth } from "@ghayma/sdk/client"; const auth = new GhaymaAuth({ appSlug: "my-app" });` and the login/register/getUser/logout lines from the current `@ghayma/auth` README; **What each entry can do** (two short lists, and the sentence that the secret key never ships to a browser); **Keys**: project API key vs account token, the warning; **Migrating from 0.x** table: removed method → where it lives now (console page or `ghayma` CLI command: `ghayma storage create`, `ghayma db create`, dashboard Auth page for app settings and key rotation) and `apiToken` → `apiKey`; **`@ghayma/auth`** is deprecated and re-exports `@ghayma/sdk/client`. Keep the existing storage/auth/database method reference sections for the kept methods only.
- [ ] **Step 2: CHANGELOG** `## 1.0.0` with `### Added` (client entry, `apiKey`, zero-argument init, account-token warning), `### Removed` (the three lists from Task 2 with the console/CLI replacement for each), `### Deprecated` (`apiToken`; `@ghayma/auth` package).
- [ ] **Step 3: Commit** `docs(sdk): 1.0.0 README and changelog`.

## Executor notes
- Never push, never open a PR, never `npm publish`. Stop and report on `no space left on device`.
- If a kept method's type references a removed type, keep the type (report it) rather than widening to `any`.
