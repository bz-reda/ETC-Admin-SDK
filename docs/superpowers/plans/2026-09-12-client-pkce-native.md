# `@ghayma/sdk` 1.2.0 — PKCE and native sign-in in the client entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let JavaScript apps use the auth service's mobile OAuth pieces that are live since 2026-09-09: the PKCE one-time-code flow (`POST /oauth/exchange`) and native sign-in by provider ID token (`POST /oauth/id-token`), so `@ghayma/sdk/client` stays the reference shape the Dart/Swift/Kotlin clients will mirror.

**Architecture:** Additive methods on `GhaymaAuth` in `src/client/index.ts`, a small WebCrypto PKCE helper module, new types in `src/client/types.ts`, and one optional field on the server-side `AuthApp` type. No behaviour change for existing calls: the OAuth URL helpers only add query parameters when a challenge is given; the default flow of the new `signInWithOAuth` helper stays implicit (fragment) for compatibility. Tests import the built `dist/` like the existing suite and stub `fetch`.

**Tech Stack:** TypeScript, tsup (esm + cjs, dts), `node --test` with the helpers in `test/client/helpers.mjs`, WebCrypto (`globalThis.crypto.subtle`).

**Live contract (authoritative):**
- `GET /v1/{appSlug}/auth/google|github?redirect_uri=…&code_challenge=…&code_challenge_method=S256` → 307. Callback then redirects to `redirect_uri?code=<one-time code>` (query) or `redirect_uri?error=<message>`; without a challenge it keeps `#access_token=…&refresh_token=…&expires_in=…&token_type=Bearer`.
- `POST /v1/{appSlug}/oauth/exchange` `{"code","code_verifier"}` → 200 `{access_token, refresh_token, expires_in, token_type, user}`; 400 `{"error":"invalid or expired code","code":"invalid_grant"}`; 400 `{"error":"code and code_verifier required","code":"invalid_request"}`; 403 `{"error":"Account is disabled"}`; 429.
- `POST /v1/{appSlug}/oauth/id-token` `{"provider":"google","id_token","nonce"?}` → 200 same session body; 401 `{"error":"invalid id token","code":"invalid_token"}`; 400 `{"error":"unsupported provider","code":"invalid_request"}`; 400 `Google sign-in is disabled for this app`; 403 user limit / disabled; 429.
- Verifier: 43–128 chars of `A-Z a-z 0-9 - . _ ~`; challenge = `BASE64URL-nopad(SHA-256(verifier))`. RFC 7636 §B vector: verifier `dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk` → challenge `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`.
- Both endpoints accept the server-key + client-IP header pair like `/login` (the existing `RequestOptions.clientIp` path).

## Global Constraints

- Work only in `/Users/bouzi/Projects/THROCT/worktrees/Admin-SDK/feat-client-pkce-native` (branch `feat/client-pkce-native`).
- No AI attribution anywhere. Minimal clean comments in the file's existing voice.
- No new runtime dependencies. The client entry must stay browser-safe: no `node:` imports. PKCE uses `globalThis.crypto`; when it is absent throw `new Error("PKCE needs WebCrypto (a browser, or Node 19+)")`.
- Public API names are fixed (they are the shape the other language SDKs mirror): `generatePkce`, `pkceChallenge`, `getOAuthUrl`, `signInWithOAuth`, `exchangeCodeForSession`, `signInWithIdToken`, `handleOAuthRedirect`, `PKCE_STORAGE_KEY = "ghayma_pkce_verifier"`.
- `npm test` (contract typecheck + build + node tests) must pass; `npm run typecheck` clean.
- Commit after every task. Do not push, do not publish.

---

### Task 1: PKCE helper module

**Files:**
- Create: `src/client/pkce.ts`
- Modify: `src/client/index.ts` (re-export)
- Test: `test/client/pkce.test.mjs`

**Interfaces:**
- `export interface PkcePair { codeVerifier: string; codeChallenge: string }`
- `export async function generatePkce(): Promise<PkcePair>` — 32 random bytes → base64url (43 chars) verifier.
- `export async function pkceChallenge(codeVerifier: string): Promise<string>` — S256, base64url without padding.
- `export const PKCE_STORAGE_KEY = "ghayma_pkce_verifier"`.

- [ ] **Step 1: Failing test**

