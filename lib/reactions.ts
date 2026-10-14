import type { Image } from '@/types';

/** Most reactions a single photo can hold (enforced by the API, mirrored in the UI). */
export const REACTION_CAP = 15;

/** Returns `images` with one reaction removed from one image. */
export function withoutReaction(images: Image[], imageId: string, reactionId: string): Image[] {
  return images.map((img) =>
    img.id === imageId
      ? { ...img, reactions: (img.reactions ?? []).filter((r) => r.id !== reactionId) }
      : img,
  );
}
