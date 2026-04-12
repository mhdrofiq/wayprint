'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import type { Pin, Image, Collection } from '@/types';
import ImageUploader, { type FileStatus } from './ImageUploader';

// ─── ImageRow ─────────────────────────────────────────────────────────────────

interface ImageRowProps {
  image: Image;
  collections: Collection[];
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onCaptionSave: (caption: string) => void;
  onCollectionChange: (collectionId: string | null) => void;
  onDeleteReaction: (reactionId: string) => void;
}

function ImageRow({ image, collections, isSelectMode, isSelected, onToggleSelect, onDelete, onCaptionSave, onCollectionChange, onDeleteReaction }: ImageRowProps) {
  const [caption, setCaption] = useState(image.caption ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentCollection = collections.find((c) => c.id === image.collection_id);

  return (
    <div
      className={`flex gap-2.5 rounded-xl p-2.5 transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-zinc-100'}`}
      onClick={isSelectMode ? onToggleSelect : undefined}
      style={isSelectMode ? { cursor: 'pointer' } : undefined}
    >
      {/* Select checkbox */}
      {isSelectMode && (
        <div className="flex items-center shrink-0">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-400 bg-white'}`}>
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.thumb_url}
        alt=""
        className="w-14 h-14 object-cover rounded-lg shrink-0"
      />

      {/* Controls */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0" onClick={(e) => { if (isSelectMode) e.stopPropagation(); }}>
        <input
          className="bg-zinc-200 text-zinc-900 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-zinc-400 w-full placeholder:text-zinc-400"
          placeholder="Add caption…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => onCaptionSave(caption)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />

        {/* Reactions */}
        {(image.reactions ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(image.reactions ?? []).map((r) => (
              <button
                key={r.id}
                className="text-lg leading-none hover:opacity-50 transition-opacity"
                title="Remove reaction"
                onClick={() => onDeleteReaction(r.id)}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Collection badge / picker */}
          {collections.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <button
                className="text-xs px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-500 hover:bg-zinc-300 transition-colors truncate max-w-28"
                onClick={() => setCollectionOpen((o) => !o)}
                title="Assign collection"
              >
                {currentCollection ? currentCollection.name : 'Uncollected'}
              </button>
              {collectionOpen && (
                <div className="absolute bottom-full mb-1 left-0 bg-white rounded-xl shadow-lg py-1 min-w-36 z-50 overflow-hidden border border-zinc-100">
                  <button
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${image.collection_id === null ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-500 hover:bg-zinc-50'}`}
                    onClick={() => { onCollectionChange(null); setCollectionOpen(false); }}
                  >
                    Uncollected
                  </button>
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${image.collection_id === c.id ? 'text-zinc-900 font-medium bg-zinc-100' : 'text-zinc-500 hover:bg-zinc-50'}`}
                      onClick={() => { onCollectionChange(c.id); setCollectionOpen(false); }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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

// ─── SkeletonImageRow ─────────────────────────────────────────────────────────

function SkeletonImageRow({ name }: { name: string }) {
  return (
    <div className="flex gap-2.5 bg-zinc-100 rounded-xl p-2.5">
      <div className="w-14 h-14 rounded-lg shrink-0 bg-zinc-300 animate-pulse" />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 justify-center">
        <span className="text-xs text-zinc-400 truncate">{name}</span>
        <div className="h-6 bg-zinc-200 rounded-lg animate-pulse w-3/4" />
      </div>
    </div>
  );
}

// ─── PinEditor ────────────────────────────────────────────────────────────────

interface Props {
  pin: Pin;
  images: Image[];
  collections: Collection[];
  token: string;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: (updater: Image[] | ((prev: Image[]) => Image[])) => void;
  onCollectionsChange: (updater: Collection[] | ((prev: Collection[]) => Collection[])) => void;
}

export default function PinEditor({ pin, images, collections, token, onPinUpdated, onPinDeleted, onImagesChange, onCollectionsChange }: Props) {
  const [label, setLabel] = useState(pin.label);
  const [confirmDeletePin, setConfirmDeletePin] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileStatus[]>([]);

  // Collections management
  const [newCollectionName, setNewCollectionName] = useState('');
  const [confirmDeleteCollectionId, setConfirmDeleteCollectionId] = useState<string | null>(null);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [bulkTargetCollectionId, setBulkTargetCollectionId] = useState<string | 'uncollected'>('uncollected');

  async function saveLabel() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === pin.label) {
      setLabel(pin.label);
      return;
    }
    const res = await fetch(`/api/pins/${pin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  async function deleteReaction(imageId: string, reactionId: string) {
    const res = await fetch(`/api/reactions/${reactionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onImagesChange((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, reactions: (img.reactions ?? []).filter((r) => r.id !== reactionId) }
            : img
        )
      );
    } else {
      toast.error('Failed to remove reaction');
    }
  }

  async function deleteImage(imageId: string) {
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onImagesChange((prev) => prev.filter((img) => img.id !== imageId));
    } else {
      toast.error('Failed to delete photo');
    }
  }

  async function saveCaption(imageId: string, caption: string) {
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ caption: caption.trim() || null }),
    });
    if (res.ok) {
      onImagesChange((prev) => prev.map((img) => img.id === imageId ? { ...img, caption: caption.trim() || null } : img));
    } else {
      toast.error('Failed to save caption');
    }
  }

  async function assignCollection(imageId: string, collectionId: string | null) {
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ collection_id: collectionId }),
    });
    if (res.ok) {
      onImagesChange((prev) => prev.map((img) => img.id === imageId ? { ...img, collection_id: collectionId } : img));
    } else {
      toast.error('Failed to assign collection');
    }
  }

  // ── Collections ──────────────────────────────────────────────────────────────

  async function createCollection() {
    const name = newCollectionName.trim();
    if (!name) return;
    const res = await fetch(`/api/pins/${pin.id}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const created: Collection = await res.json();
      onCollectionsChange((prev) => [...prev, created]);
      setNewCollectionName('');
    } else {
      toast.error('Failed to create collection');
    }
  }

  async function deleteCollection(collectionId: string) {
    const res = await fetch(`/api/collections/${collectionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      onCollectionsChange((prev) => prev.filter((c) => c.id !== collectionId));
      // Images in the deleted collection become uncollected
      onImagesChange((prev) => prev.map((img) => img.collection_id === collectionId ? { ...img, collection_id: null } : img));
      setConfirmDeleteCollectionId(null);
    } else {
      toast.error('Failed to delete collection');
    }
  }

  // ── Multi-select ──────────────────────────────────────────────────────────────

  function toggleSelectMode() {
    setIsSelectMode((v) => !v);
    setSelectedImageIds(new Set());
  }

  function toggleImageSelected(id: string) {
    setSelectedImageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function applyBulkMove() {
    const targetId = bulkTargetCollectionId === 'uncollected' ? null : bulkTargetCollectionId;
    const ids = [...selectedImageIds];

    const results = await Promise.all(
      ids.map((id) =>
        fetch(`/api/images/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ collection_id: targetId }),
        }).then((r) => ({ id, ok: r.ok }))
      )
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      toast.error(`Failed to move ${failed.length} photo${failed.length > 1 ? 's' : ''}`);
    }

    const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    onImagesChange((prev) =>
      prev.map((img) => succeededIds.has(img.id) ? { ...img, collection_id: targetId } : img)
    );

    setSelectedImageIds(new Set());
    setIsSelectMode(false);
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

      {/* Collections */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Collections</p>

        {collections.length > 0 && (
          <div className="flex flex-col gap-1">
            {collections.map((c) => (
              <div key={c.id} className="flex items-center gap-2 bg-zinc-100 rounded-xl px-3 py-2">
                <span className="text-sm text-zinc-700 flex-1 truncate">{c.name}</span>
                {confirmDeleteCollectionId === c.id ? (
                  <>
                    <button
                      onClick={() => setConfirmDeleteCollectionId(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteCollection(c.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteCollectionId(c.id)}
                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                    title="Delete collection"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1.5">
          <input
            className="flex-1 bg-zinc-100 text-zinc-900 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400"
            placeholder="New collection name…"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createCollection(); }}
          />
          <button
            onClick={createCollection}
            disabled={!newCollectionName.trim()}
            className="bg-zinc-800 text-white rounded-xl px-3 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Photos */}
      {(images.length > 0 || uploadQueue.length > 0) && (
        <div className="flex flex-col gap-2">
          {/* Photos header with select toggle */}
          <div className="flex items-center">
            <p className="text-xs text-zinc-500 uppercase tracking-wide flex-1">
              {images.length} {images.length === 1 ? 'photo' : 'photos'}
            </p>
            {images.length > 0 && collections.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className={`text-xs transition-colors px-2 py-0.5 rounded-md ${isSelectMode ? 'text-blue-500 bg-blue-50' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                {isSelectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>

          {images.map((img) => (
            <ImageRow
              key={img.id}
              image={img}
              collections={collections}
              isSelectMode={isSelectMode}
              isSelected={selectedImageIds.has(img.id)}
              onToggleSelect={() => toggleImageSelected(img.id)}
              onDelete={() => deleteImage(img.id)}
              onCaptionSave={(caption) => saveCaption(img.id, caption)}
              onCollectionChange={(id) => assignCollection(img.id, id)}
              onDeleteReaction={(reactionId) => deleteReaction(img.id, reactionId)}
            />
          ))}
          {uploadQueue.map((f) => (
            <SkeletonImageRow key={f.id} name={f.name} />
          ))}

          {/* Bulk action bar */}
          {isSelectMode && selectedImageIds.size > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
              <span className="text-xs text-blue-600 font-medium shrink-0">
                {selectedImageIds.size} selected
              </span>
              <span className="text-xs text-zinc-400 shrink-0">→</span>
              <select
                className="flex-1 min-w-0 text-xs bg-white border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 outline-none focus:ring-1 focus:ring-blue-300"
                value={bulkTargetCollectionId}
                onChange={(e) => setBulkTargetCollectionId(e.target.value)}
              >
                <option value="uncollected">Uncollected</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={applyBulkMove}
                className="bg-blue-500 text-white rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-blue-600 transition-colors shrink-0"
              >
                Move
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Add photos</p>
        <ImageUploader
          pinId={pin.id}
          token={token}
          queue={uploadQueue}
          setQueue={setUploadQueue}
          onUpload={(img) => onImagesChange((prev) => [...prev, img])}
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
