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
