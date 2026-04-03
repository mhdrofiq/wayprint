'use client';

/**
 * PHASE 4 TEST HARNESS — removed in Phase 5 when AdminSheet is built.
 *
 * A floating panel that appears when a pin is selected, allowing image
 * uploads and deletions to verify the full upload-to-burst pipeline.
 */

import { useState } from 'react';
import type { Image, Pin } from '@/types';
import ImageUploader from './ImageUploader';
import { layers } from '@/lib/layers';

interface Props {
  pin: Pin;
  images: Image[];
  onImagesChange: (images: Image[]) => void;
}

export default function UploadTestPanel({ pin, images, onImagesChange }: Props) {
  const [open, setOpen] = useState(false);

  function handleUpload(image: Image) {
    onImagesChange([...images, image]);
  }

  async function handleDelete(imageId: string) {
    await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
    onImagesChange(images.filter((img) => img.id !== imageId));
  }

  return (
    <div
      className="fixed bottom-4 right-4 flex flex-col items-end gap-2"
      style={{ zIndex: layers.LABEL }}
    >
      {open && (
        <div className="w-80 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Phase 4 test</p>
              <p className="text-sm font-medium text-white truncate">{pin.label}</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-400 hover:text-white text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <ImageUploader pinId={pin.id} onUpload={handleUpload} />

          {images.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">
                {images.length} photo{images.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="relative group aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.thumb_url}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="
                        absolute inset-0 flex items-center justify-center
                        bg-black/60 rounded-lg opacity-0 group-hover:opacity-100
                        transition-opacity text-white text-xs
                      "
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-zinc-900 border border-zinc-700 text-white text-sm px-4 py-2 rounded-full shadow-lg hover:bg-zinc-800 transition-colors"
      >
        {open ? 'Close' : '+ Upload photos'}
      </button>
    </div>
  );
}
