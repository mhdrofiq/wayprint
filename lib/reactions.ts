import type { Image } from '@/types';

/** Most reactions a single photo can hold (enforced by the API, mirrored in the UI). */
export const REACTION_CAP = 15;

/** Header carrying the reacting browser's secret key (see getReactorKey). */
export const REACTOR_KEY_HEADER = 'X-Reactor-Key';

/** Public reaction columns. Leaves out owner_key_hash. */
export const REACTION_COLUMNS = 'id, image_id, emoji, pos_x, pos_y, rotation, reactor_name, created_at';

/** Returns `images` with one reaction removed from one image. */
export function withoutReaction(images: Image[], imageId: string, reactionId: string): Image[] {
  return images.map((img) =>
    img.id === imageId
      ? { ...img, reactions: (img.reactions ?? []).filter((r) => r.id !== reactionId) }
      : img,
  );
}