```js
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generatePkce, pkceChallenge } from "../../dist/client/index.js";

describe("PKCE helpers", () => {
  test("challenge matches the RFC 7636 vector", async () => {
    assert.equal(
      await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
  });
  test("generatePkce yields a 43-char unreserved verifier and its challenge", async () => {
    const { codeVerifier, codeChallenge } = await generatePkce();
    assert.match(codeVerifier, /^[A-Za-z0-9._~-]{43}$/);
    assert.equal(codeChallenge, await pkceChallenge(codeVerifier));
    const again = await generatePkce();
    assert.notEqual(again.codeVerifier, codeVerifier);
  });
});
```

- [ ] **Step 2: Run** `npm run build && node --test test/client/pkce.test.mjs` → FAIL (no export).

- [ ] **Step 3: Implement**

```ts
export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
}

/** sessionStorage key `signInWithOAuth` parks the verifier under between redirects. */
export const PKCE_STORAGE_KEY = "ghayma_pkce_verifier";

function webCrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error("PKCE needs WebCrypto (a browser, or Node 19+)");
  }
  return c;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** S256 challenge for a verifier, per RFC 7636 §4.2. */
export async function pkceChallenge(codeVerifier: string): Promise<string> {
  const digest = await webCrypto().subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return base64url(new Uint8Array(digest));
}

/** A fresh verifier (32 random bytes, 43 chars) and its challenge. */
export async function generatePkce(): Promise<PkcePair> {
  const bytes = new Uint8Array(32);
  webCrypto().getRandomValues(bytes);
  const codeVerifier = base64url(bytes);
  return { codeVerifier, codeChallenge: await pkceChallenge(codeVerifier) };
}
```

In `src/client/index.ts` add `export { generatePkce, pkceChallenge, PKCE_STORAGE_KEY } from "./pkce.js"; export type { PkcePair } from "./pkce.js";`.

- [ ] **Step 4: Run** the test → PASS. `npm run typecheck` clean.
- [ ] **Step 5: Commit** `feat(client): PKCE helpers`

---

### Task 2: Types

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/auth/types.ts` (`AuthApp` gains `google_native_client_ids?: string[]` next to `google_client_id`)
- Modify: `test/types.contract.ts` (add `google_native_client_ids: []` to the `authApp` literal — the backend sends the field since 2026-09-09)

Add to `src/client/types.ts`:

```ts
export type OAuthProvider = "google" | "github";

export interface OAuthRedirectParams {
  redirectUri: string;
  /** S256 challenge from `generatePkce()`; switches the callback to `?code=`. */
  codeChallenge?: string;
}

export type OAuthFlow = "implicit" | "pkce";

export interface SignInWithOAuthParams {
  redirectUri: string;
  /** `implicit` (default, tokens in the URL fragment) or `pkce` (one-time code, recommended). */
  flow?: OAuthFlow;
}

export interface ExchangeCodeParams {
  code: string;
  codeVerifier: string;
}

export interface IdTokenParams {
  provider: "google";
  idToken: string;
  nonce?: string;
}
```

Export the new types from `src/client/index.ts`. Update the `AuthError.code` doc comment: also `invalid_request`, `invalid_grant`, `invalid_token`, and the client-side `oauth_error` (Task 4).

- [ ] Run `npm run typecheck && npm run typecheck:contract` → clean. Commit `feat(client): types for PKCE and native sign-in`.

---

### Task 3: `getOAuthUrl`, `exchangeCodeForSession`, `signInWithIdToken`

**Files:**
- Modify: `src/client/index.ts` (OAuth section, ~L355–370)
- Test: `test/client/oauth-mobile.test.mjs`

- [ ] **Step 1: Failing tests**

```js
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { GhaymaAuth, AuthError } from "../../dist/client/index.js";
import { APP_SLUG, BASE_URL, sessionResponse, stubFetch } from "./helpers.mjs";

const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

function newClient(config = {}) {
  return new GhaymaAuth({ appSlug: APP_SLUG, baseUrl: BASE_URL, autoRefresh: false, ...config });
}

describe("OAuth URLs", () => {
  test("no challenge → unchanged URL", () => {
    const url = newClient().getGoogleAuthUrl({ redirectUri: "https://app.test/cb" });
    assert.equal(url, `${BASE_URL}/v1/${APP_SLUG}/auth/google?redirect_uri=https%3A%2F%2Fapp.test%2Fcb`);
  });
  test("challenge adds the PKCE parameters", () => {
    const url = newClient().getOAuthUrl("github", { redirectUri: "com.example.app://callback", codeChallenge: CHALLENGE });
    const u = new URL(url);
    assert.equal(u.pathname, `/v1/${APP_SLUG}/auth/github`);
    assert.equal(u.searchParams.get("redirect_uri"), "com.example.app://callback");
    assert.equal(u.searchParams.get("code_challenge"), CHALLENGE);
    assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  });
});

