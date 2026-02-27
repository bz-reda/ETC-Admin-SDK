// lib/espace.ts — shared SDK client (server-side only)
import { EspaceTech } from "@espace-tech/sdk";

export const espace = new EspaceTech({
  apiToken: process.env.ESPACE_TECH_TOKEN!,
});
