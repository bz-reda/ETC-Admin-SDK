// lib/ghayma.ts — shared SDK client (server-side only)
import { Ghayma } from "@ghayma/sdk";

export const ghayma = new Ghayma({
  apiToken: process.env.GHAYMA_TOKEN!,
});
