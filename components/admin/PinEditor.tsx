'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { Pin, Image } from '@/types';
import ImageUploader from './ImageUploader';

// ─── ImageRow ─────────────────────────────────────────────────────────────────

interface ImageRowProps {
  image: Image;
  token: string;
  onDelete: () => void;
  onCaptionSave: (caption: string) => void;
}

function ImageRow({ image, token: _token, onDelete, onCaptionSave }: ImageRowProps) {
  const [caption, setCaption] = useState(image.caption ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync caption if parent changes the image (e.g. after a save round-trip)
  useEffect(() => {
    setCaption(image.caption ?? '');
  }, [image.caption]);

  return (
    <div className="flex gap-2.5 bg-zinc-100 rounded-xl p-2.5">
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.thumb_url}
        alt=""
        className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
      />

      {/* Controls */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <input
          className="bg-zinc-200 text-zinc-900 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-zinc-400 w-full placeholder:text-zinc-400"
          placeholder="Add caption…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => onCaptionSave(caption)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />

        <div className="flex items-center gap-1">
          <div className="flex-1" />

          {confirmDelete ? (
            <>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-zinc-500 hover:text-zinc-700 px-1.5 py-0.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 transition-colors"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-zinc-400 hover:text-red-500 px-1.5 py-0.5 transition-colors"
              title="Delete photo"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PinEditor ────────────────────────────────────────────────────────────────

interface Props {
  pin: Pin;
  images: Image[];
  token: string;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: (images: Image[]) => void;
}

export default function PinEditor({ pin, images, token, onPinUpdated, onPinDeleted, onImagesChange }: Props) {
  const [label, setLabel] = useState(pin.label);
  const [confirmDeletePin, setConfirmDeletePin] = useState(false);

  // Sync label when the selected pin changes
  useEffect(() => {
    setLabel(pin.label);
    setConfirmDeletePin(false);
  }, [pin.id, pin.label]);

  async function saveLabel() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === pin.label) {
      setLabel(pin.label); // reset if empty
      return;
    }
    const res = await fetch(`/api/pins/${pin.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ label: trimmed }),
    });
    if (res.ok) {
      const updated: Pin = await res.json();
      onPinUpdated(updated);
    } else {
      toast.error('Failed to save label');
      setLabel(pin.label);
    }
  }

  async function deletePin() {
    const res = await fetch(`/api/pins/${pin.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      toast.success('Pin deleted');
      onPinDeleted(pin.id);
    } else {
      toast.error('Failed to delete pin');
      setConfirmDeletePin(false);
    }
  }

  async function deleteImage(imageId: string) {
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onImagesChange(images.filter((img) => img.id !== imageId));
    } else {
      toast.error('Failed to delete photo');
    }
  }

  async function saveCaption(imageId: string, caption: string) {
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ caption: caption.trim() || null }),
    });
    if (res.ok) {
      onImagesChange(
        images.map((img) => img.id === imageId ? { ...img, caption: caption.trim() || null } : img)
      );
    } else {
      toast.error('Failed to save caption');
    }
  }

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Label */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Label</label>
        <input
          className="bg-zinc-100 text-zinc-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-300"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </div>

      {/* Photos */}
      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            {images.length} {images.length === 1 ? 'photo' : 'photos'}
          </p>
          {images.map((img) => (
            <ImageRow
              key={img.id}
              image={img}
              token={token}
              onDelete={() => deleteImage(img.id)}
              onCaptionSave={(caption) => saveCaption(img.id, caption)}
            />
          ))}
        </div>
      )}

      {/* Upload */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Add photos</p>
        <ImageUploader
          pinId={pin.id}
          token={token}
          onUpload={(img) => onImagesChange([...images, img])}
        />
      </div>

      {/* Delete pin */}
      <div className="pt-3 border-t border-zinc-200">
        {confirmDeletePin ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 flex-1">Delete pin and all photos?</span>
            <button
              onClick={() => setConfirmDeletePin(false)}
              className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={deletePin}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeletePin(true)}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Delete pin
          </button>
        )}
      </div>
    </div>
  );
}
