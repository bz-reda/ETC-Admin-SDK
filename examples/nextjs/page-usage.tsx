// app/gallery/page.tsx — usage example
import { ImageGallery } from "@/components/ImageGallery";

export default function GalleryPage() {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Image Gallery</h1>
      <ImageGallery prefix="images/" />
    </main>
  );
}
