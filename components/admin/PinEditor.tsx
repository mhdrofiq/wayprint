'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Pin, Image, Collection, Updater, FreezeWhile } from '@/types';
import { useDragScroll } from '@/hooks/useDragScroll';
import { adminFetch } from '@/lib/admin-api';
import { withoutReaction } from '@/lib/reactions';
import { countLabel } from '@/lib/utils';
import ImageUploader, { type FileStatus } from './ImageUploader';
import { cell, cellAccent, cellDanger, cellDangerSolid, cellOn, field, placeholderBox, sectionLabel } from './tui';

// Thumbnail size shared by real rows and upload skeletons.
const THUMB = 'w-24 h-24';
// Matches the API's cap, so what's typed is what gets stored.
const MAX_CAPTION_LENGTH = 300;

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2.5 4h11M6 4V2.5h4V4M3.5 4l.75 9.5h7.5L12.5 4M6.5 7v4M9.5 7v4" />
  </svg>
);

/** Cancel / red Delete pair shown after a first click on a delete control. */
function ConfirmDeleteButtons({ onCancel, onConfirm, label = 'Delete' }: { onCancel: () => void; onConfirm: () => void; label?: string }) {
  return (
    <>
      <button onClick={onCancel} className={cell}>
        Cancel
      </button>
      <button onClick={onConfirm} className={cellDangerSolid}>
        {label}
      </button>
    </>
  );
}

// ─── ImageRow ─────────────────────────────────────────────────────────────────

interface ImageRowProps {
  image: Image;
  /** The caption as currently typed (the saved one until edited). */
  caption: string;
  /** `caption` differs from what's saved, so Update has something to send. */
  edited: boolean;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onCaptionChange: (caption: string) => void;
  onCaptionSave: () => void;
  onDeleteReaction: (reactionId: string) => void;
}

