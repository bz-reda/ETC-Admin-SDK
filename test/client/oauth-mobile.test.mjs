import { test, describe } from "node:test";
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

  test("redirect_uri keeps the encodeURIComponent byte-for-byte", () => {
    const url = newClient().getGitHubAuthUrl({ redirectUri: "https://app.test/~me/cb!(1)" });

    assert.equal(
      url,
      `${BASE_URL}/v1/${APP_SLUG}/auth/github?redirect_uri=https%3A%2F%2Fapp.test%2F~me%2Fcb!(1)`
    );
  });

  test("challenge adds the PKCE parameters", () => {
    const url = newClient().getOAuthUrl("github", {
      redirectUri: "com.example.app://callback",
      codeChallenge: CHALLENGE,
    });

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
