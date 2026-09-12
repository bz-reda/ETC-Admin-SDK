// PKCE (RFC 7636) for the one-time-code OAuth flow. Browser-safe: WebCrypto
// only, no node: imports.

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
