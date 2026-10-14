'use client';

import { useState } from 'react';
import type { Image, Reaction, Updater } from '@/types';
import { getReactorKey, loadOwnedIds, saveOwnedIds } from '@/lib/owned-reactions';
import { REACTOR_KEY_HEADER, withoutReaction } from '@/lib/reactions';

export function useReactions(onImagesChange: Updater<Image[]>) {
  const [ownedReactionIds, setOwnedReactionIds] = useState<Set<string>>(() => loadOwnedIds());

  // Ids of reactions this browser added, persisted so viewers can remove their own.
  function updateOwnedIds(change: (ids: Set<string>) => void) {
    setOwnedReactionIds((prev) => {
      const next = new Set(prev);
      change(next);
      saveOwnedIds(next);
      return next;
    });
  }

  async function handleReact(imageId: string, emoji: string, reactorName: string) {
    const res = await fetch(`/api/images/${imageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, reactor_name: reactorName, reactor_key: getReactorKey() }),
    });
    if (res.ok) {
      const reaction: Reaction = await res.json();
      onImagesChange((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, reactions: [...(img.reactions ?? []), reaction] } : img,
        ),
      );
      updateOwnedIds((ids) => ids.add(reaction.id));
    }
  }

  async function handleRemoveReaction(imageId: string, reactionId: string) {
    const res = await fetch(`/api/reactions/${reactionId}`, {
      method: 'DELETE',
      headers: { [REACTOR_KEY_HEADER]: getReactorKey() },
    });
    if (res.ok) {
      onImagesChange((prev) => withoutReaction(prev, imageId, reactionId));
      updateOwnedIds((ids) => ids.delete(reactionId));
    }
  }

  return { ownedReactionIds, handleReact, handleRemoveReaction };
}
