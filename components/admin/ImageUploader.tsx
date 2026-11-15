'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Image, FreezeWhile } from '@/types';

export interface FileStatus {
  id: string;
  name: string;
  /** Collection the file will land in — drives which tab shows its skeleton row. */
  collectionId: string | null;
}

// How many files upload simultaneously. Keeps bulk drops from firing dozens
// of concurrent requests.
const CONCURRENCY = 4;

// Longest edge sent to the server; larger photos are shrunk in the browser first.
const MAX_UPLOAD_PX = 2000;

/** Downscales `file` to MAX_UPLOAD_PX as a JPEG if it's larger; otherwise
 *  (or if the browser can't decode it) returns the file untouched. */
function resizeIfNeeded(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= MAX_UPLOAD_PX && h <= MAX_UPLOAD_PX) { resolve(file); return; }
      const scale = MAX_UPLOAD_PX / Math.max(w, h);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

interface Props {
  pinId: string;
  /** Collection new uploads are assigned to; null = uncollected. */
  collectionId: string | null;
  token: string;
  setQueue: React.Dispatch<React.SetStateAction<FileStatus[]>>;
  onUpload: (image: Image) => void;
  freezeWhile: FreezeWhile;
}

export default function ImageUploader({ pinId, collectionId, token, setQueue, onUpload, freezeWhile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  /** Uploads one file; resolves true on success. Never rejects. */
  async function uploadFile(file: File): Promise<boolean> {
    const id = crypto.randomUUID();
    setQueue((q) => [...q, { id, name: file.name, collectionId }]);

    try {
      const blob = await resizeIfNeeded(file);
      const formData = new FormData();
      formData.append('file', new File([blob], file.name, { type: blob.type || 'image/jpeg' }));
      formData.append('pin_id', pinId);
      if (collectionId) formData.append('collection_id', collectionId);

      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Upload failed');
      }
      onUpload(await res.json());
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(`${file.name}: ${message}`);
      return false;
    } finally {
      setQueue((q) => q.filter((f) => f.id !== id));
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const total = files.length;

    void freezeWhile(async (setStatus) => {
      let done = 0;
      let failed = 0;
      const report = () =>
        setStatus(`${done}/${total} photos uploaded${failed > 0 ? ` · ${failed} failed` : ''}`);
      report();

      const worker = async () => {
        for (let file = files.shift(); file; file = files.shift()) {
          if (await uploadFile(file)) done += 1; else failed += 1;
          report();
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));

      if (done > 0) toast.success(done === 1 ? 'Photo uploaded' : `${done} photos uploaded`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors select-none
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-zinc-300 hover:border-zinc-500'}
        `}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-zinc-500">
          Drop photos here or <span className="text-zinc-900 underline">browse</span>
        </p>
        <p className="text-xs text-zinc-400 mt-1">JPG, PNG, HEIC · resized automatically if needed</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