function ImageRow({ image, caption, edited, isSelectMode, isSelected, onToggleSelect, onDelete, onCaptionChange, onCaptionSave, onDeleteReaction }: ImageRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canExpand = !isSelectMode;

  return (
    <div
      className={`flex gap-2.5 p-2 border transition-colors ${isSelected ? 'border-tui-fg bg-tui-accent/25' : 'border-tui-line bg-tui-panel'}`}
      onClick={isSelectMode ? onToggleSelect : undefined}
      style={isSelectMode ? { cursor: 'pointer' } : undefined}
    >
      {/* Select checkbox */}
      {isSelectMode && (
        <div className="flex items-center shrink-0 font-bold" aria-hidden>
          {isSelected ? '[x]' : '[ ]'}
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
              ? 'w-full max-h-72 object-contain cursor-zoom-out bg-tui-fg'
              : `${THUMB} object-cover shrink-0 border border-tui-line ${canExpand ? 'cursor-zoom-in' : ''}`
          }
        />

        {/* Controls */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0" onClick={(e) => { if (isSelectMode) e.stopPropagation(); }}>
        {/* Caption — fills whatever height the thumbnail leaves; saved only by Update */}
        <textarea
          className={`${field} flex-1 min-h-8 resize-none w-full ${edited ? 'border-tui-accent bg-tui-accent/10' : ''}`}
          placeholder="Add caption…"
          maxLength={MAX_CAPTION_LENGTH}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
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
            <ConfirmDeleteButtons onCancel={() => setConfirmDelete(false)} onConfirm={onDelete} />
          ) : (<>
            <button
              onClick={onCaptionSave}
              disabled={!edited}
              className={edited ? cellAccent : cell}
              title="Save this caption"
            >
              Update
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className={`${cellDanger} px-1.5`}
              title="Delete photo"
              aria-label="Delete photo"
            >
              <TrashIcon />
            </button>
          </>)}
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── SkeletonImageRow ─────────────────────────────────────────────────────────

function SkeletonImageRow({ name }: { name: string }) {
  return (
    <div className="flex gap-2.5 border border-tui-line p-2">
      <div className={`${THUMB} shrink-0 bg-tui-raised animate-pulse`} />
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 justify-center">
        <span className="text-xs text-tui-dim truncate">{name}</span>
        <div className="h-6 bg-tui-raised animate-pulse w-3/4" />
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

const tabIdle = `${cell} shrink-0`;
const tabActive = `${cellOn} shrink-0`;

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
            className={`${field} w-32 h-6 py-0`}
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
            className={`${cellAccent} shrink-0`}
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={`${tabIdle} px-1.5`}
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
    <div className="flex items-center gap-2 bg-tui-bg border border-tui-line px-2 py-1">
      <input
        className="flex-1 min-w-0 bg-transparent text-xs outline-none border border-transparent focus:border-tui-accent focus:bg-tui-panel px-1 py-0.5 -mx-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setName(collection.name); e.currentTarget.blur(); } }}
        title="Rename collection"
        aria-label="Collection name"
      />
      {confirm ? (
        <>
          <span className="text-tui-dim shrink-0">Photos become uncollected</span>
          <ConfirmDeleteButtons onCancel={() => setConfirm(false)} onConfirm={onDelete} />
        </>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className={`${cellDanger} px-1.5 shrink-0`}
          title="Delete collection"
          aria-label="Delete collection"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

// ─── BulkDeleteBar ────────────────────────────────────────────────────────────

function BulkDeleteBar({ count, onDelete }: { count: number; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="sticky bottom-0 flex items-center justify-end gap-2 bg-tui-panel border border-tui-danger px-2 py-1.5">
      <span className="text-tui-danger font-bold flex-1">{count} selected</span>
      {confirm ? (
        <ConfirmDeleteButtons onCancel={() => setConfirm(false)} onConfirm={onDelete} label={`Delete ${countLabel(count, 'photo')}`} />
      ) : (
        <button onClick={() => setConfirm(true)} className={cellDangerSolid}>
          Delete
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
  /** Photos and collections are still loading: show neither, so nothing is
   *  edited or uploaded against a list that's about to be replaced. */
  loading: boolean;
  token: string;
  onPinUpdated: (pin: Pin) => void;
  onPinDeleted: (pinId: string) => void;
  onImagesChange: Updater<Image[]>;
  onCollectionsChange: Updater<Collection[]>;
  freezeWhile: FreezeWhile;
}

export default function PinEditor({ pin, images, collections, loading, token, onPinUpdated, onPinDeleted, onImagesChange, onCollectionsChange, freezeWhile }: Props) {
  const [label, setLabel] = useState(pin.label);
  const [confirmDeletePin, setConfirmDeletePin] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<FileStatus[]>([]);

  // Active collection tab. Stored as an id so it survives renames; if the
  // collection is deleted the derived value falls back to Uncollected.
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const activeCollection = activeTab ? collections.find((c) => c.id === activeTab) ?? null : null;
  const activeId = activeCollection?.id ?? null;

  // Unsaved caption edits by image id. A caption only reaches the API from an
  // Update button, so these survive tab switches until saved.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const captionOf = (img: Image) => drafts[img.id] ?? img.caption ?? '';
  const isEdited = (img: Image) => img.id in drafts && (drafts[img.id].trim() || null) !== img.caption;
  const editedIds = images.filter(isEdited).map((img) => img.id);

  // Multi-select: picking photos to move to another tab, or to delete.
  const [selectMode, setSelectMode] = useState<'move' | 'delete' | null>(null);
  const isSelectMode = selectMode !== null;
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
    setSelectMode(null);
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
      onImagesChange((prev) => withoutReaction(prev, imageId, reactionId));
    } else {
      toast.error('Failed to remove reaction');
    }
  }

  function deleteImage(imageId: string) {
    return freezeWhile(async () => {
      const res = await adminFetch(`/api/images/${imageId}`, token, 'DELETE');
      if (res.ok) {
        onImagesChange((prev) => prev.filter((img) => img.id !== imageId));
      } else {
        toast.error('Failed to delete photo');
      }
    });
  }

  function saveCaptions(ids: string[]) {
    return freezeWhile(async (setStatus) => {
      if (ids.length > 1) setStatus(`Updating ${countLabel(ids.length, 'caption')}…`);
      const res = await adminFetch('/api/images', token, 'PATCH', {
        captions: ids.map((id) => ({ id, caption: drafts[id] })),
      });
      if (!res.ok) {
        toast.error(ids.length > 1 ? 'Failed to update captions' : 'Failed to update caption');
        return;
      }
      const { images: saved, failed }: { images: Image[]; failed: string[] } = await res.json();
      const captions = new Map(saved.map((img) => [img.id, img.caption]));
      onImagesChange((prev) => prev.map((img) => captions.has(img.id) ? { ...img, caption: captions.get(img.id) ?? null } : img));
      setDrafts((prev) => {
        const next = { ...prev };
        for (const id of captions.keys()) delete next[id];
        return next;
      });
      if (failed.length > 0) toast.error(`Failed to update ${countLabel(failed.length, 'caption')}`);
      else if (ids.length > 1) toast.success(`${countLabel(saved.length, 'caption')} updated`);
    });
  }

  function deleteImages(ids: string[]) {
    return freezeWhile(async (setStatus) => {
      setStatus(`Deleting ${countLabel(ids.length, 'photo')}…`);
      const res = await adminFetch('/api/images', token, 'DELETE', { ids });
      if (!res.ok) {
        toast.error('Failed to delete photos');
        return;
      }
      const { deleted }: { deleted: string[] } = await res.json();
      const gone = new Set(deleted);
      onImagesChange((prev) => prev.filter((img) => !gone.has(img.id)));
      setSelectedImageIds(new Set());
      setSelectMode(null);
      toast.success(`${countLabel(deleted.length, 'photo')} deleted`);
    });
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

  function changeSelectMode(mode: 'move' | 'delete' | null) {
    setSelectMode(mode);
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
      toast.error(`Failed to move ${countLabel(failed.length, 'photo')}`);
    }

    const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.id));
    onImagesChange((prev) =>
      prev.map((img) => succeededIds.has(img.id) ? { ...img, collection_id: targetId } : img)
    );

    setSelectedImageIds(new Set());
    setSelectMode(null);
  }

  const activeName = activeCollection?.name ?? 'Uncollected';

  return (
    <div className="flex flex-col gap-4 py-1">
      {/* Label */}
      <div className="flex flex-col gap-1.5">
        <label className={sectionLabel}>Label</label>
        <input
          className={`${field} text-sm py-2`}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </div>

      {loading ? (
        <p className={placeholderBox}>
          Loading photos…
        </p>
      ) : (<>
      {/* Collections as tabs */}
      <div className="flex flex-col gap-2">
        <p className={sectionLabel}>Collections</p>
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
          <p className={`${sectionLabel} flex-1`}>
            {countLabel(visibleImages.length, 'photo')}
          </p>
          {isSelectMode && visibleImages.length > 1 && selectedImageIds.size < visibleImages.length && (
            <button onClick={selectAllVisible} className={cell}>
              Select all
            </button>
          )}
          {isSelectMode ? (
            <button onClick={() => changeSelectMode(null)} className={cellOn}>
              Cancel
            </button>
          ) : visibleImages.length > 0 && (<>
            {bulkTargets.length > 0 && (
              <button onClick={() => changeSelectMode('move')} className={cell}>
                Select
              </button>
            )}
            <button
              onClick={() => changeSelectMode('delete')}
              className={cellDanger}
              title="Pick photos to delete"
            >
              Delete…
            </button>
          </>)}
        </div>

        {editedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-tui-accent/15 border border-tui-accent px-2 py-1.5">
            <span className="text-tui-accent-text font-bold flex-1">
              {countLabel(editedIds.length, 'caption')} not saved
            </span>
            <button onClick={() => saveCaptions(editedIds)} className={cellAccent}>
              Update all captions
            </button>
          </div>
        )}

        {visibleImages.length === 0 && visibleQueue.length === 0 && (
          <p className={placeholderBox}>
            No photos in {activeName}
          </p>
        )}

        {visibleImages.map((img) => (
          <ImageRow
            key={img.id}
            image={img}
            caption={captionOf(img)}
            edited={isEdited(img)}
            isSelectMode={isSelectMode}
            isSelected={selectedImageIds.has(img.id)}
            onToggleSelect={() => toggleImageSelected(img.id)}
            onDelete={() => deleteImage(img.id)}
            onCaptionChange={(caption) => setDrafts((prev) => ({ ...prev, [img.id]: caption }))}
            onCaptionSave={() => saveCaptions([img.id])}
            onDeleteReaction={(reactionId) => deleteReaction(img.id, reactionId)}
          />
        ))}
        {visibleQueue.map((f) => (
          <SkeletonImageRow key={f.id} name={f.name} />
        ))}

        {selectMode === 'delete' && selectedImageIds.size > 0 && (
          <BulkDeleteBar count={selectedImageIds.size} onDelete={() => deleteImages([...selectedImageIds])} />
        )}

        {/* Bulk move bar */}
        {selectMode === 'move' && selectedImageIds.size > 0 && (
          <div className="sticky bottom-0 flex items-center gap-2 bg-tui-panel border border-tui-fg px-2 py-1.5">
            <span className="font-bold shrink-0">
              {selectedImageIds.size} selected
            </span>
            <span className="text-tui-dim shrink-0">→</span>
            <select
              className={`${field} flex-1 min-w-0 h-6 py-0`}
              value={effectiveBulkTarget}
              onChange={(e) => setBulkTargetId(e.target.value)}
            >
              {bulkTargets.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <button onClick={applyBulkMove} className={`${cellAccent} shrink-0`}>
              Move
            </button>
          </div>
        )}
      </div>

      {/* Upload */}
      <div className="flex flex-col gap-1.5">
        <p className={sectionLabel}>
          Add photos to <span className="text-tui-fg normal-case tracking-normal">{activeName}</span>
        </p>
        <ImageUploader
          pinId={pin.id}
          collectionId={activeId}
          token={token}
          setQueue={setUploadQueue}
          freezeWhile={freezeWhile}
          onUpload={(img) => onImagesChange((prev) => [...prev, img])}
        />
      </div>
      </>)}

      {/* Delete pin */}
      <div className="pt-3 border-t border-tui-line">
        {confirmDeletePin ? (
          <div className="flex items-center gap-3">
            <span className="text-tui-dim flex-1">Delete pin and all photos?</span>
            <ConfirmDeleteButtons onCancel={() => setConfirmDeletePin(false)} onConfirm={deletePin} />
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeletePin(true)}
            className={cellDanger}
          >
            Delete pin
          </button>
        )}
      </div>
    </div>
  );
}
