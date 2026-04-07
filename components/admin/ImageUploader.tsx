'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Image } from '@/types';

interface FileStatus {
  name: string;
  state: 'uploading' | 'done' | 'error';
  error?: string;
}

interface Props {
  pinId: string;
  token: string;
  onUpload: (image: Image) => void;
}

export default function ImageUploader({ pinId, token, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<FileStatus[]>([]);

  async function resizeIfNeeded(file: File): Promise<Blob> {
    const MAX_PX = 2000;
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const { naturalWidth: w, naturalHeight: h } = img;
        if (w <= MAX_PX && h <= MAX_PX) { resolve(file); return; }
        const scale = MAX_PX / Math.max(w, h);
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

  async function uploadFile(file: File) {
    setQueue((q) => [...q, { name: file.name, state: 'uploading' }]);

    const blob = await resizeIfNeeded(file);
    const formData = new FormData();
    formData.append('file', new File([blob], file.name, { type: blob.type || 'image/jpeg' }));
    formData.append('pin_id', pinId);

    try {
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Upload failed');
      }
      const image: Image = await res.json();
      setQueue((q) =>
        q.map((f) => (f.name === file.name ? { ...f, state: 'done' } : f))
      );
      onUpload(image);
      toast.success('Photo uploaded');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setQueue((q) =>
        q.map((f) => (f.name === file.name ? { ...f, state: 'error', error: message } : f))
      );
      toast.error(message);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Drop zone */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
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
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Per-file status */}
      {queue.length > 0 && (
        <ul className="flex flex-col gap-1">
          {queue.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <span
                className={`
                  w-2 h-2 rounded-full flex-shrink-0
                  ${f.state === 'uploading' ? 'bg-yellow-400 animate-pulse' : ''}
                  ${f.state === 'done' ? 'bg-green-400' : ''}
                  ${f.state === 'error' ? 'bg-red-400' : ''}
                `}
              />
              <span className="truncate text-zinc-600">{f.name}</span>
              {f.state === 'error' && (
                <span className="text-red-400 ml-auto flex-shrink-0">{f.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
