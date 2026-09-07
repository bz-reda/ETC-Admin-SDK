// lib/ghayma.ts — shared SDK client (server-side only)
import { Ghayma } from "@ghayma/sdk";

// With GHAYMA_API_KEY in the site's environment variables, `new Ghayma()` is enough.
// Elsewhere, pass the project API key from Project → Settings → API keys.
export const ghayma = new Ghayma({
  apiKey: process.env.GHAYMA_API_KEY,
});