describe("exchangeCodeForSession", () => {
  test("posts code + verifier, stores the session, emits SIGNED_IN", async () => {
    const calls = stubFetch({ "/oauth/exchange": sessionResponse("access-x") });
    const auth = newClient();
    const events = [];
    auth.onAuthStateChange((e) => events.push(e));
    const session = await auth.exchangeCodeForSession({ code: "c1", codeVerifier: VERIFIER });
    assert.equal(calls[0].method, "POST");
    assert.deepEqual(calls[0].body, { code: "c1", code_verifier: VERIFIER });
    assert.equal(session.access_token, "access-x");
    assert.equal(auth.getAccessToken(), "access-x");
    assert.deepEqual(events, ["SIGNED_IN"]);
  });
  test("invalid_grant surfaces as AuthError with the server code", async () => {
    stubFetch({ "/oauth/exchange": { status: 400, error: "invalid or expired code", code: "invalid_grant" } });
    await assert.rejects(
      newClient().exchangeCodeForSession({ code: "bad", codeVerifier: VERIFIER }),
      (err) => err instanceof AuthError && err.status === 400 && err.code === "invalid_grant"
    );
  });
});

describe("signInWithIdToken", () => {
  test("posts provider, id_token and nonce; stores the session", async () => {
    const calls = stubFetch({ "/oauth/id-token": sessionResponse("access-n") });
    const auth = newClient();
    await auth.signInWithIdToken({ provider: "google", idToken: "eyJ.x.y", nonce: "n1" });
    assert.deepEqual(calls[0].body, { provider: "google", id_token: "eyJ.x.y", nonce: "n1" });
    assert.equal(auth.getAccessToken(), "access-n");
  });
  test("omits nonce when not given", async () => {
    const calls = stubFetch({ "/oauth/id-token": sessionResponse() });
    await newClient().signInWithIdToken({ provider: "google", idToken: "eyJ.x.y" });
    assert.equal("nonce" in calls[0].body, false);
  });
});
```

- [ ] **Step 2: Run** → FAIL (methods missing).

- [ ] **Step 3: Implement** in the OAuth section:

```ts
  /** Provider sign-in URL. With `codeChallenge` the callback returns a one-time `?code=` instead of tokens. */
  getOAuthUrl(provider: OAuthProvider, params: OAuthRedirectParams): string {
    const q = new URLSearchParams({ redirect_uri: params.redirectUri });
    if (params.codeChallenge) {
      q.set("code_challenge", params.codeChallenge);
      q.set("code_challenge_method", "S256");
    }
    return `${this.baseUrl}/v1/${this.appSlug}/auth/${provider}?${q.toString()}`;
  }

  /** Get the Google OAuth redirect URL */
  getGoogleAuthUrl(params: OAuthRedirectParams): string {
    return this.getOAuthUrl("google", params);
  }

  /** Get the GitHub OAuth redirect URL */
  getGitHubAuthUrl(params: OAuthRedirectParams): string {
    return this.getOAuthUrl("github", params);
  }

  /** Trade the one-time code from a PKCE redirect for a session. */
  async exchangeCodeForSession(params: ExchangeCodeParams, options?: RequestOptions): Promise<Session> {
    const data = await this.http.post<Session>(
      "/oauth/exchange",
      { code: params.code, code_verifier: params.codeVerifier },
      false,
      options
    );
    this.setSession(data, "SIGNED_IN");
    return data;
  }

  /** Sign in with a provider ID token obtained natively (Google Sign-In SDK). */
  async signInWithIdToken(params: IdTokenParams, options?: RequestOptions): Promise<Session> {
    const body: Record<string, string> = { provider: params.provider, id_token: params.idToken };
    if (params.nonce) body.nonce = params.nonce;
    const data = await this.http.post<Session>("/oauth/id-token", body, false, options);
    this.setSession(data, "SIGNED_IN");
    return data;
  }
```
Keep the first test's exact URL: `URLSearchParams` encodes `https://app.test/cb` as `https%3A%2F%2Fapp.test%2Fcb`, identical to today's `encodeURIComponent` output for that input (verify with the test; if the old helper's encoding differs for some input, keep `encodeURIComponent` for `redirect_uri` and append the PKCE params by hand).

- [ ] **Step 4: Run** `npm test` → PASS. Commit `feat(client): getOAuthUrl, exchangeCodeForSession, signInWithIdToken`.

---

### Task 4: `signInWithOAuth` and `handleOAuthRedirect` (browser helpers)

**Files:**
- Modify: `src/client/index.ts`
- Test: `test/client/oauth-mobile.test.mjs` (extend)

