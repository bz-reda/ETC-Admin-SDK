// app/api/images/route.ts — returns images with presigned URLs
import { espace } from "@/lib/espace";

const BUCKET_ID = process.env.ESPACE_TECH_BUCKET_ID!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prefix = searchParams.get("prefix") || "images/";

  try {
    const result = await espace.storage.listObjects(BUCKET_ID, { prefix });

    const images = await Promise.all(
      result.objects
        .filter((obj) => !obj.is_folder)
        .map(async (obj) => ({
          key: obj.key,
          name: obj.key.split("/").pop() || obj.key,
          size: obj.size,
          url: (await espace.storage.getDownloadUrl(BUCKET_ID, obj.key)).url,
        }))
    );

    return Response.json({ images });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list images";
    return Response.json({ error: message }, { status: 500 });
  }
}
