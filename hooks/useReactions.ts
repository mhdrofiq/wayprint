'use client';

import { useState } from 'react';
import type { Image, Reaction } from '@/types';
import { loadOwnedIds, saveOwnedIds } from '@/lib/owned-reactions';

export function useReactions(
  onImagesChange: (updater: Image[] | ((prev: Image[]) => Image[])) => void,
) {
  const [ownedReactionIds, setOwnedReactionIds] = useState<Set<string>>(() => loadOwnedIds());

  async function handleReact(imageId: string, emoji: string, reactorName: string) {
    const res = await fetch(`/api/images/${imageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, reactor_name: reactorName }),
    });
    if (res.ok) {
      const reaction: Reaction = await res.json();
      onImagesChange((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, reactions: [...(img.reactions ?? []), reaction] } : img,
        ),
      );
      setOwnedReactionIds((prev) => {
        const next = new Set(prev);
        next.add(reaction.id);
        saveOwnedIds(next);
        return next;
      });
    }
  }

  async function handleRemoveReaction(imageId: string, reactionId: string) {
    const res = await fetch(`/api/reactions/${reactionId}`, { method: 'DELETE' });
    if (res.ok) {
      onImagesChange((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, reactions: (img.reactions ?? []).filter((r) => r.id !== reactionId) }
            : img,
        ),
      );
      setOwnedReactionIds((prev) => {
        const next = new Set(prev);
        next.delete(reactionId);
        saveOwnedIds(next);
        return next;
      });
    }
  }

  return { ownedReactionIds, handleReact, handleRemoveReaction };
}