Behaviour:
- `signInWithOAuth(provider, { redirectUri, flow = "implicit" })`: needs `globalThis.location`; otherwise throw `new Error("signInWithOAuth needs a browser; use getOAuthUrl on the server")`. For `pkce`: `const { codeVerifier, codeChallenge } = await generatePkce()`, `globalThis.sessionStorage?.setItem(PKCE_STORAGE_KEY, codeVerifier)` (throw a clear error if `sessionStorage` is unavailable), build the URL with the challenge, `globalThis.location.assign(url)`. For `implicit`: build the URL without a challenge and assign. Returns the URL (`Promise<string>`).
- `handleOAuthRedirect(): Promise<boolean>`: no `location` → `false`. Parse `location.search`: if `error` → throw `new AuthError(error, 400, "oauth_error")`; if `code` → verifier from `sessionStorage` (missing → throw `new AuthError("missing PKCE verifier for this redirect", 400, "invalid_grant")`), `await this.exchangeCodeForSession({ code, codeVerifier })`, remove the verifier, strip `code` from the URL with `history.replaceState` (keep other params), return `true`. Otherwise return `this.handleOAuthFragment()`.

- [ ] **Step 1: Failing tests** (simulate the browser: set `globalThis.location = { search: "?code=c1&x=1", hash: "", pathname: "/cb", assign(url) { this.assigned = url } }`, `globalThis.sessionStorage` as a Map-backed `{ getItem, setItem, removeItem }`, `globalThis.history = { replaceState(_s, _t, url) { this.url = url } }`; delete them in `afterEach`):
  - pkce `signInWithOAuth` stores a verifier and assigns a URL whose `code_challenge` equals `pkceChallenge(storedVerifier)`;
  - implicit `signInWithOAuth` assigns a URL without `code_challenge` and stores nothing;
  - `handleOAuthRedirect` with `?code=` posts the stored verifier, returns `true`, removes the verifier, and `history.url` no longer contains `code=` but keeps `x=1`;
  - `?error=denied` → rejects with `AuthError` code `oauth_error`;
  - `?code=` with no stored verifier → rejects with code `invalid_grant`, no request made;
  - no query but `#access_token=…&refresh_token=…&expires_in=900` → `true` via the fragment path;
  - no `location` → `false`.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** as specified. **Step 4: Run** `npm test` → PASS. Commit `feat(client): signInWithOAuth and handleOAuthRedirect`.

---

### Task 5: README, CHANGELOG, version

**Files:**
- Modify: `README.md` (Browser section + a new `### OAuth in the browser and on mobile` subsection under it; `## Configuration` unchanged)
- Modify: `CHANGELOG.md` (new `## 1.2.0` at the top, sections Added / Notes)
- Modify: `package.json` (`"version": "1.2.0"`)

README subsection content (adapt to the file's voice, keep it short):

```ts
// Recommended: one-time code (PKCE). Tokens never appear in the URL.
await auth.signInWithOAuth("google", { redirectUri: "https://myapp.com/auth/callback", flow: "pkce" });

// On the callback page — handles ?code= (PKCE) and the legacy #access_token= fragment
if (await auth.handleOAuthRedirect()) {
  const me = await auth.getUser();
}

// Native sign-in (React Native, Capacitor): post the Google ID token the device obtained
await auth.signInWithIdToken({ provider: "google", idToken });
```
Plus two sentences: mobile deep links (`com.example.app://callback`) are listed exactly in the app's Allowed Origins; on the server use `generatePkce()` + `getOAuthUrl()` + `exchangeCodeForSession()` directly. Link to `https://docs.ghayma.cloud/guides/oauth-mobile`.

CHANGELOG 1.2.0 — Added: `generatePkce`/`pkceChallenge`, `getOAuthUrl` (existing helpers accept `codeChallenge`), `signInWithOAuth`, `handleOAuthRedirect`, `exchangeCodeForSession`, `signInWithIdToken`, `AuthApp.google_native_client_ids`. Notes: default flow stays implicit; `handleOAuthFragment` unchanged; PKCE needs WebCrypto (browser or Node 19+).

- [ ] Run `npm test` → PASS. Commit `docs: 1.2.0 — PKCE and native sign-in`.

---

### Task 6: Final check

- [ ] `npm run typecheck && npm test` → clean and green. `git status` clean apart from `.superpowers/`.
- [ ] Write `.superpowers/pr-body.md` (untracked): what was added, the live endpoints it targets, compatibility notes, and "publish 1.2.0 after merge (Reda, OTP)". No attribution. Do not push.
