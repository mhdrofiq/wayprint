'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Pin, Image, Collection } from '@/types';
import { useDragScroll } from '@/hooks/useDragScroll';
import { adminFetch } from '@/lib/admin-api';
import ImageUploader, { type FileStatus } from './ImageUploader';

// Thumbnail size shared by real rows and upload skeletons.
const THUMB = 'w-24 h-24';

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2.5 4h11M6 4V2.5h4V4M3.5 4l.75 9.5h7.5L12.5 4M6.5 7v4M9.5 7v4" />
  </svg>
);

// ─── ImageRow ─────────────────────────────────────────────────────────────────

interface ImageRowProps {
  image: Image;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onCaptionSave: (caption: string) => void;
  onDeleteReaction: (reactionId: string) => void;
}

function ImageRow({ image, isSelectMode, isSelected, onToggleSelect, onDelete, onCaptionSave, onDeleteReaction }: ImageRowProps) {
  const [caption, setCaption] = useState(image.caption ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canExpand = !isSelectMode;

  return (
    <div
      className={`flex gap-2.5 rounded-lg p-2.5 transition-colors ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-zinc-100'}`}
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

      <div className={`flex-1 min-w-0 ${expanded ? 'flex flex-col gap-2' : 'flex gap-2.5'}`}>
        {/* Thumbnail — click to expand/collapse */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.thumb_url}
          alt=""
          loading="lazy"
          decoding="async"
          onClick={canExpand ? () => setExpanded((e) => !e) : undefined}
          className={
            expanded
              ? 'w-full max-h-72 object-contain rounded-lg cursor-zoom-out bg-black'
              : `${THUMB} object-cover rounded-lg shrink-0 ${canExpand ? 'cursor-zoom-in' : ''}`
          }
        />

        {/* Controls */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0" onClick={(e) => { if (isSelectMode) e.stopPropagation(); }}>
        {/* Caption — fills whatever height the thumbnail leaves; Enter saves, Shift+Enter newline */}
        <textarea
          className="flex-1 min-h-8 resize-none bg-zinc-200 text-zinc-900 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-zinc-400 w-full placeholder:text-zinc-400"
          placeholder="Add caption…"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => onCaptionSave(caption)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.blur(); } }}
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

        <div className="flex items-center justify-end gap-1">
          {confirmDelete ? (
            <>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-300 hover:bg-red-100 hover:border-red-400 hover:text-red-700 px-2 py-1 rounded-md transition-colors"
              title="Delete photo"
              aria-label="Delete photo"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── SkeletonImageRow ─────────────────────────────────────────────────────────

function SkeletonImageRow({ name }: { name: string }) {
  return (
    <div className="flex gap-2.5 bg-zinc-100 rounded-lg p-2.5">
      <div className={`${THUMB} rounded-lg shrink-0 bg-zinc-300 animate-pulse`} />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 justify-center">
        <span className="text-xs text-zinc-400 truncate">{name}</span>
        <div className="h-6 bg-zinc-200 rounded-lg animate-pulse w-3/4" />
      </div>
    </div>
  );
}

// ─── CollectionTabs ───────────────────────────────────────────────────────────

interface CollectionTabsProps {
  collections: Collection[];
  /** null = Uncollected tab */
  activeId: string | null;
  /** Photo count per tab, keyed by collection id ('' for uncollected). */
  counts: Record<string, number>;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => Promise<boolean>;
}

const tabBase = 'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap';
const tabIdle = `${tabBase} bg-zinc-100 text-zinc-600 hover:bg-zinc-200`;
const tabActive = `${tabBase} bg-zinc-800 text-white`;

const Count = ({ n }: { n: number }) => (
  <span className="opacity-60 tabular-nums">{n}</span>
);

function CollectionTabs({ collections, activeId, counts, onSelect, onCreate }: CollectionTabsProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const drag = useDragScroll<HTMLDivElement>();

  async function submit() {
    const name = newName.trim();
    if (!name) { setAdding(false); return; }
    const ok = await onCreate(name);
    if (ok) {
      setNewName('');
      setAdding(false);
    }
  }

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        drag.isDragging ? 'cursor-grabbing **:cursor-grabbing' : 'cursor-grab'
      }`}
      {...drag.handlers}
    >
      <button
        onClick={() => onSelect(null)}
        className={activeId === null ? tabActive : tabIdle}
      >
        Uncollected <Count n={counts[''] ?? 0} />
      </button>
      {collections.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`${activeId === c.id ? tabActive : tabIdle} max-w-40`}
          title={c.name}
        >
          <span className="truncate">{c.name}</span> <Count n={counts[c.id] ?? 0} />
        </button>
      ))}

      {adding ? (
        <div className="shrink-0 flex items-center gap-1">
          <input
            autoFocus
            className="w-32 bg-zinc-100 text-zinc-900 rounded-full px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-zinc-300 placeholder:text-zinc-400"
            placeholder="Collection name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') { setNewName(''); setAdding(false); }
            }}
            onBlur={() => { if (!newName.trim()) setAdding(false); }}
          />
          <button
            onClick={submit}
            disabled={!newName.trim()}
            className={`${tabBase} bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={`${tabIdle} px-2.5`}
          title="New collection"
          aria-label="New collection"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden>
            <path d="M6 1.5v9M1.5 6h9" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── ActiveCollectionBar ──────────────────────────────────────────────────────
// Rename / delete controls for the currently selected (non-default) collection.

interface ActiveCollectionBarProps {
  collection: Collection;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function ActiveCollectionBar({ collection, onRename, onDelete }: ActiveCollectionBarProps) {
  const [name, setName] = useState(collection.name);
  const [confirm, setConfirm] = useState(false);

  function commit() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === collection.name) { setName(collection.name); return; }
    onRename(trimmed);
  }

  return (
    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5">
      <input
        className="flex-1 min-w-0 bg-transparent text-sm text-zinc-800 outline-none focus:bg-white rounded px-1 -mx-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setName(collection.name); e.currentTarget.blur(); } }}
        title="Rename collection"
        aria-label="Collection name"
      />
      {confirm ? (
        <>
          <span className="text-xs text-zinc-500 shrink-0">Photos become uncollected</span>
          <button onClick={() => setConfirm(false)} className="text-xs text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-200 transition-colors">
            Cancel
          </button>
          <button onClick={onDelete} className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors">
            Delete
          </button>
        </>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors shrink-0"
          title="Delete collection"
          aria-label="Delete collection"
        >
          <TrashIcon />
        </button>
      )}
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

  // Active collection tab. Stored as an id so it survives renames; if the
  // collection is deleted the derived value falls back to Uncollected.
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const activeCollection = activeTab ? collections.find((c) => c.id === activeTab) ?? null : null;
  const activeId = activeCollection?.id ?? null;

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [bulkTargetId, setBulkTargetId] = useState<string | 'uncollected'>('uncollected');

  const visibleImages = images.filter((img) => img.collection_id === activeId);
  const visibleQueue = uploadQueue.filter((f) => f.collectionId === activeId);

  const counts: Record<string, number> = {};
  for (const img of images) {
    const key = img.collection_id ?? '';
    counts[key] = (counts[key] ?? 0) + 1;
  }

  // Bulk-move destinations: every tab except the one we're looking at.
  const bulkTargets: Array<{ value: string; label: string }> = [
    ...(activeId !== null ? [{ value: 'uncollected', label: 'Uncollected' }] : []),
    ...collections.filter((c) => c.id !== activeId).map((c) => ({ value: c.id, label: c.name })),
  ];
  const effectiveBulkTarget = bulkTargets.some((t) => t.value === bulkTargetId)
    ? bulkTargetId
    : bulkTargets[0]?.value ?? 'uncollected';

  function selectTab(id: string | null) {
    setActiveTab(id);
    setIsSelectMode(false);
    setSelectedImageIds(new Set());
  }

  async function saveLabel() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === pin.label) {
      setLabel(pin.label);
      return;
    }
    const res = await adminFetch(`/api/pins/${pin.id}`, token, 'PATCH', { label: trimmed });
    if (res.ok) {
      const updated: Pin = await res.json();
      onPinUpdated(updated);
    } else {
      toast.error('Failed to save label');
      setLabel(pin.label);
    }
  }

  async function deletePin() {
    const res = await adminFetch(`/api/pins/${pin.id}`, token, 'DELETE');
    if (res.ok) {
      toast.success('Pin deleted');
      onPinDeleted(pin.id);
    } else {
      toast.error('Failed to delete pin');
      setConfirmDeletePin(false);
    }
  }

  async function deleteReaction(imageId: string, reactionId: string) {
    const res = await adminFetch(`/api/reactions/${reactionId}`, token, 'DELETE');
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
    const res = await adminFetch(`/api/images/${imageId}`, token, 'DELETE');
    if (res.ok) {
      onImagesChange((prev) => prev.filter((img) => img.id !== imageId));
    } else {
      toast.error('Failed to delete photo');
    }
  }

  async function saveCaption(imageId: string, caption: string) {
    const res = await adminFetch(`/api/images/${imageId}`, token, 'PATCH', { caption: caption.trim() || null });
    if (res.ok) {
      onImagesChange((prev) => prev.map((img) => img.id === imageId ? { ...img, caption: caption.trim() || null } : img));
    } else {
      toast.error('Failed to save caption');
    }
  }

  // ── Collections ──────────────────────────────────────────────────────────────

  async function createCollection(name: string): Promise<boolean> {
    const res = await adminFetch(`/api/pins/${pin.id}/collections`, token, 'POST', { name });
    if (res.ok) {
      const created: Collection = await res.json();
      onCollectionsChange((prev) => [...prev, created]);
      selectTab(created.id);
      return true;
    }
    toast.error('Failed to create collection');
    return false;
  }

  async function renameCollection(collectionId: string, name: string) {
    const res = await adminFetch(`/api/collections/${collectionId}`, token, 'PATCH', { name });
    if (res.ok) {
      const updated: Collection = await res.json();
      onCollectionsChange((prev) => prev.map((c) => c.id === collectionId ? updated : c));
    } else {
      toast.error('Failed to rename collection');
    }
  }

  async function deleteCollection(collectionId: string) {
    const res = await adminFetch(`/api/collections/${collectionId}`, token, 'DELETE');
    if (res.ok) {
      onCollectionsChange((prev) => prev.filter((c) => c.id !== collectionId));
      // Images in the deleted collection become uncollected
      onImagesChange((prev) => prev.map((img) => img.collection_id === collectionId ? { ...img, collection_id: null } : img));
      selectTab(null);
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

  function selectAllVisible() {
    setSelectedImageIds(new Set(visibleImages.map((img) => img.id)));
  }

  async function applyBulkMove() {
    const targetId = effectiveBulkTarget === 'uncollected' ? null : effectiveBulkTarget;
    const ids = [...selectedImageIds];

    const results = await Promise.all(
      ids.map((id) =>
        adminFetch(`/api/images/${id}`, token, 'PATCH', { collection_id: targetId }).then((r) => ({ id, ok: r.ok }))
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

  const activeName = activeCollection?.name ?? 'Uncollected';

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Label */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Label</label>
        <input
          className="bg-zinc-100 text-zinc-900 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-zinc-300"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </div>

      {/* Collections as tabs */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">Collections</p>
        <CollectionTabs
          collections={collections}
          activeId={activeId}
          counts={counts}
          onSelect={selectTab}
          onCreate={createCollection}
        />
        {activeCollection && (
          <ActiveCollectionBar
            key={activeCollection.id}
            collection={activeCollection}
            onRename={(name) => renameCollection(activeCollection.id, name)}
            onDelete={() => deleteCollection(activeCollection.id)}
          />
        )}
      </div>

      {/* Photos in the active tab */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide flex-1">
            {visibleImages.length} {visibleImages.length === 1 ? 'photo' : 'photos'}
          </p>
          {isSelectMode && visibleImages.length > 1 && selectedImageIds.size < visibleImages.length && (
            <button
              onClick={selectAllVisible}
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors px-2 py-0.5 rounded-md"
            >
              Select all
            </button>
          )}
          {visibleImages.length > 0 && bulkTargets.length > 0 && (
            <button
              onClick={toggleSelectMode}
              className={`text-xs transition-colors px-2 py-0.5 rounded-md ${isSelectMode ? 'text-blue-500 bg-blue-50' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {isSelectMode ? 'Cancel' : 'Select'}
            </button>
          )}
        </div>

        {visibleImages.length === 0 && visibleQueue.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-6 border border-dashed border-zinc-200 rounded-lg">
            No photos in {activeName}
          </p>
        )}

        {visibleImages.map((img) => (
          <ImageRow
            key={img.id}
            image={img}
            isSelectMode={isSelectMode}
            isSelected={selectedImageIds.has(img.id)}
            onToggleSelect={() => toggleImageSelected(img.id)}
            onDelete={() => deleteImage(img.id)}
            onCaptionSave={(caption) => saveCaption(img.id, caption)}
            onDeleteReaction={(reactionId) => deleteReaction(img.id, reactionId)}
          />
        ))}
        {visibleQueue.map((f) => (
          <SkeletonImageRow key={f.id} name={f.name} />
        ))}

        {/* Bulk action bar */}
        {isSelectMode && selectedImageIds.size > 0 && (
          <div className="sticky bottom-0 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 shadow-sm">
            <span className="text-xs text-blue-600 font-medium shrink-0">
              {selectedImageIds.size} selected
            </span>
            <span className="text-xs text-zinc-400 shrink-0">→</span>
            <select
              className="flex-1 min-w-0 text-xs bg-white border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 outline-none focus:ring-1 focus:ring-blue-300"
              value={effectiveBulkTarget}
              onChange={(e) => setBulkTargetId(e.target.value)}
            >
              {bulkTargets.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
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

      {/* Upload */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-zinc-500 uppercase tracking-wide">
          Add photos to <span className="text-zinc-700 normal-case tracking-normal">{activeName}</span>
        </p>
        <ImageUploader
          pinId={pin.id}
          collectionId={activeId}
          token={token}
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
              className="text-xs text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={deletePin}
              className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors"
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
