'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Image } from '@/types';

export interface FileStatus {
  id: string;
  name: string;
  /** Collection the file will land in — drives which tab shows its skeleton row. */
  collectionId: string | null;
}

/** Running totals for the current upload batch. `total` grows if more files
 *  are dropped while a batch is still in flight; resets once everything settles. */
interface Batch {
  total: number;
  done: number;
  failed: number;
}

// How many files upload simultaneously. Keeps bulk drops from firing dozens
// of concurrent requests (and makes the progress bar advance steadily).
const CONCURRENCY = 4;
// How long the completed bar lingers before disappearing.
const SETTLE_MS = 1500;

interface Props {
  pinId: string;
  /** Collection new uploads are assigned to; null = uncollected. */
  collectionId: string | null;
  token: string;
  setQueue: React.Dispatch<React.SetStateAction<FileStatus[]>>;
  onUpload: (image: Image) => void;
}

export default function ImageUploader({ pinId, collectionId, token, setQueue, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [batch, setBatch] = useState<Batch | null>(null);

  // Mutable mirror of `batch` so async upload callbacks always see the latest
  // totals without stale-closure issues.
  const batchRef = useRef<Batch | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Simple work queue for bounded concurrency.
  const pending = useRef<Array<() => Promise<void>>>([]);
  const active = useRef(0);

  async function resizeIfNeeded(file: File): Promise<Blob> {
    const MAX_PX = 2000;
    return new Promise((resolve) => {
      const img = new window.Image();
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

  function updateBatch(patch: (b: Batch) => Batch) {
    const next = patch(batchRef.current ?? { total: 0, done: 0, failed: 0 });
    batchRef.current = next;
    setBatch(next);
  }

  function settleIfFinished() {
    const b = batchRef.current;
    if (!b || b.done + b.failed < b.total) return;

    if (b.done > 0) {
      toast.success(b.done === 1 ? 'Photo uploaded' : `${b.done} photos uploaded`);
    }
    settleTimer.current = setTimeout(() => {
      batchRef.current = null;
      setBatch(null);
    }, SETTLE_MS);
  }

  async function uploadFile(file: File, targetCollectionId: string | null) {
    const id = crypto.randomUUID();
    setQueue((q) => [...q, { id, name: file.name, collectionId: targetCollectionId }]);

    const blob = await resizeIfNeeded(file);
    const formData = new FormData();
    formData.append('file', new File([blob], file.name, { type: blob.type || 'image/jpeg' }));
    formData.append('pin_id', pinId);
    if (targetCollectionId) formData.append('collection_id', targetCollectionId);

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
      setQueue((q) => q.filter((f) => f.id !== id));
      onUpload(image);
      updateBatch((b) => ({ ...b, done: b.done + 1 }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setQueue((q) => q.filter((f) => f.id !== id));
      updateBatch((b) => ({ ...b, failed: b.failed + 1 }));
      toast.error(`${file.name}: ${message}`);
    } finally {
      settleIfFinished();
    }
  }

  function pump() {
    while (active.current < CONCURRENCY && pending.current.length > 0) {
      const job = pending.current.shift()!;
      active.current += 1;
      job().finally(() => {
        active.current -= 1;
        pump();
      });
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Dropping more files while a finished bar is fading out: cancel the fade
    // and keep counting in the same batch.
    if (settleTimer.current) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    updateBatch((b) => ({ ...b, total: b.total + files.length }));

    // Snapshot the target collection at drop time so switching tabs mid-upload
    // doesn't reassign files already queued.
    const target = collectionId;
    Array.from(files).forEach((file) => {
      pending.current.push(() => uploadFile(file, target));
    });
    pump();
  }

  const finished = batch ? batch.done + batch.failed : 0;
  const pct = batch && batch.total > 0 ? Math.round((finished / batch.total) * 100) : 0;
  const uploading = batch !== null && finished < batch.total;

  return (
    <div className="flex flex-col gap-3">
      {/* Batch progress */}
      {batch && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className={uploading ? 'text-zinc-600' : 'text-emerald-600'}>
              {uploading ? 'Uploading…' : 'Done'}
            </span>
            <span className="text-zinc-500 tabular-nums">
              {finished} / {batch.total}
              {batch.failed > 0 && <span className="text-red-500"> · {batch.failed} failed</span>}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${uploading ? 'bg-blue-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

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
