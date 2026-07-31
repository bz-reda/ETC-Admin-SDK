# Examples

## Next.js Image Gallery

A complete example showing how to display images from Ghayma Storage in a Next.js app.

### Files

| File | Description |
|------|-------------|
| `lib-ghayma.ts` | Shared SDK client (`lib/ghayma.ts`) |
| `api-images-route.ts` | API route that lists images with presigned URLs (`app/api/images/route.ts`) |
| `ImageGallery.tsx` | Client component with grid + lightbox (`components/ImageGallery.tsx`) |
| `page-usage.tsx` | Page that uses the gallery (`app/gallery/page.tsx`) |
| `next-config.ts` | Next.js config for S3 image domains (`next.config.ts`) |
| `.env.example` | Required environment variables |

### Setup

1. Install the SDK:
   ```bash
   npm install github:bz-reda/Ghayma-Admin-SDK
   ```

2. Add environment variables to `.env.local`:
   ```
   GHAYMA_TOKEN=gh_your_api_token
   GHAYMA_BUCKET_ID=your_bucket_id
   ```

3. Add `s3.ghayma.tech` to `next.config.ts` image domains (see `next-config.ts`)

4. Copy the files to your project at the paths shown in the table above.

### How it works

1. **API route** calls `listObjects()` then `getDownloadUrl()` for each image
2. Presigned URLs point to `https://s3.ghayma.tech/...` — browsers access them directly
3. **No proxy route needed** — images load straight from S3
4. URLs expire after 1 hour by default
