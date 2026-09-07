// lib/ghayma.ts — shared SDK client (server-side only)
import { Ghayma } from "@ghayma/sdk";

// A connected app has GHAYMA_API_KEY injected, so `new Ghayma()` is enough.
// Elsewhere, pass the project API key from Project → Settings → API keys.
export const ghayma = new Ghayma({
  apiKey: process.env.GHAYMA_API_KEY,
});
