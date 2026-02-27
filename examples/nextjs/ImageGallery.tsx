// components/ImageGallery.tsx — displays images from Espace-Tech Storage
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface StorageImage {
  key: string;
  name: string;
  size: number;
  url: string;
}

export function ImageGallery({ prefix = "images/" }: { prefix?: string }) {
  const [images, setImages] = useState<StorageImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StorageImage | null>(null);

  useEffect(() => {
    fetch(`/api/images?prefix=${encodeURIComponent(prefix)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setImages(data.images);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [prefix]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (images.length === 0) {
    return <p className="text-gray-500">No images found.</p>;
  }

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <button
            key={img.key}
            onClick={() => setSelected(img)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all"
          >
            <Image
              src={img.url}
              alt={img.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs truncate">{img.name}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selected.url}
              alt={selected.name}
              width={1200}
              height={800}
              className="object-contain w-full h-full max-h-[80vh] rounded-lg"
            />
            <div className="mt-3 flex items-center justify-between text-white">
              <p className="text-sm">{selected.name}</p>
              <button
                onClick={() => setSelected(null)}
                className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
